#!/usr/bin/env -S bun run --

import { default as assert } from "node:assert";
import { styleText } from "node:util";
import { newSchema, SCHEMA_JSON_FILE } from "./update";

assert.deepEqual(newSchema, await SCHEMA_JSON_FILE.readJSON());
console.log(
  `✅ ${styleText(["underline", "blue"], SCHEMA_JSON_FILE.path)} is up to date`,
);
