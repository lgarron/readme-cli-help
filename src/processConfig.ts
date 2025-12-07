import { Ajv } from "ajv";
import { Path } from "path-class";
import RepoConfigSchema from "../schema.json" with { type: "json" };
import { processFile, type RuntimeOptions } from "./processFile";
import type { RepoConfig } from "./RepoConfig";

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

function validateConfig(config: RepoConfig) {
  const validate = new Ajv().compile(RepoConfigSchema);
  if (!validate(config)) {
    if (validate.errors) {
      console.log(
        validate.errors
          .map((error) => {
            return `[${error.instancePath}] ${error.message}`;
          })
          .join("\n"),
      );
    }
    throw new Error("Invalid config.");
  }
}

export async function processConfig(
  config: RepoConfig,
  runtimeOptions: RuntimeOptionsWithoutCwd,
) {
  validateConfig(config);
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
