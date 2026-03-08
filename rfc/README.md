# HexMap RFC & Schema

This directory contains the normative specification and JSON Schema for the HexMap format.

## Overview

The HexMap format is a JSON/YAML-based specification for hexagonal grid maps, designed for wargames and digital mapping.

- **[HexMap JSON Schema](hexmap.schema.json)**: The normative definition of the format.
- **[RFC Document (Master)](master.md)**: The human-readable specification.
- **[Validation Tests](tests/samples/)**: A suite of valid and invalid samples for regression testing.

## HexMap & HexPath Cheat Sheet

### Document Structure (YAML)
```yaml
hexmap: "1.0"
metadata:
  title: "My Map"
  id: "my-map"
layout:
  hex_top: flat
  all: "0101 0505 !"
  stagger: low
terrain:
  hex:
    forest:
      name: Forest
features:
  - at: "0101 0303"
    terrain: forest
```

### HexPath Essentials (`at` key)
- **Coordinates**: `"0101"`, `"A5"`
- **Collections**: Space-separated (`"0101 0102"`)
- **Path**: Space connects atoms via shortest path (`"0101 0505"`)
- **Jump**: Comma starts new segment (`"0101, 0505"`)
- **Fill**: Exclamation closes and fills area (`"0101 0501 0505 0105 !"` -> rectangle)
- **Subtraction**: Minus operator removes items (`"0101 0505 - 0303"`)
- **Global**: `"@all"` refers to `layout.all`
- **Edges**: `"0101/N"`, `"0101/SE"`
- **Vertices**: `"0101.N"`, `"0101.NE"`

## Quick Start

```bash
cd rfc

# 1. Setup dependencies
uv sync

# 2. Run Schema Validation (TDD)
python3 run_schema_tests.py

# 3. Build RFC Document (HTML/TXT)
uv run python build.py
```

## Validation & TDD

The JSON Schema (`hexmap.schema.json`) is the normative reference for map 
structure. We use a TDD approach for schema development:

1. **Add Test Case**: Put JSON files in `tests/samples/valid/` (must pass) or `tests/samples/invalid/` (must fail).
2. **Run Runner**: `python3 run_schema_tests.py` validates all samples.
3. **Iterate**: Update the schema until all tests are green.

## Authoring the RFC

For information on how to edit the RFC sections, manage examples, or troubleshoot the build process, see **[AUTHORING.md](docs/AUTHORING.md)**.
