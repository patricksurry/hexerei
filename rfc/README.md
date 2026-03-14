# HexMap RFC & Schema

The normative specification and JSON Schema for the HexMap format.

## Directory Structure

```
rfc/
├── hexmap.schema.json          # Normative JSON Schema (HexMap 1.0)
├── Makefile                    # Build RFC outputs + run schema tests
├── src/
│   ├── rfc.md                  # Master document (includes all sections)
│   ├── 00-front-matter.md …    # Modular RFC sections
│   ├── appendix-*.md           # Appendices
│   └── snippets/*.yaml         # Includable YAML examples
├── build/                      # Generated outputs (HTML, TXT, XML)
├── tests/
│   ├── valid/                  # Must-pass schema samples
│   └── invalid/                # Must-fail schema samples
└── docs/plans/                 # Design docs and implementation plans
```

## Quick Start

Prerequisites: `mmark`, `xml2rfc` (via uv), `ajv-cli` + `ajv-formats` (via npm).

```bash
cd rfc
uv sync                 # install python deps
make tests              # validate schema test cases
make rfc                # build HTML/TXT/XML outputs
```

## HexMap Cheat Sheet

### Document Structure
```yaml
hexmap: "1.0"
metadata:
  title: "My Map"
  id: "my-map"
layout:
  orientation: flat-down                # flat-down|flat-up|pointy-right|pointy-left
  all: "0101 - 2201 - 2215 - 0115 fill"
terrain:
  hex:
    forest:
      name: Forest
features:
  - at: "0101 - 0303"
    terrain: forest
```

### HexPath Essentials (`at` key)
| Syntax | Meaning |
|--------|---------|
| `"0101"`, `"A5"` | Single hex coordinate |
| `"0101 0102 0103"` | Collection (space-separated) |
| `"0101 - 0505"` | Shortest path between atoms |
| `"0101 ~ 0505"` | Path with flipped bias |
| `"0101, 0505"` | Jump (new disconnected segment) |
| `"0101 - 0501 - 0505 - 0105 fill"` | Close and fill area |
| `"@all exclude 0303"` | Global ref with exclusion |
| `"0101/N"`, `"0101/SE"` | Edge addressing |
| `"0101.N"`, `"0101.NE"` | Vertex addressing |

## Schema Validation (TDD)

The JSON Schema is the normative reference. Development follows TDD:

1. Add a test case in `tests/valid/` (must pass) or `tests/invalid/` (must fail)
2. Run `make tests`
3. Update the schema until all tests pass

## Authoring the RFC

The RFC is split into modular sections under `src/`. The master document
`src/rfc.md` includes them all via mmark's `{{filename.md}}` syntax.

**Editing**: Modify individual `src/XX-name.md` files. YAML snippets live in
`src/snippets/` and are included with `<{{snippets/file.yaml}}>`.

**Building**: `make rfc` runs mmark to produce XML, then xml2rfc for text output,
plus a direct HTML render. Outputs go to `build/`.

**Syntax notes**:
- Use `##` (level 2) for main RFC sections -- mmark promotes them in the output.
- Avoid code blocks inside list items (mmark/xml2rfc is fragile here).
- Citations use `[@RefID]` syntax; references are defined in `src/14-references.md`.
