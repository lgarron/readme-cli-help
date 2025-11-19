.PHONY: lint
lint:
	bun x @biomejs/biome check
	./main.ts --check-only "./main.ts --help"

.PHONY: format
format:
	bun x @biomejs/biome check --write
	./main.ts "./main.ts --help"

.PHONY: test
test:
	./main.ts --check-only --readme-path README.test.md --fence cli-help-test "./main.ts --help"

.PHONY: update-test-expected
update-test-expected:
	./main.ts --readme-path README.test.md --fence cli-help-test "./main.ts --help"

.PHONY: publish
publish:
	npm publish

.PHONY: prepublishOnly
prepublishOnly: lint test
