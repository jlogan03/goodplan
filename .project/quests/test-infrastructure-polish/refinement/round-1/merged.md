# Merged Review Feedback: Test Infrastructure Polish

## Reviewers

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 7/10 | 1 | 1 | 2 |
| software-architecture | 6/10 | 1 | 2 | 1 |
| typescript | 6/10 | 1 | 1 | 2 |

## Deduplicated Issues

### CRITICAL

**C1: Phase 1 regex extraction misses `StateErrorCode` — it lives in a different file**
Sources: holistic, software-architecture, typescript

The plan says to regex-extract all four error code union types from `src/util/errors.ts`. However, `StateErrorCode` is not defined there — it is imported from `src/schemas/state-events.ts` (10 members). The regex approach as written would find only 17 codes instead of 27, producing a broken fitness test from the start.

**Fix:** Read both `src/util/errors.ts` and `src/schemas/state-events.ts`. Extract union members from each file for the types defined there. The plan must explicitly name both file paths and map each union type to its source file.

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT

**I1: Regex pattern `^\t| "..."` is fragile and misses single-member unions**
Sources: holistic (partial), software-architecture, typescript

Two sub-issues:

1. **Formatting fragility:** The `^\t| "..."` pattern assumes tab indentation and a specific union formatting style. If Biome reformats (e.g., spaces), the regex silently extracts zero members causing a false pass.
2. **Single-member union miss:** `InternalErrorCode` is defined as `type InternalErrorCode = "INTERNAL_ERROR";` — this uses `= "..."` syntax, not `\t| "..."`. The regex must handle both patterns.

**Fix:** Use an indentation-agnostic pattern like `/"([A-Z]+_[A-Z_]+)"/g` scoped between each type declaration and its terminating semicolon, which handles both multi-member (`| "..."`) and single-member (`= "..."`) formats regardless of whitespace style.

Resolution: DIRECTLY_ACTIONABLE

---

**I2: No bidirectional verification — count equality is insufficient**
Sources: holistic (minor), software-architecture

The plan asserts `ALL_ERROR_CODES.length` equals the regex-extracted count. This catches missing entries but not stale entries (a deleted union member still present in `ALL_ERROR_CODES`). Count equality can mask symmetric additions/removals.

**Fix:** Assert set equality, not just count equality. The set of regex-extracted codes should equal the set of `ALL_ERROR_CODES` entries. Also verify the inverse during manual verification: adding a fake entry to `ALL_ERROR_CODES` should be caught.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR

**M1: Phase 2 `collectFiles` — sorting behavior and `snapshotFiles` dependency not documented**
Sources: software-architecture, typescript

The existing `collectFiles` in `data-determinism.test.ts` returns sorted paths (`.sort()`). The plan should note this sorting contract in the shared helper signature since `snapshotFiles` depends on deterministic ordering. The plan should also note that `snapshotFiles` calls `collectFiles` locally, so the import change applies transitively.

Resolution: DIRECTLY_ACTIONABLE

---

**M2: Phase 2 success criteria should verify no other fitness tests have local file collectors**
Source: holistic

The verification section mentions this check but doesn't include it as a runnable command. Add `grep -r 'function collect' tests/fitness/ | grep -v helpers.ts | grep -v tree-accuracy` as an explicit after-check.

Resolution: DIRECTLY_ACTIONABLE

---

**M3: Phase 1 should specify `node:fs` import style**
Source: typescript

The plan says `fs.readFileSync` without specifying the import form. For consistency with `verbatimModuleSyntax` and existing patterns, clarify whether to use `import * as fs from "node:fs"` or `import { readFileSync } from "node:fs"`.

Resolution: DIRECTLY_ACTIONABLE

---

## Summary

All three reviewers independently identified the same critical issue: `StateErrorCode` lives in `src/schemas/state-events.ts`, not `src/util/errors.ts`, so the regex extraction approach would miss 10 of 27 error codes. Two reviewers flagged regex fragility (single-member unions, formatting assumptions) as important. One reviewer elevated bidirectional verification from minor to important. Phase 2 is generally well-specified with only minor documentation gaps.

**Action items (priority order):**
1. Fix Phase 1 to read both source files for error code extraction (C1)
2. Use a robust, indentation-agnostic regex that handles both `= "..."` and `| "..."` patterns (I1)
3. Assert set equality instead of count equality for bidirectional verification (I2)
4. Document `collectFiles` sorting contract and `snapshotFiles` dependency (M1)
5. Add concrete grep check for local file collectors in Phase 2 verification (M2)
6. Specify `node:fs` import style (M3)
