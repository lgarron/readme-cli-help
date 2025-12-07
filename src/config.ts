import { Path } from "path-class";
import { processFile, type RuntimeOptions } from "./processFile";

export enum OnMismatchDuringCheck {
  Error = "error",
  Warn = "warn",
  Ignore = "ignore",
}
export const ON_MISMATCH_DURING_CHECK_DEFAULT = OnMismatchDuringCheck.Error;

export interface BlockConfig {
  command: [string];
  fence: string;
  allowExitCode?: number;
  onMismatchDuringCheck?: OnMismatchDuringCheck;
}

export interface FileConfig {
  blocks: BlockConfig[];
}

export type RepoConfig = {
  files: Record<string /* README path */, FileConfig>;
};

const { cwd } = Path;

function checkForDupes(repoConfig: RepoConfig) {
  const resolvedPaths = Object.keys(repoConfig).map(
    (unresolvedPath) => Path.resolve(unresolvedPath, cwd).path,
  );

  if (new Set(resolvedPaths).size !== resolvedPaths.length) {
    throw new Error(
      "[readme-cli-help] Multiple paths in the config resolve to the same path.",
    );
  }
}

type RuntimeOptionsWithoutCwd = Omit<RuntimeOptions, "cwd">;

export async function processConfig(
  config: RepoConfig,
  runtimeOptions: RuntimeOptionsWithoutCwd,
) {
  // Run a duplicate path check before we (potentially) perform any modifications on files.
  checkForDupes(config);

  for (const [unresolvedPathString, pathConfig] of Object.entries(
    config.files,
  )) {
    processFile(unresolvedPathString, pathConfig, { cwd, ...runtimeOptions });
  }
}

export async function processConfigFromPath(
  path: Path,
  runtimeOptions: RuntimeOptionsWithoutCwd,
) {
  const config: RepoConfig = await path.readJSON();
  await processConfig(config, runtimeOptions);
  return;
}
