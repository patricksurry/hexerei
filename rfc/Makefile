

# Requirements:
# - mmark (installed via Homebrew or Go)
# - xml2rfc (installed via uv/pip, for text output)
# - npm install -g ajv-cli ajv-formats

SRCS = $(shell find src -type f -name "*.md")
TGTS = build/hexmap-format-rfc.html build/hexmap-format-rfc.txt build/hexmap-format-rfc.xml

TEST_CASES = $(wildcard tests/**/*.json) $(wildcard tests/**/*.yaml)
TESTS_OK = $(TEST_CASES:%=%.ok)

.PHONY: all clean tests

all: rfc tests

rfc: $(TGTS)

tests: $(TESTS_OK)

clean:
	rm -f $(TGTS) $(TESTS_OK)


build/hexmap-format-rfc.txt: build/hexmap-format-rfc.xml
	uv run python -m xml2rfc.run --text $< -o $@

build/hexmap-format-rfc.xml: $(SRCS)
	mmark src/rfc.md > $@

build/hexmap-format-rfc.html: $(SRCS)
	mmark -html src/rfc.md > $@


tests/valid/%.ok: tests/valid/% hexmap.schema.json
	@ajv test --valid --spec draft2020 -c ajv-formats -s hexmap.schema.json -d $< > /dev/null 2>&1
	@touch $@

tests/invalid/%.ok: tests/invalid/% hexmap.schema.json
	@ajv test --invalid --spec draft2020 -c ajv-formats -s hexmap.schema.json -d $< > /dev/null 2>&1
	@touch $@
