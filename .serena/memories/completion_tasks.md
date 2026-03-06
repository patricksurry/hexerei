When a task is completed:
1. Ensure all tests pass for the modified subproject (e.g., `npm run test` in TS projects, or run schema tests in `hexmap-rfc`).
2. Run linters (e.g., `npm run lint` for TS).
3. If changing format specifications, update and validate the JSON schema in `hexmap-rfc`.
4. Run `git status` and `git diff` to review changes before considering the task completely done. Do not commit unless explicitly asked to.