# `readme-cli-help`

## Usage

1. Include the following in your `README.md` file:

<pre>
````cli-help
This text will be replaced by the output of the help command.
````
</pre>

2. Add the following command to your project (e.g. to your `Makefile` or `package.json`):

```shell
bun x readme-cli-help "./my-command --help"`
```
