# The HexMap Format

**hexerei project — format specification draft**
**February 2026, revision 3**

## Status of This Document

This is an early draft of the HexMap interchange format, written in the style
of an IETF RFC for precision and clarity. It is not an Internet Standard.
The key words "MUST", "SHOULD", "MAY", and "OPTIONAL" are used as described
in RFC 2119.

---

## Abstract

This document defines HexMap, a format for representing hexagonal layout maps
used in wargames and similar board games. The format captures layout geometry,
terrain, edge features, paths, and metadata in a human-readable structure
with a formal schema for validation. It is designed for interchange between
map editors, game engines, renderers, and AI systems.

The primary authoring serialization is YAML (version 1.2), chosen for its
readability and support for comments. JSON (RFC 8259) is the canonical 
machine-interchange serialization. The two formats are semantically 
equivalent, and a single JSON Schema is provided for validation of both.
