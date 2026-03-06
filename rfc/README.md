# HexMap RFC - Modular Workflow

This directory contains a modular, mmark-based workflow for editing and building the HexMap Format RFC.

## Overview

The RFC is broken into manageable pieces for easier editing:
- **Sections**: Individual markdown files for each section
- **Examples**: Separate YAML/JSON files for code examples
- **Master**: A master document that includes all pieces
- **Build**: Automated build to HTML, XML, and text formats

## Directory Structure

```
hexmap-rfc/
├── README.md              # This file
├── master.md              # Master document with mmark includes
├── build.py               # Build script (uv run python build.py)
├── pyproject.toml         # Python dependencies (xml2rfc)
├── .gitignore             # Ignore build artifacts and venv
│
├── sections/              # Individual RFC sections
│   ├── 00-front-matter.md
│   ├── 01-introduction.md
│   ├── 02-conventions.md
│   ├── 03-format-overview.md
│   ├── 04-data-model.md
│   ├── 05-addressing.md
│   ├── 06-geometry.md
│   ├── 07-serialization.md
│   ├── 08-extensibility.md
│   ├── 09-examples.md
│   ├── 10-json-schema.md
│   ├── 11-test-cases.md
│   ├── 12-security.md
│   ├── 13-references.md
│   ├── appendix-a-terrain.md
│   ├── appendix-b-clock.md
│   ├── appendix-c-geometry-expr.md
│   └── appendix-d-open-questions.md
│
├── examples/              # Complete example maps
│   ├── minimal.json
│   ├── battle-for-moscow.yaml
│   ├── tactical-demo.yaml
│   └── snippets/          # Small code snippets for inline examples
│       ├── doc-envelope.yaml
│       ├── metadata.yaml
│       ├── layout.yaml
│       ├── terrain.yaml
│       └── defaults.yaml
│
└── build/                 # Generated outputs (created by build)
    ├── hexmap-format-rfc.html
    ├── hexmap-format-rfc.xml
    └── hexmap-format-rfc.txt
```

## Prerequisites

### Required
- **mmark**: Markdown processor for RFC-style documents
  - Install via Homebrew: `brew install mmark`
  - Install via Go: `go install github.com/mmarkdown/mmark@latest`
  - Or download from: https://github.com/mmarkdown/mmark/releases

- **uv**: Python package manager (for xml2rfc dependency)
  - Install: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Or via Homebrew: `brew install uv`

### Optional (for text output)
- **xml2rfc**: Convert XML to RFC text format (installed via uv automatically)

## Quick Start

```bash
cd hexmap-rfc

# First time: sync dependencies
uv sync

# Build HTML and text output (default)
uv run python build.py

# Build specific formats
uv run python build.py --html      # HTML only
uv run python build.py --xml       # XML only
uv run python build.py --txt       # Text only
uv run python build.py --all       # All formats

# Clean and rebuild
uv run python build.py --clean --all

# See all options
uv run python build.py --help
```

## Workflow

### 1. Editing Sections

Edit individual section files in `sections/`:

```bash
# Edit a specific section
vim sections/04-data-model.md

# The master.md file will automatically include your changes
```

### 2. Editing Examples

Edit example files in `examples/`:

```bash
# Edit a snippet
vim examples/snippets/layout.yaml

# Edit a full example
vim examples/battle-for-moscow.yaml
```

Examples are included in section files using mmark's include syntax:
```markdown
{{examples/snippets/layout.yaml}}
```

### 3. Building Outputs

After editing, rebuild the outputs:

```bash
uv run python build.py
```

This generates:
- `build/hexmap-format-rfc.html` - HTML version (always built)
- `build/hexmap-format-rfc.txt` - Plain text RFC format (if xml2rfc installed)
- `build/hexmap-format-rfc.xml` - RFC XML format (intermediate, built for text output)

### 4. Viewing Results

```bash
# View HTML in browser
open build/hexmap-format-rfc.html

# View text in terminal
less build/hexmap-format-rfc.txt
```

## Features

