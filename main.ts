#!/usr/bin/env -S bun run --

import { exec } from "node:child_process";
import { exit } from "node:process";
import { object } from "@optique/core/constructs";
import { map, optional, withDefault } from "@optique/core/parser";
import { argument, flag, option } from "@optique/core/primitives";
import { integer, string } from "@optique/core/valueparser";
import { run } from "@optique/run";
import { path } from "@optique/run/valueparser";
import { Path } from "path-class";

const DEFAULT_README_PATH = new Path("./README.md");
const DEFAULT_FENCE = "cli-help";

const parser = object({
  readmePath: withDefault(
    map(
      option(
        "--readme-path",
        path({ metavar: "OUTPUT", mustExist: true, type: "file" }),
      ),
      (t) => new Path(t),
    ),
    DEFAULT_README_PATH,
  ),
  fence: withDefault(option("--fence", string({})), DEFAULT_FENCE),
  allowExitCode: optional(option("--allow-exit-code", integer({}))),
  checkOnly: optional(flag("--check-only")),
  helpCommand: argument(string({ metavar: "HELP_COMMAND" })),
});

import { version } from "./package.json" with { type: "json" };

const { readmePath, fence, allowExitCode, checkOnly, helpCommand } = run(
  parser,
  {
    programName: "readme-cli-help",
    help: "option",
    completion: "option",
    version,
  },
);

const input = await new Path(readmePath).readText();

enum State {
  BeforeCLICodeFence,
  InsideCLICodeFence,
  AfterCLICodeFence,
}

let state: State = State.BeforeCLICodeFence;

// biome-ignore lint/style/useTemplate: Template syntax would require escaping each backtick, which is not as clear.
const fenceLine = "````" + fence;

let outputLineGroups: string[] = [];
for (const line of input.split("\n")) {
  if (state === State.InsideCLICodeFence) {
    if (line !== "````") {
      continue;
    }

    // Ironically, we can't use `Bun.spawn`, because it's *too* safe about separating the command and individual arguments.
    // const helpText = (await new Response(Bun.spawn([helpCommand]).stdout).text()).trim();

    const helpText = (
      (await new Promise((resolve, reject) => {
        exec(helpCommand, (error, stdout, _stderr) => {
          if (error) {
            if (error.code === allowExitCode) {
              console.info(
                `Observed allowed exit code (${allowExitCode}). Accepting this as a success.`,
              );
              resolve(stdout);
            } else {
              reject(error);
              return;
            }
          }
          resolve(stdout);
        });
      })) as string
    ).trim();
    const helpTextLines = helpText.split("\n");
    for (const line of helpTextLines) {
      if (line.startsWith("````")) {
        throw new Error(
          `Lines in the help text that look like code fences are not supported. Relevant line: ${line}`,
        );
      }
    }
    outputLineGroups = outputLineGroups.concat(helpTextLines);
    state = State.AfterCLICodeFence; // Set state for future lines.
  }

  if (line === fenceLine) {
    switch (state) {
      case State.BeforeCLICodeFence:
        state = State.InsideCLICodeFence;
        break;
      default:
        throw new Error("Double `cli-help` code fence?");
    }
  }

  outputLineGroups.push(line);
}

switch (state) {
  case State.BeforeCLICodeFence:
    throw new Error("Did not see the start of a `cli-help` code fence!");
  case State.InsideCLICodeFence:
    throw new Error("A `cli-help` code fence was started but not endeed!");
  case State.AfterCLICodeFence:
    // OK
    break;
  default:
    throw new Error("Invalid state‽");
}

const output = outputLineGroups.join("\n");
if (checkOnly) {
  if (input !== output) {
    console.error("README CLI help differs from help command output!");
    exit(1);
  } else {
    console.info("README CLI help matches the help command output.");
    exit(0);
  }
} else {
  await readmePath.write(output);
}
