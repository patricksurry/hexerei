# Track: Orientation Unification & Nudge Refactoring

**Status**: Completed

## Overview
This track replaces the independent `hex_top` and `stagger` keys in the HexMap format with a single `orientation` key (flat-down, flat-up, pointy-right, pointy-left). It also introduces the `~` nudge operator for HexPaths, replacing the old `>[dir]` syntax, and enforces orientation-aware direction validation.

## Files
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
