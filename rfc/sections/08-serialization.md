## Serialization

### JSON (canonical)

The canonical serialization is JSON (RFC 8259). A HexMap JSON file:

- MUST be valid JSON.
- MUST be encoded as UTF-8.
- SHOULD use the file extension `.hexmap.json`.
- SHOULD use the media type `application/vnd.hexerei.hexmap+json`.

### YAML (authoring format)

YAML (version 1.2) is an equivalent serialization, recommended for
hand-authored maps. A HexMap YAML file:

- MUST produce a JSON-compatible data structure when parsed.
  (YAML 1.2 is a superset of JSON; this is always true for documents
  that avoid YAML-specific types like timestamps or binary.)
- SHOULD use the file extension `.hexmap.yaml` or `.hexmap.yml`.
- SHOULD use the media type `application/vnd.hexerei.hexmap+yaml`.
- MAY contain comments (a key advantage over JSON for authoring).

A HexMap YAML document, when converted to JSON, MUST validate against
the same JSON Schema as a native JSON document.

### Validation

Implementations SHOULD validate documents against the JSON Schema defined
in Section 11. Validation MUST be performed against the JSON representation
(converting from YAML first if necessary).

### Round-trip fidelity

The format does not require byte-for-byte round-trip fidelity. An
implementation that reads and re-serializes a HexMap document MAY produce
different JSON/YAML (different whitespace, key ordering, feature
grouping) as long as the semantic content is preserved. See Section 4.7
for the definition of semantic equivalence.
