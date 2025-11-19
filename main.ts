#!/usr/bin/env bun

import { exec } from "node:child_process";
import { exit } from "node:process";
import {
  binary,
  boolean as cmdBoolean,
  number as cmdNumber,
  string as cmdString,
  command,
  flag,
  option,
  optional,
  positional,
  run,
  type Type,
} from "cmd-ts-too";
import { Path } from "path-class";

const DEFAULT_README_PATH = new Path("./README.md");
const DEFAULT_FENCE = "cli-help";

const ExistingFilePath: Type<string, Path> = {
  async from(str) {
    const path = new Path(str);
    if (!(await path.existsAsFile())) {
      throw new Error(`Path does not exist as a file: ${path}`);
    }
    return path;
  },
};

const app = command({
  name: "hevc",
  args: {
    readmePath: option({
      description: "Path to the README file.",
      type: ExistingFilePath,
      long: "readme-path",
      defaultValue: () => DEFAULT_README_PATH,
      defaultValueIsSerializable: true,
    }),
    fence: option({
      description:
        "Markdown code fence identifier (the part after the first ````).",
      // https://spec.commonmark.org/0.31.2/#info-string
      type: cmdString,
      long: "fence",
      defaultValue: () => DEFAULT_FENCE,
      defaultValueIsSerializable: true,
    }),
    allowExitCode: option({
      description:
        "Do not error if the help command returns with the specified exit code. Note: an exit code code of 0 is treated as a success even if this flag is passed.",
      type: optional(cmdNumber),
      long: "allow-exit-code",
    }),
    checkOnly: flag({
      description:
        "Check that the existing README contents match what is allowed (without modifying them).",
      type: cmdBoolean,
      long: "check-only",
    }),
    helpCommand: positional({
      type: cmdString,
      displayName: "Help command",
    }),
  },
  handler: async ({
    readmePath,
    fence,
    allowExitCode,
    checkOnly,
    helpCommand,
  }) => {
    const input = await readmePath.readText();

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
  },
});

await run(binary(app), process.argv);
