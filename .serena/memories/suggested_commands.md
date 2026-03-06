Here are the important commands for developing code in this project. Remember to run these from the respective subproject directories!

# hexmap-core
cd hexmap-core
npm run test      # Run vitest tests
npm run build     # Compile TypeScript
npm run lint      # Run ESLint

# hexmap-renderer
cd hexmap-renderer
npm run dev       # Start Vite dev server
npm run test      # Run vitest tests

# hexmap-importer
cd hexmap-importer
# Python environment is managed via uv.
uv run python src/main.py # Example entrypoint

# hexmap-rfc
cd hexmap-rfc
uv run python run_schema_tests.py # Run schema validation tests

# General / System Utils (Darwin)
ls -la            # List files
cd <dir>          # Change directory
grep -rn <pattern> . # Search in files
find . -name "*.ts" # Find typescript files
git status        # Check git status