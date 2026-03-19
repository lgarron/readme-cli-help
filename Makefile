.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: check
check: lint test check-package.json

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

.PHONY: check-package.json
check-package.json: setup
	bun x --package @cubing/dev-config package.json check

.PHONY: test
test: setup
	./src/main.ts update

.PHONY: publish
publish:
	npm publish

.PHONY: prepublishOnly
prepublishOnly: clean check

RM_RF = bun -e 'process.argv.slice(1).map(p => process.getBuiltinModule("node:fs").rmSync(p, {recursive: true, force: true, maxRetries: 5}))' --

.PHONY: clean
clean:
	@ # no-op at the moment

.PHONY: reset
reset: clean
	${RM_RF} ./node_modules/
