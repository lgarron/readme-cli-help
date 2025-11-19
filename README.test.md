# Test

The following is a `cli-help` block itself generated using `readme-cli-help`:

````cli-help-test
hevc

OPTIONS:
  --readme-path <value>      - Path to the README file. [default: README.md]
  --fence <str>              - Markdown code fence identifier (the part after the first ````). [default: cli-help]
  --allow-exit-code <number> - Do not error if the help command returns with the specified exit code. Note: an exit code code of 0 is treated as a success even if this flag is passed. [optional]

FLAGS:
  --check-only - Check that the existing README contents match what is allowed (without modifying them).
  --help, -h   - show help

ARGUMENTS:
  <Help command> - a string
````
