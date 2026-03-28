# Plan: Test Infrastructure Polish

## Overview

Two quick fitness test improvements from the test-coverage quest. Phase 1 eliminates the manually-maintained `EXPECTED_ERROR_CODE_COUNT` by deriving the count from source. Phase 2 consolidates file-collection helpers across fitness tests.

All changes are test code except removing `EXPECTED_ERROR_CODE_COUNT` from `src/util/errors.ts`.

## Phase 1: Self-Verifying Error Codes

Replace the manually-maintained `EXPECTED_ERROR_CODE_COUNT = 27` in `src/util/errors.ts` with a set-equality check derived from the source type definitions at test time.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'EXPECTED_ERROR_CODE_COUNT' src/util/errors.ts` returns 1 — manual count exists

**After implementation** (should pass / show presence):
- [ ] `grep -c 'EXPECTED_ERROR_CODE_COUNT' src/util/errors.ts` returns 0 — manual count removed
- [ ] `bun run test -- --run tests/fitness/structured-errors.test.ts` passes
- [ ] `bun run test -- --run` full suite passes

### Tasks

- [ ] **Add source-derived set verification to `structured-errors.test.ts`**: Read **both** source files at test time using `import { readFileSync } from "node:fs"`:
  - `src/util/errors.ts` — defines `DataErrorCode` (8 members), `ValidationErrorCode` (8 members), and `InternalErrorCode` (1 member, uses `= "..."` syntax not `| "..."`)
  - `src/schemas/state-events.ts` — defines `StateErrorCode` (10 members)

  For each file, regex-extract all string literals from the relevant union types. Use an indentation-agnostic pattern like `/"([A-Z]+_[A-Z_]+)"/g` scoped between each `type XxxErrorCode =` declaration and its terminating semicolon. This handles both multi-member (`| "..."`) and single-member (`= "..."`) formats regardless of whitespace style.

  Assert **bidirectional set equality**: the set of regex-extracted codes must exactly equal the set of `ALL_ERROR_CODES` entries. This catches both missing entries (code in source but not in array) and stale entries (code in array but removed from source).
- [ ] **Remove `EXPECTED_ERROR_CODE_COUNT` from `src/util/errors.ts`**: Delete the export and its JSDoc comment. Update `ALL_ERROR_CODES` JSDoc to reference the regex-based set-equality check instead of the manual count.
- [ ] **Verify**: Run full test suite. Sanity check both directions: (1) temporarily comment out one entry in `ALL_ERROR_CODES` to confirm the assertion catches a missing entry, then revert; (2) temporarily add a fake entry like `"FAKE_CODE"` to `ALL_ERROR_CODES` to confirm the assertion catches a stale entry, then revert.

### Verification

- No `EXPECTED_ERROR_CODE_COUNT` in the codebase
- structured-errors fitness function catches both missing and stale entries
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

- [ ] **Add `collectFiles` to `tests/fitness/helpers.ts`**: The `data-determinism.test.ts` version collects ALL files (not just `.ts`) and returns **sorted** relative paths (`.sort()`). This sorting contract is load-bearing — `snapshotFiles` (which calls `collectFiles` locally) depends on deterministic ordering for snapshot stability. Add this as a separate export alongside the existing `collectTsFiles`. Signature: `collectFiles(dir: string, base?: string): string[]`.
- [ ] **Update `data-determinism.test.ts`**: Remove the local `collectFiles` function and import from `./helpers.js` instead. Note that `snapshotFiles` also calls the local `collectFiles`, so the import change applies transitively to `snapshotFiles` as well.
- [ ] **Verify**: Run full test suite. Then confirm no other fitness tests have local file collectors: `grep -r 'function collect' tests/fitness/ | grep -v helpers.ts | grep -v tree-accuracy` should return empty.

### Verification

- No local file-collector functions in individual fitness test files (except `tree-accuracy.test.ts` which uses inline `readdirSync` for a different purpose)
- `grep -r 'function collect' tests/fitness/ | grep -v helpers.ts | grep -v tree-accuracy` returns empty
- All fitness tests pass
- Full test suite passes
