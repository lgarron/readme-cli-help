# `readme-cli-help`

## Usage

1. Include the following in your `README.md` file:

<!-- This example uses HTML entities to avoid being detected as an actual `cli-help` code block. -->
<pre>
&#96;&#96;&#96;&#96;cli-help
This text will be replaced by the output of the help command.
&#96;&#96;&#96;&#96;
</pre>

2. Add the following command to your project (e.g. to your `Makefile` or `package.json`):

```shell
bun x readme-cli-help "./my-command --help"`
```

# Example

The following is a block itself generated using `readme-cli-help`:

````cli-help
Usage: readme-cli-help [--help] [--fence FENCE] [--readme-path PATH] "./my/command --help"
````
