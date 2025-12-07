import { exit } from "node:process";
import { Readable } from "node:stream";
import { Path } from "path-class";
import { Plural } from "plural-chain";
import { PrintableShellCommand } from "printable-shell-command";
import {
  type BlockConfig,
  type FileConfig,
  ON_MISMATCH_DURING_CHECK_DEFAULT,
  OnMismatchDuringCheck,
} from "./config";

export interface RuntimeOptions {
  cwd: Path;
  checkOnly?: boolean;
}

enum State {
  BeforeCLICodeFence,
  InsideCLICodeFence,
  AfterCLICodeFence,
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
        blockConfig: BlockConfig;
        oldContentLines: string[];
      } = { current: State.BeforeCLICodeFence };

  const fenceLineToBlockConfigInfo = new Map<
    string,
    { seen: boolean; blockConfig: BlockConfig }
  >();
  for (const blockConfig of fileConfig.blocks) {
    // biome-ignore lint/style/useTemplate: Template syntax would require escaping each backtick, which is not as clear.
    const fenceLine = "````" + blockConfig.fence;
    if (fenceLineToBlockConfigInfo.has(fenceLine)) {
      throw new Error("Duplicate fence line???");
    }
    fenceLineToBlockConfigInfo.set(fenceLine, { seen: false, blockConfig });
  }

  let outputLineGroups: string[] = [];
  for (const line of input.split("\n")) {
    if (state.current === State.InsideCLICodeFence) {
      if (line !== "````") {
        state.oldContentLines.push(line);
        continue;
      }

      if (!Array.isArray(state.blockConfig.command)) {
        // TODO: validate the JSON.
        throw new Error(
          `[${unresolvedPathString}][${state.blockConfig.fence}] Command is not an array of strings.`,
        );
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
            `[${unresolvedPathString}][${state.blockConfig.fence}] Observed allowed exit code (${state.blockConfig.allowExitCode}). Accepting this as a success.`,
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
            `[${unresolvedPathString}][${state.blockConfig.fence}] Lines in the help text that look like code fences are not supported. Relevant line: ${line}`,
          );
        }
      }
      outputLineGroups = outputLineGroups.concat(helpTextLines);

      if (
        runtimeOptions.checkOnly &&
        // TODO: is there an ergonomic way to compare arrays without a library?
        state.oldContentLines.join("\n") !== helpTextLines.join("\n")
      ) {
        switch (
          state.blockConfig.onMismatchDuringCheck ??
          ON_MISMATCH_DURING_CHECK_DEFAULT
        ) {
          // biome-ignore lint/suspicious/noFallthroughSwitchClause: False positive: https://github.com/biomejs/biome/issues/3235 / https://github.com/biomejs/website/issues/49
          case OnMismatchDuringCheck.Error: {
            console.error(
              `[${unresolvedPathString}][${state.blockConfig.fence}] README CLI help differs from help command output!`,
            );
            exit(1);
          }
          case OnMismatchDuringCheck.Warn: {
            console.warn(
              `[${unresolvedPathString}][${state.blockConfig.fence}] README CLI help differs from help command output, but marked as ignored.`,
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

      state = { current: State.AfterCLICodeFence }; // Set state for future lines.
    }

    const info = fenceLineToBlockConfigInfo.get(line);
    if (info) {
      if (info.seen) {
        throw new Error(
          `[${unresolvedPathString}][${info.blockConfig.fence}] Code fence appears more than once.`,
        );
      }
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
        `[${unresolvedPathString}] Did not see the start of a code fence!`,
      );
    case State.InsideCLICodeFence:
      throw new Error(
        `[${unresolvedPathString}][${state.blockConfig.fence}] A code fence was started but not endeed!`,
      );
    case State.AfterCLICodeFence:
      // OK
      break;
    default:
      throw new Error("Invalid state‽");
  }

  const output = outputLineGroups.join("\n");
  if (runtimeOptions?.checkOnly) {
    console.info(
      `[${unresolvedPathString}] README CLI help matches the help command output (${Plural.num.s(fileConfig.blocks)`blocks`}).`,
    );
  } else {
    await readmePath.write(output);
  }
}
