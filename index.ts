#!/usr/bin/env bun

import { $, file, write } from "bun";

import { exec } from "node:child_process";
import { exit } from "node:process";
import { parseArgs } from "node:util";

const DEFAULT_README_PATH = "./README.md";

const {
  values: { readmePath, help },
  positionals,
} = parseArgs({
  options: {
    readmePath: {
      type: "string",
      long: "readme-path",
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
    `Usage: readme-cli-help [--help] [--readme-path PATH] "./my/command --help"`,
  );
  exit(exitCode);
}

if (help) {
  printUsageAndExit(0);
}
if (positionals.length !== 1) {
  printUsageAndExit();
}

const [helpCommand] = positionals;
const input = await file(readmePath ?? DEFAULT_README_PATH).text();

// biome-ignore lint/style/useEnumInitializers: These are internal and should not be hardcoded.
enum State {
  BeforeCLICodeFence,
  InsideCLICodeFence,
  AfterCLICodeFence,
}

let state: State = State.BeforeCLICodeFence;

const outputLineGroups: string[] = [];
for (const line of input.split("\n")) {
  if (state === State.InsideCLICodeFence) {
    if (line !== "````") {
      continue;
    }

    // Ironically, we can't use `Bun.spawn`, because it's *too* safe about separating the command and individual arguments.
    // const helpText = (await new Response(Bun.spawn([helpCommand]).stdout).text()).trim();

    const helpText: string = await new Promise((resolve, reject) => {
      exec(helpCommand, (error, stdout, _stderr) => {
        if (error) {
          // TODO: accept status codes other than 0? Maybe when a specific flag is passed?
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });

    console.log({ helpText });

    outputLineGroups.push(helpText);
    state = State.AfterCLICodeFence; // Set state for future lines.
  }

  if (line === "````cli-help") {
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

await write("./README.md", outputLineGroups.join("\n"));
