#!/usr/bin/env -S bun run --

import { message } from "@optique/core";
import { object, or } from "@optique/core/constructs";
import { map, optional } from "@optique/core/parser";
import { command, constant, option } from "@optique/core/primitives";
import { run } from "@optique/run";
import { path } from "@optique/run/valueparser";
import { Path } from "path-class";
import { version } from "../package.json" with { type: "json" };
import { processConfigFromPath } from "./processConfig";

const DEFAULT_CONFIG_PATH = new Path("./.config/readme-cli-help.json");

const configPath = optional(
  map(
    option(
      "--config-path",
      path({
        metavar: "CONFIG_PATH",
        mustExist: true,
        type: "file",
      }),
      {
        description: message`Path to a config file.`,
      },
    ),
    (t) => new Path(t),
  ),
);

const parser = or(
  command(
    "check",
    object({
      subcommand: constant("check"),
      configPath,
    }),
    { description: message`Check the contents without updating.` },
  ),
  command(
    "update",
    object({
      subcommand: constant("update"),
      configPath,
    }),
    { description: message`Update all contents.` },
  ),
);

const options = run(parser, {
  programName: "readme-cli-help",
  help: "option",
  completion: {
    mode: "option",
    name: "plural",
  },
  version,
});

processConfigFromPath(options.configPath ?? DEFAULT_CONFIG_PATH, {
  checkOnly: options.subcommand === "check",
});
