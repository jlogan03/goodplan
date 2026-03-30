# Generalist Review — Phase 4: Add Fitness Functions

**Score: 9/10**

## Summary

Both fitness functions are well-structured, correctly implement their respective invariants (INV-007 and INV-001), and the architecture docs have been updated as required. The tests pass as part of the full suite (1378 tests, 0 failures). Code quality is high with clear comments, proper TypeScript strictness, and good test design.

## Plan Adherence

All four tasks from Phase 4 are complete:

1. `structured-errors.test.ts` — Static verification of all error codes + dynamic binary spawning for each error category. Matches plan exactly.
2. `mutation-through-state-machine.test.ts` — Static analysis of source files to enforce INV-001. Matches plan exactly.
3. `commands-api.md` — Fitness function section updated: replaced "candidate" entry with actual test file reference and accurate description.
4. `_overview.md` — Subsystem maturity table updated with both new test files in correct rows.

## Issues

### Important (1)

**I1: Error code list in structured-errors.test.ts will silently drift.**
The `ALL_ERROR_CODES` array in `structured-errors.test.ts` (lines 17-49) is a manually-maintained list that must stay in sync with the `GoodplanErrorCode` union type. If a new error code is added to `errors.ts` or `state-events.ts`, the test will still pass — it just won't verify the new code. This is the same class of problem that Phase 3 fixed for event types in `state-events.test.ts`. The plan explicitly asked for "verify every GoodplanError code has a documented exit code mapping" but the current approach can't detect additions to the union type.

A more robust approach: import the error code types and use a compile-time exhaustiveness check, or add a count assertion that breaks when new codes are added (similar to the `allTypes.length` pattern used in Phase 3). Since `GoodplanErrorCode` is a union type (not a runtime-accessible enum), the same limitation applies as with events — but the plan's Phase 3 solution (maintaining a local array with a sync comment) was accepted there, so this is consistent. Still worth flagging as a maintenance risk.

### Minor (1)

**M1: Redundant "no error path produces exit code 0" test.**
The test at lines 134-147 in `structured-errors.test.ts` explicitly re-runs the same three commands already tested above and re-asserts `exitCode !== 0`. The preceding individual tests already assert specific non-zero exit codes (2, 3, 1). This test adds no additional coverage — it's just a less specific version of what's already verified. Not harmful, but unnecessary duplication.

## Strengths

- **mutation-through-state-machine.test.ts** is particularly well-designed: it scans the entire `src/` tree dynamically, so new files are automatically checked. The allowlist pattern with `ALLOWED_JSON_WRITE_FILES` and `MARKDOWN_WRITE_FILES` is clean and self-documenting.
- Comment-skipping in `findWriteCalls()` (line 55-56) avoids false positives from documented examples.
- The `ALLOWED_JSON_WRITE_FILES` set correctly includes both `commit.ts` and the documented INV-001 exception `migrate.ts`.
- Architecture doc updates are accurate and well-integrated — the `commands-api.md` fitness function description now correctly describes both static and dynamic verification.
- The `rpc-layer-api.md` fitness function entry for INV-001 replaces the "candidate" placeholder with the actual test file and an accurate description of scope.
- Dynamic tests in structured-errors exercise three distinct error categories (VALIDATION, STATE, DATA) via realistic CLI invocations.
