#!/usr/bin/env -S bun run --

import { Path } from "path-class";
import { PrintableShellCommand } from "printable-shell-command";
import type { RepoConfig } from "../../src/RepoConfig";

export const SCHEMA_JSON_FILE = new Path("./schema.json");

export const newSchema = (await new PrintableShellCommand("bun", [
  ["x", "typescript-json-schema"],
  "--strictNullChecks",
  "--required",
  "./src/RepoConfig.ts",
  "RepoConfig",
])
  .print({ skipLineWrapBeforeFirstArg: true })
  .stdout()
  .json()) as RepoConfig;

if (import.meta.main) {
  await SCHEMA_JSON_FILE.writeJSON(newSchema);
  await new PrintableShellCommand("bun", [
    ["x", "@biomejs/biome"],
    "check",
    "--write",
    SCHEMA_JSON_FILE,
  ]).shellOut();
}
