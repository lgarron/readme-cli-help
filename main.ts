#!/usr/bin/env bun

import { file, write } from "bun";

import { exec } from "node:child_process";
import { exit } from "node:process";
import { parseArgs } from "node:util";

const DEFAULT_README_PATH = "./README.md";
const DEFAULT_FENCE = "cli-help";

const {
  values: {
    "readme-path": readmePath,
    help,
    fence,
    "expect-exit-code": expectedExitCodeString,
  },
  positionals,
} = parseArgs({
  options: {
    "readme-path": {
      type: "string",
      default: DEFAULT_README_PATH,
    },
    fence: {
      // https://spec.commonmark.org/0.31.2/#info-string
      type: "string",
      default: DEFAULT_FENCE,
    },
    "expect-exit-code": {
      // Note: an exit code code of 0 is treated as a success even if this flag is passed.
      type: "string",
    },
    help: {
      type: "boolean",
    },
  },
  allowPositionals: true,
});

// biome-ignore lint/style/noInferrableTypes: Explicit is better than implicit.
function printUsageAndExit(exitCode: number = 1) {
  console.log(
    `Usage: readme-cli-help [--help] [--fence FENCE] [--readme-path PATH] [--expect-exit-code ERROR_CODE] "./my/command --help"`,
  );
  exit(exitCode);
}

if (help) {
  printUsageAndExit(0);
}
if (positionals.length !== 1) {
  printUsageAndExit();
}

const expectedExitCode = expectedExitCodeString
  ? Number.parseInt(expectedExitCodeString)
  : 0;

const [helpCommand] = positionals;
const input = await file(readmePath).text();

// biome-ignore lint/style/useEnumInitializers: These are internal and should not be hardcoded.
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
            if (error.code === expectedExitCode) {
              console.info(
                `Observed expected error code (${expectedExitCode}). Accepting this as a success.`,
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

await write(readmePath, outputLineGroups.join("\n"));
