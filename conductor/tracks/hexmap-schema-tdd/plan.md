# Implementation Plan: HexMap Schema TDD

## Phase 1: Test Framework & 'Red' State
1. **[ ] Task**: Create `conductor/tracks/hexmap-schema-tdd/tests/run_tests.py` using `jsonschema`.
2. **[ ] Task**: Create `conductor/tracks/hexmap-schema-tdd/tests/valid/minimal.json` (Smallest possible valid).
3. **[ ] Task**: Create `conductor/tracks/hexmap-schema-tdd/tests/valid/snippets.json` (Consolidated RFC snippets).
4. **[ ] Task**: Create `conductor/tracks/hexmap-schema-tdd/tests/invalid/legacy_layout.json` (Uses `hexes` and `geo` from the conflicting RFC section).
5. **[ ] Task**: Create `conductor/tracks/hexmap-schema-tdd/tests/invalid/extra_meta.json` (Tests strictness by adding unauthorized metadata).
6. **[ ] Task**: Run tests to confirm current failures (especially the `legacy_layout` if it's currently allowed).

## Phase 2: Align RFC & Schema
1. **[ ] Task**: Update `rfc/sections/11-json-schema.md` to match the data model (`all`, `georef`).
2. **[ ] Task**: Update `rfc/hexmap.schema.json` to be strict (`unevaluatedProperties: false`).
3. **[ ] Task**: Update `metadata` and `FeatureAttributes` to be strict.
4. **[ ] Task**: Run tests to confirm all go 'Green'.

## Phase 3: Cleanup & Integration
1. **[ ] Task**: Replace the existing manual `rfc/run_schema_tests.py` with the new framework or integrate it.
2. **[ ] Task**: Add the new samples to `rfc/examples/`.
