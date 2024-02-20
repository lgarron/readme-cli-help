# `readme-cli-help`

Usage:

1. Include the following in your `README.md` file:

<pre>
````cli-help
This text will be replaced by the output of the help command.
````
</pre>

2. Run `bun x readme-cli-help [help-command]` or `npx readme-cli-help [help-command]` to update your README.

3. Add the relevant command to your `Makefile` or `package.json` scripts to run more regularly.

## Example

The following is a `cli-help` block itself generated using `readme-cli-help`

````cli-help
Usage: readme-cli-help [--readme-path PATH] "./my/command --help"
````
# readme-cli-help
