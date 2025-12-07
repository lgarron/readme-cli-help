.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: lint
lint: setup check-schema
	bun x @biomejs/biome check
	./src/main.ts check
	bun x tsc --project .
	cd ./examples/json-config/ && bun run ../../src/main.ts check

.PHONY: format
format: setup
	bun x @biomejs/biome check --write
	./src/main.ts update
	cd ./examples/json-config/ && bun run ../../src/main.ts update

.PHONY: update-schema
update-schema:
	bun run ./script/schema/update.ts

.PHONY: check-schema
check-schema:
	bun run ./script/schema/check.ts

.PHONY: test
test: setup
	./src/main.ts update

.PHONY: publish
publish:
	npm publish

.PHONY: prepublishOnly
prepublishOnly: lint test

.PHONY: clean
clean:
	# no-op

.PHONY: reset
reset: clean
	rm -rf ./node_modules
