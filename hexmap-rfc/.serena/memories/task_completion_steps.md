# Task Completion Steps: HexMap RFC

### Steps to follow after making changes:
1. **Validate Examples**: Run the example validation to ensure any modified map data or snippets adhere to the JSON Schema.
   ```bash
   uv run python build.py --no-txt  # This runs the built-in validation
   ```
2. **Run Negative Tests**: Run the negative schema tests to ensure the schema still catches invalid input.
   ```bash
   uv run python run_schema_tests.py
   ```
3. **Build Documentation**: Rebuild the RFC in HTML and text formats.
   ```bash
   uv run python build.py --all
   ```
4. **Preview Results**: Open the generated HTML in a browser to check for formatting or include errors.
   ```bash
   open build/hexmap-format-rfc.html
   ```
5. **Clean Build Directory**: Periodically clean the build artifacts.
   ```bash
   uv run python build.py --clean
   ```
