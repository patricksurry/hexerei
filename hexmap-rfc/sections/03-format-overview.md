## Format Overview

A HexMap document is a single JSON object (or equivalent YAML document)
with the following top-level structure:

<{{../examples/snippets/doc-envelope.yaml}}

Only `hexmap` and `grid` are REQUIRED. All other sections are OPTIONAL
and default to empty.

The design is intentionally flat at the top level: six sections, each
with a clear role. The `features` list is the heart of the document —
it carries all map content as an ordered sequence of feature entries.
