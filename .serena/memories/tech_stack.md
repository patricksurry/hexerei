The project uses a mix of technologies depending on the subproject:
- `hexmap-core` & `hexmap-renderer`: TypeScript, Node.js, Vite, Vitest, D3 (in renderer).
- `hexmap-importer`: Python (>=3.11), Jupyter, scikit-image, scipy. Dependency management via `uv`.
- `hexmap-rfc`: Python (>=3.10), jsonschema, xml2rfc. Dependency management via `uv`.