### Automatic Section Numbering

mmark automatically numbers sections and subsections. Just use standard markdown headings:

```markdown
## Introduction
### Subsection
```

Becomes:
```
1. Introduction
   1.1. Subsection
```

### Automatic Table of Contents

The TOC is generated automatically from section headings. No manual maintenance needed!

### Code Examples

Examples can be:
1. **Inline**: Using mmark include syntax `{{path/to/file}}`
2. **Referenced**: Link to files in examples/

Benefits:
- Examples are syntactically validated (real YAML/JSON files)
- Examples can be tested independently
- No duplication between documentation and test data
- Easier to update examples

### PDS Comments

All inline PDS review comments from the original RFC are preserved in the section files for future resolution.

## mmark Features Used

- **Document metadata**: Front matter with author, title, dates
- **Section numbering**: Automatic numbering of sections
- **Includes**: `{{file}}` syntax for including examples
- **References**: Automatic citation and reference handling
- **Multiple outputs**: HTML, XML, and text via xml2rfc

## Tips

### Adding a New Section

1. Create a new file in `sections/`, e.g., `14-new-section.md`
2. Add it to `master.md` in the appropriate location:
   ```markdown
   {{sections/14-new-section.md}}
   ```
3. Rebuild: `make`

### Adding a New Example

1. Create the example file in `examples/` or `examples/snippets/`
2. Reference it in a section file:
   ```markdown
   {{examples/my-example.yaml}}
   ```
3. Rebuild: `make`

### Cross-References

Use mmark's reference syntax for internal links:

```markdown
See (#addressing-notation) for details.
```

### Citations

Define references in `sections/13-references.md` and cite them:

```markdown
[@!RFC8259]
```

## Comparison to Original

The original RFC lives at `../docs/hexmap-format-rfc.md` and remains unchanged.

Advantages of this modular approach:
- **Easier editing**: Work on one section at a time
- **Better collaboration**: Multiple people can edit different sections
- **Reusable examples**: Examples can be tested and reused
- **Automatic updates**: TOC and numbering auto-generated
- **Multiple formats**: Build HTML, XML, or text from same source
- **Version control friendly**: Smaller diffs, easier to review changes

## Quick Reference

```bash
# Setup (first time only)
brew install mmark
uv sync

# Edit workflow
vim sections/04-data-model.md     # Edit a section
vim examples/snippets/layout.yaml   # Edit an example
uv run python build.py             # Rebuild

# View output
open build/hexmap-format-rfc.html

# Build options
uv run python build.py --html      # HTML only
uv run python build.py --all       # All formats
uv run python build.py --clean     # Clean first
```

## Additional Resources

- [mmark documentation](https://mmark.miek.nl/)
- [RFC 7991 (RFC XML format)](https://www.rfc-editor.org/rfc/rfc7991.html)
- [xml2rfc documentation](https://xml2rfc.tools.ietf.org/)
- [uv documentation](https://docs.astral.sh/uv/)

## Troubleshooting

### mmark not found

Install mmark using one of the methods in Prerequisites:
```bash
brew install mmark
# or
go install github.com/mmarkdown/mmark@latest
```

### xml2rfc not found

Text output requires xml2rfc. It should be installed automatically via uv:
```bash
uv sync
```

If you still have issues, you can install it manually:
```bash
uv add xml2rfc
```

Or skip text output and use HTML only:
```bash
uv run python build.py --html
```

### Include files not found

mmark resolves includes relative to the master document. Make sure:
- Example files exist at the paths specified
- Paths in section files match actual file locations

### Build errors

Check that:
1. All section files exist in `sections/`
2. All example files exist in `examples/`
3. YAML/JSON syntax is valid in example files
4. mmark is properly installed and in PATH
5. Include paths in section files use `../examples/` (relative to sections/)

### XML validation errors

If HTML builds but text output fails with XML validation errors, this is usually due to:
- Unclosed markdown blocks in section files
- Missing backmatter closing in appendices

You can still use the HTML output while debugging the XML issues.
