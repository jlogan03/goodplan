# Merged Review — Phase 4: Add Fitness Functions

**Composite Score: 9/10** | Critical: 0, Important: 1, Minor: 3

---

## Important Issues

### I1: ALL_ERROR_CODES array can silently drift from GoodplanErrorCode union
*(Flagged by all three reviewers; TypeScript + architecture reviewers provide actionable fixes)*

The `ALL_ERROR_CODES` array in `tests/fitness/structured-errors.test.ts` (line 17) is manually maintained. If a new error code is added to `GoodplanErrorCode` (via `DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`, or `InternalErrorCode`), the array won't fail — it will simply not test the new code. TypeScript's `GoodplanErrorCode[]` typing ensures every element is valid, but does not ensure completeness.

Recommended fixes (pick one):
- Export `ALL_ERROR_CODES` as a `const` from `errors.ts` using a `satisfies GoodplanErrorCode[]` assertion so the compiler catches missing members.
- Add a count assertion in the test that breaks when new codes are added (consistent with the `allTypes.length` pattern used in Phase 3 for event types).

Not critical because existing codes are fully tested and dynamic tests cover all error categories — only brand-new codes would slip through.

---

## Minor Issues

### M1: Redundant "no error path produces exit code 0" test
*(Flagged by generalist and architecture reviewers)*

The test at line 134 in `structured-errors.test.ts` re-runs the same three commands already tested individually at lines 94, 107, and 120, and re-asserts `exitCode !== 0`. The prior individual tests already assert specific non-zero exit codes (2, 3, 1). This test adds no additional coverage and wastes 3 extra binary spawns. Consider removing it or replacing it with a reference to the prior test results.

File: `tests/fitness/structured-errors.test.ts:134`

### M2: collectTsFiles utility duplicated across fitness functions
*(TypeScript reviewer)*

`collectTsFiles()` is duplicated between `mutation-through-state-machine.test.ts` (line 27) and `state-machine-purity.test.ts` (line 33). Both are identical recursive directory walkers. Two copies is manageable now, but extracting to a shared test utility would prevent further drift if additional fitness functions need it.

File: `tests/fitness/mutation-through-state-machine.test.ts:27`

### M3: Comment skipping in findWriteCalls is naive
*(TypeScript reviewer)*

The comment detection at line 55 (`trimmed.startsWith("*")`) handles JSDoc continuation lines but not all block comment forms. A `writeFileSync` call inside a `/* ... */` block comment that doesn't start with `*` would be a false positive. Given the codebase's JSDoc-only style this is unlikely in practice, but worth noting.

File: `tests/fitness/mutation-through-state-machine.test.ts:55`

---

## Informational Notes (no action needed)

- **Dynamic `init` test couples to repo's .project/**: Line 109 in `structured-errors.test.ts` runs `init --json` without `GOODPLAN_DIR`, relying on the repo already being initialized (producing `STATE_ALREADY_INITIALIZED`). This is intentional and documented in the comment; not a defect.
- **version-stamp.ts omission is correct**: The plan text mentioned "version-stamp" as an INV-001 exception, but the fitness function correctly omits it — `version-stamp.ts` writes via `setEntry()`, not `writeFileSync` directly. Implementation is right; plan wording was imprecise.

---

## Strengths

- `mutation-through-state-machine.test.ts` scans the entire `src/` tree dynamically so new files are automatically checked — no manual maintenance needed.
- `ALLOWED_JSON_WRITE_FILES` allowlist is clean and self-documenting; correctly includes `commit.ts` and the documented INV-001 exception `migrate.ts`.
- Comment-skipping in `findWriteCalls()` avoids false positives from documented examples.
- Architecture doc updates are accurate and well-integrated: `_overview.md` maturity table, `commands-api.md`, and `rpc-layer-api.md` all correctly reference the new test files.
- Dynamic tests in `structured-errors.test.ts` exercise three distinct error categories (VALIDATION, STATE, DATA) via realistic CLI invocations.
- TypeScript strictness is observed throughout: `noUncheckedIndexedAccess` guard at line 51, `import type` used where appropriate, `as` casts limited to JSON parse boundaries.
- All 1378 tests pass with 0 failures.
