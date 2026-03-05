# Suggested Commands: HexMap RFC

### Core Commands:
- **Build documentation (default)**: `uv run python build.py`
- **Build all formats (HTML, XML, TXT)**: `uv run python build.py --all`
- **Clean and rebuild all**: `uv run python build.py --clean --all`
- **Build HTML only**: `uv run python build.py --html`
- **Run schema validation on examples**: `uv run python build.py --no-txt` (built-in validation)
- **Run negative schema tests**: `uv run python run_schema_tests.py`
- **Open built HTML**: `open build/hexmap-format-rfc.html`
- **Preview text version**: `less build/hexmap-format-rfc.txt`

### System Utilities:
- **List files and directories**: `ls -R`
- **Search for pattern in RFC sections**: `grep -r "pattern" sections/`
- **Find example snippets**: `find examples/snippets/ -name "*.yaml"`
- **Check git status**: `git status`
- **See build options**: `uv run python build.py --help`
