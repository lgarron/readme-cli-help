# `readme-cli-help`

Maintain the output of a help command in your `README` file.

## Usage

1. Include the following in your `README.md` file:

<!-- This example uses HTML entities to avoid being detected as an actual `cli-help` code block. -->
<pre>
&#96;&#96;&#96;&#96;cli-help
This text will be replaced by the output of the help command.
&#96;&#96;&#96;&#96;
</pre>

(Note that this block uses four ticks rather than three.)

2. Add the following command to your project (e.g. to your `Makefile` or `package.json`):

```shell
bun x readme-cli-help "./my-command --help"`
```

3. (Optional) Add the following command to your CI to require the README to be kept in sync with the help command:

```shell
bun x readme-cli-help --check-only "./my-command --help"`
```

## Example

The following is a block itself generated using `readme-cli-help`:

````cli-help
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
