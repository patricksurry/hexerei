# Authoring the HexMap RFC

This document describes the modular, mmark-based workflow for editing and building the HexMap Format RFC.

## Modular Workflow

The RFC is broken into manageable pieces for easier editing:
- **Sections**: Individual markdown files for each section in `sections/`.
- **Examples**: Separate YAML/JSON files for code examples in `examples/`.
- **Master**: `master.md` includes all pieces.
- **Build**: `build.py` automates building to HTML, XML, and text formats.

### 1. Editing Sections

Edit individual section files in `sections/`. The `master.md` file will automatically include your changes.

### 2. Editing Examples

Edit example files in `examples/`. Snippets are in `examples/snippets/`.
Examples are included in section files using mmark's include syntax:
```markdown
{{../examples/snippets/layout.yaml}}
```

### 3. Building Outputs

After editing, rebuild the outputs:
```bash
uv run python build.py
```
This generates:
- `build/hexmap-format-rfc.html`
- `build/hexmap-format-rfc.txt`
- `build/hexmap-format-rfc.xml`

## mmark Features Used

- **Automatic Section Numbering**: Uses standard markdown headings.
- **Automatic TOC**: Generated from headings.
- **Includes**: `{{file}}` syntax for including examples.
- **References & Citations**: defined in `sections/13-references.md` and cited with `[@!RFC8259]`.

## Tips & Troubleshooting

### Adding Content
- **New Section**: Create file in `sections/` and add to `master.md`.
- **New Example**: Create file in `examples/` and reference it in a section.
- **Cross-References**: Use `(#anchor-name)`.

### Troubleshooting
- **mmark not found**: Install via `brew install mmark`.
- **xml2rfc not found**: Install via `uv add xml2rfc`.
- **Include errors**: Ensure paths are relative to `master.md` or as expected by mmark.
- **XML validation**: Usually due to unclosed markdown blocks or invalid XML structure.

## Comparison to Original
The modular approach (vs the original single-file `../docs/hexmap-format-rfc.md`) provides:
- Easier collaboration.
- Reusable, testable examples.
- Automatic TOC/numbering.
- Version control friendly (smaller diffs).
