# Software Architecture Review — Phase 4: Add Fitness Functions

## Issues

**[IMPORTANT]** ALL_ERROR_CODES array can silently drift from GoodplanErrorCode union
The `ALL_ERROR_CODES` array in `tests/fitness/structured-errors.test.ts` is manually maintained. If a new error code is added to `GoodplanErrorCode` (via `DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`, or `InternalErrorCode`), the array won't fail — it will simply not test the new code. TypeScript's `GoodplanErrorCode[]` typing ensures every element is valid, but does not ensure completeness. Consider adding a compile-time exhaustiveness check: export a `const ALL_ERROR_CODES` from the source (or a test helper) that uses a mapped type or `satisfies` pattern to ensure every union member is present. Alternatively, add a count assertion: read the union definition and count expected members. This is IMPORTANT rather than CRITICAL because the static tests still validate the mapping logic for all existing codes, and the dynamic tests cover each error category — only brand-new codes would slip through.
File: tests/fitness/structured-errors.test.ts:17
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Redundant "no error path produces exit code 0" test
The test at line 134 ("no error path produces exit code 0") re-runs the exact same three commands already tested individually at lines 94, 107, and 120. It adds no new assertion — each prior test already asserts `exitCode` is non-zero. This is wasted binary spawns (3 extra invocations) with no additional coverage. Consider removing this test or, if its intent is a "summary assertion," referencing the results from the prior tests rather than re-executing.
File: tests/fitness/structured-errors.test.ts:134
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan specified version-stamp as INV-001 exception but fitness function correctly omits it
The plan text says "documented exceptions: version-stamp, migrate" but the fitness function only lists `commit.ts` and `migrate.ts` in `ALLOWED_JSON_WRITE_FILES`. This is actually correct — `version-stamp.ts` operates on the state tree via `setEntry()` and never calls `writeFileSync` directly. The implementation is right; the plan wording was imprecise. No code change needed, but noting for documentation accuracy.
File: tests/fitness/mutation-through-state-machine.test.ts:15
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. Both fitness functions are well-structured, test the right things at the right boundaries, and pass all 260 assertions. The architecture docs are correctly updated — `_overview.md` maturity table, `commands-api.md`, and `rpc-layer-api.md` all reference the new test files accurately. The INV-001 fitness function correctly identifies the three allowed write locations (`commit.ts`, `migrate.ts`, `markdown-files.ts`) and tests all three architectural layers (commands, RPC, data). The INV-007 fitness function covers both static (exit code mapping) and dynamic (binary execution) verification. The one IMPORTANT issue (error code array completeness) is a real maintainability gap that would bring this to 10/10 if addressed.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
