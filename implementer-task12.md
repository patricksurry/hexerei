You are executing Task 1 and 2 from `docs/plans/2026-03-11-hexpath-infix-implementation-plan.md`.

Please read the proposal at `rfc/docs/plans/2026-03-11-hexpath-infix-proposal.md` to understand the exact syntax rules and constraints.

Implement the changes to:
1. `core/src/hexpath/hex-path.ts`
2. `core/src/hexpath/hex-path.test.ts`

Specifically:
- In `hex-path.ts`: Add `include`, `exclude`, `close`, `fill`, `-`, `~` logic to `HexPath.resolve`. Make whitespace/`,` act as jumps. Update split logic for `exclude`.
- In `hex-path.test.ts`: Migrate ALL existing tests to the new syntax (e.g. `+` -> `include`, `-` -> `exclude`, `!` -> `fill`, `0101 0105` -> `0101 - 0105`). Add tests for `close`, `~close`, `~fill`, split paths, multi-excludes, label-vs-connector precedence, and whitespace flexibility.

Run `npm test -- core/src/hexpath/hex-path.test.ts` to verify. ONLY commit when all tests pass. If you encounter issues, fix them before committing. Your commit message MUST be:
`git commit -am "feat(core): implement HexPath infix syntax and migrate tests"`
