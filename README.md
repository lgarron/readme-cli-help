# `readme-cli-help`

Maintain the output of help commands and other code blocks in your `README` file.

## Usage

1. Include the following in your `README.md` file:

<!-- This example uses HTML entities to avoid being detected as an actual `readme-cli-help` code block. -->
<pre>
&#96;&#96;&#96;&#96;text help
This text will be replaced by the output of the help command.
&#96;&#96;&#96;&#96;
</pre>

(Note that this block uses four ticks rather than three.)

1. Add the following at `./.config/readme-cli-help.json`:

```json
{
  "files": {
    "./README.md": {
      "blocks": [
        {
          "fence": "text help",
          "command": ["./my-command", "--help"]
        }
      ]
    }
  }
}
```

1. Add the following to your scripts/`Makefile`/CI to require `README.md` to be kept in sync with the help command:

```shell
# Check
bun x readme-cli-help check

# Update
bun x readme-cli-help update
```

## Example

The following is a block itself generated using `readme-cli-help`:

````text help
Usage: readme-cli-help check [--config-path CONFIG_PATH]
       readme-cli-help update [--config-path CONFIG_PATH]

  check                       Check the contents without updating.
  update                      Update all contents.
````
