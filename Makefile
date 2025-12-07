.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: lint
lint: setup
	bun x @biomejs/biome check
	./src/main.ts check
	bun x tsc --project .

.PHONY: format
format: setup
	bun x @biomejs/biome check --write
	./src/main.ts update

.PHONY: test
test: setup
	./src/main.ts update

.PHONY: publish
publish:
	npm publish

.PHONY: prepublishOnly
prepublishOnly: lint test

.PHONY: reset
reset:
	rm -rf ./node_modules
