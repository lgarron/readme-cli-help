.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: lint
lint: setup
	bun x @biomejs/biome check
	./main.ts --check-only "./main.ts --help"
	bun x tsc --project .

.PHONY: format
format: setup
	bun x @biomejs/biome check --write
	./main.ts "./main.ts --help"

.PHONY: test
test: setup
	./main.ts --check-only --readme-path README.test.md --fence cli-help-test "./main.ts --help"

.PHONY: update-test-expected
update-test-expected: setup
	./main.ts --readme-path README.test.md --fence cli-help-test "./main.ts --help"

.PHONY: publish
publish:
	npm publish

.PHONY: prepublishOnly
prepublishOnly: lint test

.PHONY: reset
reset:
	rm -rf ./node_modules
