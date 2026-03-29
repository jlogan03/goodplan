# Plan: Test Infrastructure Polish

## Overview

Two quick fitness test improvements from the test-coverage quest. Phase 1 eliminates the manually-maintained `EXPECTED_ERROR_CODE_COUNT` by deriving the count from source. Phase 2 consolidates file-collection helpers across fitness tests.

All changes are test code except removing `EXPECTED_ERROR_CODE_COUNT` from `src/util/errors.ts`.

## Phase 1: Self-Verifying Error Codes

Replace the manually-maintained `EXPECTED_ERROR_CODE_COUNT = 27` in `src/util/errors.ts` with a count derived from the source type definition at test time.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'EXPECTED_ERROR_CODE_COUNT' src/util/errors.ts` returns 1 — manual count exists

**After implementation** (should pass / show presence):
- [ ] `grep -c 'EXPECTED_ERROR_CODE_COUNT' src/util/errors.ts` returns 0 — manual count removed
- [ ] `bun run test -- --run tests/fitness/structured-errors.test.ts` passes
- [ ] `bun run test -- --run` full suite passes

### Tasks

- [ ] **Add source-derived count to `structured-errors.test.ts`**: Read `src/util/errors.ts` at test time using `fs.readFileSync`, regex-extract all string literals from the four error code union types (`DataErrorCode`, `InternalErrorCode`, `StateErrorCode`, `ValidationErrorCode`). Pattern: extract quoted strings from lines matching `^\t\| "..."` within each type block. Assert `ALL_ERROR_CODES.length` equals the extracted count. This replaces the `EXPECTED_ERROR_CODE_COUNT` import and assertion.
- [ ] **Remove `EXPECTED_ERROR_CODE_COUNT` from `src/util/errors.ts`**: Delete the export and its JSDoc comment. Update `ALL_ERROR_CODES` JSDoc to reference the regex-based count check instead of the manual count.
- [ ] **Verify**: Run full test suite. Add a sanity check: temporarily comment out one entry in `ALL_ERROR_CODES` to confirm the new assertion catches it, then revert.

### Verification

- No `EXPECTED_ERROR_CODE_COUNT` in the codebase
- structured-errors fitness function still catches missing entries
- Full test suite passes

## Phase 2: Consolidate File-Collection Helpers

Deduplicate file-collection logic across fitness tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'function collectFiles' tests/fitness/data-determinism.test.ts` returns 1 — local helper exists

**After implementation** (should pass / show presence):
- [ ] `grep -c 'function collectFiles' tests/fitness/data-determinism.test.ts` returns 0 — removed
- [ ] `grep -c 'collectFiles' tests/fitness/helpers.ts` returns at least 1 — shared helper exists
- [ ] `bun run test -- --run tests/fitness/data-determinism.test.ts` passes
- [ ] `bun run test -- --run` full suite passes

### Tasks

- [ ] **Add `collectFiles` to `tests/fitness/helpers.ts`**: The `data-determinism.test.ts` version collects ALL files (not just `.ts`) and returns sorted relative paths. Add this as a separate export alongside the existing `collectTsFiles`. Signature: `collectFiles(dir: string, base?: string): string[]`.
- [ ] **Update `data-determinism.test.ts`**: Remove the local `collectFiles` function and import from `./helpers.js` instead.
- [ ] **Verify**: Run full test suite.

### Verification

- No local file-collector functions in individual fitness test files (except `tree-accuracy.test.ts` which uses inline `readdirSync` for a different purpose)
- All fitness tests pass
- Full test suite passes
