# Specification: HexMap Schema Verification & TDD

## Goal
Establish a robust TDD-driven test framework for the HexMap JSON Schema that ensures absolute alignment between the Schema and the RFC.

## Current State & Issues
1. **RFC Internal Conflict**:
   - `04-data-model.md` and snippets use `layout.all` and `layout.georef`.
   - `11-json-schema.md` uses `layout.hexes` and `layout.geo`.
2. **Schema Inconsistency**: `rfc/hexmap.schema.json` matches the data model (`all`, `georef`) but doesn't match the embedded schema in `11-json-schema.md`.
3. **Missing Strictness**: The schema currently allows extra properties in `metadata` and features, which can lead to "silent" format drift.
4. **No TDD Framework**: Existing validation scripts are manual and don't provide a suite of regression tests for valid/invalid samples.

## Requirements
1. **Test Framework**: A Python-based (matching current RFC scripts) test runner that:
   - Loads the current JSON schema.
   - Validates files in `tests/valid/`.
   - Rejects files in `tests/invalid/`.
   - Provides clear error reporting on failure.
2. **Valid Samples**:
   - `minimal.json`: The absolute smallest valid document.
   - `full-snippets.json`: A document composed of all valid snippets from the RFC.
   - `battle-for-moscow.hexmap.json`: A real-world complex example.
3. **Invalid Samples**:
   - `wrong-layout.json`: Uses `hexes` or `geo` instead of `all` and `georef`.
   - `missing-required.json`: Missing `hexmap` or `layout`.
   - `strictness-failure.json`: Contains unauthorized top-level keys.
4. **Fix Schema**: After establishing the 'Red' state, update `rfc/hexmap.schema.json` and the RFC document to be consistent and strict.
