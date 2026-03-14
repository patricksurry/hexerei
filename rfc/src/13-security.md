## Security Considerations

HexMap documents are data files with no executable content. Parsers
SHOULD NOT evaluate any string field as code. Standard JSON/YAML parsing
security considerations apply: parsers SHOULD reject excessively large
documents, deeply nested structures, and (for YAML) MUST disable
arbitrary object instantiation (i.e., use safe loading).

File paths and URLs in `metadata.source` are informational and MUST NOT
be automatically fetched or executed.
