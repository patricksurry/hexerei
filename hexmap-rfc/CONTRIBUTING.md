# Contributing to the HexMap RFC

This RFC is authored using `mmark` and built into HTML, XML (RFC 7991), and Text.

## Structure

*   **`master.md`**: The root document. Includes sections using `{{sections/filename.md}}`.
*   **`sections/XX-name.md`**: Individual sections.
    *   **Headers**: Use `##` (Level 2) for main sections (e.g., `## Data Model`). `mmark` promotes these to Level 1 in the RFC structure (since the RFC Title is Level 0).
    *   **File Naming**: Keep files numbered for ordering.

## Syntax & Linting

### Lists and Code Blocks
**Avoid putting code blocks inside lists.**
`mmark` -> `xml2rfc` conversion is fragile with nested blocks.
*   **Bad**:
    ```markdown
    *   Item 1
        ```
        code
        ```
    ```
*   **Good**: use a top-level block following the list, or use standard indentation if absolutely necessary (but top-level is safer).

### Citations
Use `[@RefID]` for citations. References are defined in `sections/14-references.md`.

## Building

Prerequisites:
*   `mmark` (See [mmarkdown/mmark](https://github.com/mmarkdown/mmark))
*   `xml2rfc` (`uv add xml2rfc` or `pip install xml2rfc`)

Build:
```bash
uv run python3 build.py
```

Clean build:
```bash
uv run python3 build.py --clean
```
