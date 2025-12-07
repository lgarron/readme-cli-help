import assert from "node:assert";
import { exit } from "node:process";
import { Readable } from "node:stream";
import { styleText } from "node:util";
import { Path } from "path-class";
import { Plural } from "plural-chain";
import { PrintableShellCommand } from "printable-shell-command";
import {
  ON_MISMATCH_DURING_CHECK_DEFAULT,
  OnMismatchDuringCheck,
} from "./config";
import type { CodeFenceConfig, FileConfig } from "./RepoConfig";

export interface RuntimeOptions {
  cwd: Path;
  checkOnly?: boolean;
}

enum State {
  BeforeCLICodeFence,
  InsideCLICodeFence,
  AfterCLICodeFence,
}

function blue(text: string): string {
  return styleText(["bold", "blue"], text);
}

export async function processFile(
  unresolvedPathString: string,
  fileConfig: FileConfig,
  runtimeOptions: RuntimeOptions,
) {
  const readmePath = Path.resolve(unresolvedPathString, runtimeOptions.cwd);
  const input = await readmePath.readText();

  let state:
    | {
        current: State.BeforeCLICodeFence | State.AfterCLICodeFence;
      }
    | {
        current: State.InsideCLICodeFence;
        blockConfig: CodeFenceConfig;
        oldContentLines: string[];
      } = { current: State.BeforeCLICodeFence };

  const infoStringToCodeFenceConfigInfo = new Map<
    string,
    { seen: boolean; updated: boolean; blockConfig: CodeFenceConfig }
  >();
  for (const blockConfig of fileConfig.codeFences) {
    // biome-ignore lint/style/useTemplate: Template syntax would require escaping each backtick, which is not as clear.
    const fenceLine = "````" + blockConfig.infoString;
    if (infoStringToCodeFenceConfigInfo.has(fenceLine)) {
      throw new Error("Duplicate fence line???");
    }
    infoStringToCodeFenceConfigInfo.set(fenceLine, {
      seen: false,
      updated: false,
      blockConfig,
    });
  }

  let outputLineGroups: string[] = [];
  for (const line of input.split("\n")) {
    if (state.current === State.InsideCLICodeFence) {
      if (line !== "````") {
        state.oldContentLines.push(line);
        continue;
      }

      const logPrefix = `[${blue(unresolvedPathString)}][${blue(state.blockConfig.infoString)}]`;

      if (!Array.isArray(state.blockConfig.command)) {
        // TODO: validate the JSON.
        throw new Error(`${logPrefix} Command is not an array of strings.`);
      }
      const [command, ...args] = state.blockConfig.command;
      const subprocess = new PrintableShellCommand(command, args).spawn();
      const responseText = new Response(
        Readable.toWeb(subprocess.stdout),
      ).text();

      try {
        await subprocess.success;
      } catch (e) {
        // `subprocess.exitCode` could be `null`, but that doesn't require special handling.
        if (subprocess.exitCode === state.blockConfig.allowExitCode) {
          console.info(
            `${logPrefix} Observed allowed exit code (${state.blockConfig.allowExitCode}). Accepting this as a success.`,
          );
        } else {
          throw e;
        }
      }
      const helpText = (await responseText).trim();
      const helpTextLines = helpText.split("\n");
      for (const line of helpTextLines) {
        if (line.startsWith("````")) {
          throw new Error(
            `${logPrefix} Lines in the help text that look like code fences are not supported. Relevant line: ${line}`,
          );
        }
      }
      // TODO: check output for invalid contents (e.g. code fences)?
      outputLineGroups = outputLineGroups.concat(helpTextLines);

      if (
        // TODO: is there an ergonomic way to compare arrays without a library?
        state.oldContentLines.join("\n") !== helpTextLines.join("\n")
      ) {
        // biome-ignore lint/style/noNonNullAssertion: TODO: how do we refactor to avoid this non-null assertion?
        infoStringToCodeFenceConfigInfo.get(line)!.updated = true;
        if (runtimeOptions.checkOnly) {
          switch (
            state.blockConfig.onMismatchDuringCheck ??
            ON_MISMATCH_DURING_CHECK_DEFAULT
          ) {
            // biome-ignore lint/suspicious/noFallthroughSwitchClause: False positive: https://github.com/biomejs/biome/issues/3235 / https://github.com/biomejs/website/issues/49
            case OnMismatchDuringCheck.Error: {
              console.error(
                `${logPrefix} README CLI help differs from help command output!`,
              );
              exit(1);
            }
            case OnMismatchDuringCheck.Warn: {
              console.warn(
                `${logPrefix} README CLI help differs from help command output, but marked as ignored.`,
              );
              break;
            }
            case OnMismatchDuringCheck.Ignore: {
              break;
            }
            default: {
              throw new Error("Internal error.") as never;
            }
          }
        }
      }

      state = { current: State.AfterCLICodeFence }; // Set state for future lines.
    }

    const info = infoStringToCodeFenceConfigInfo.get(line);
    if (info) {
      if (info.seen) {
        throw new Error(
          `[${blue(unresolvedPathString)}] Code fence appears more than once.`,
        );
      }
      info.seen = true;
      state = {
        current: State.InsideCLICodeFence,
        blockConfig: info.blockConfig,
        oldContentLines: [],
      };
    }

    outputLineGroups.push(line);
  }

  switch (state.current) {
    case State.BeforeCLICodeFence:
      throw new Error(
        `[${blue(unresolvedPathString)}] Did not see the start of a code fence!`,
      );
    case State.InsideCLICodeFence:
      throw new Error(
        `[${blue(unresolvedPathString)}][${blue(state.blockConfig.infoString)}] A code fence was started but not endeed!`,
      );
    case State.AfterCLICodeFence:
      // OK
      break;
    default:
      throw new Error("Invalid state‽");
  }

  for (const knownBlocks of infoStringToCodeFenceConfigInfo.values()) {
    if (!knownBlocks.seen) {
      throw new Error(
        `Code block was not seen: ${knownBlocks.blockConfig.infoString}`,
      );
    }
  }

  const output = outputLineGroups.join("\n");
  if (runtimeOptions?.checkOnly) {
    console.info(
      `[${blue(unresolvedPathString)}] README CLI help matches the help command output (${Plural.num.s(fileConfig.codeFences)`blocks`}).`,
    );
  } else {
    await readmePath.write(output);
    // TODO: why can't we `.map(…)` over a `MapIterator`?
    const numUpdated = Array.from(infoStringToCodeFenceConfigInfo.values())
      .map((v) => (v.updated ? 1 : 0) as number)
      .reduce((a, b) => a + b);
    assert.equal(
      fileConfig.codeFences.length,
      infoStringToCodeFenceConfigInfo.size,
    );
    const numLeftUpToDate = fileConfig.codeFences.length - numUpdated;
    console.info(
      `[${blue(unresolvedPathString)}] Out of ${Plural.num.s(fileConfig.codeFences)`code blocks`}: ${Plural.num.was_were({ numLeftUpToDate })} up to date, and ${Plural.num.was_were({ numUpdated })} updated.`,
    );
  }
}
