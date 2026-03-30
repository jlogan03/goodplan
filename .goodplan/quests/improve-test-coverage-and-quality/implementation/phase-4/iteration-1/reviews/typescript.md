# TypeScript Review: Phase 4 — Add Fitness Functions

## Issues

**[IMPORTANT]** ALL_ERROR_CODES list may drift from GoodplanErrorCode union
The `ALL_ERROR_CODES` array in `structured-errors.test.ts` is a manually maintained list that must stay in sync with the `GoodplanErrorCode` union type (composed of `DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`, and `InternalErrorCode`). If a new error code is added to any of those unions, the fitness function silently loses coverage. The test should verify completeness — e.g., by asserting the array length matches the number of known codes, or by importing a programmatic list. Currently there is no compile-time or runtime check that ALL_ERROR_CODES is exhaustive.

Possible fix: add a `satisfies GoodplanErrorCode[]` assertion and a test that every code in the union is present (this is hard to do purely at the type level for string literal unions, but at minimum `satisfies` catches values not in the union). Alternatively, export the error codes as a const array from `errors.ts` and import it.
File: tests/fitness/structured-errors.test.ts:17
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Duplicated `collectTsFiles` utility across fitness functions
`collectTsFiles()` is duplicated between `mutation-through-state-machine.test.ts` (line 27) and `state-machine-purity.test.ts` (line 33). Both are identical recursive directory walkers. This is a minor DRY concern — two copies is manageable, but if more fitness functions need it, extracting to a shared test utility would be cleaner.
File: tests/fitness/mutation-through-state-machine.test.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Comment skipping in `findWriteCalls` is naive
The comment detection at line 55 (`trimmed.startsWith("*")`) skips lines starting with `*` which handles JSDoc continuation lines, but does not handle multi-line `/* ... */` block comments properly. A line like `const x = fs.writeFileSync(...)` inside a block comment that doesn't start with `*` would be a false positive. Given the codebase style (JSDoc-style comments), this is unlikely to trigger in practice, but worth noting.
File: tests/fitness/mutation-through-state-machine.test.ts:55
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Dynamic test in `structured-errors.test.ts` uses `init` against the repo's own `.project/`
Line 109 runs `runCommand(bin, ["init", "--json"])` without setting `GOODPLAN_DIR`, so it runs against the repo's own `.project/` directory. This works because the repo is already initialized (producing `STATE_ALREADY_INITIALIZED`), but it creates an implicit coupling to the test runner's working directory having a `.project/`. This is consistent with how the test is designed (the comment on line 108 documents the intent), so this is just a note — not a defect.
File: tests/fitness/structured-errors.test.ts:109
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both fitness functions are well-structured, follow established patterns from existing fitness tests, correctly implement the invariant checks described in `invariants.md`, and pass all 260 tests. Type safety is good — `noUncheckedIndexedAccess` is handled (line 51: `if (line === undefined) continue`), imports use `import type` where appropriate, and `as` casts are limited to JSON parse results (reasonable at process boundaries). The architecture doc updates accurately reflect what the tests verify. The one IMPORTANT issue (error code list drift) is a real maintenance risk but doesn't affect current correctness.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
