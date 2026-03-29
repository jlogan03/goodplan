# Holistic Review: Test Infrastructure Polish

## Issues

**[CRITICAL]** Phase 1 regex extraction misses StateErrorCode (defined in a separate file)

The plan says to "regex-extract all string literals from the four error code union types (`DataErrorCode`, `InternalErrorCode`, `StateErrorCode`, `ValidationErrorCode`)" by reading `src/util/errors.ts`. However, `StateErrorCode` is not defined in that file -- it is imported from `src/schemas/state-events.ts` (line 13: `import type { StateErrorCode } from "../schemas/state-events.js"`). The regex approach described would only find `DataErrorCode`, `ValidationErrorCode`, and `InternalErrorCode` in `errors.ts`, silently missing all 10 `STATE_*` codes.

The task must either: (a) also read `src/schemas/state-events.ts` and extract from the `StateErrorCode` union there, or (b) change the approach to extract from the `GoodplanErrorCode` composed union plus its constituent types across both files, or (c) use a simpler approach -- since `ALL_ERROR_CODES` already has `satisfies readonly GoodplanErrorCode[]` (TypeScript enforces completeness at compile time), the real gap is only detecting *extra* entries in `ALL_ERROR_CODES` that were removed from the union. A simpler alternative: regex-count all `| "..."` lines across both source files and compare to `ALL_ERROR_CODES.length`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 regex pattern description is inaccurate

The plan specifies: "Pattern: extract quoted strings from lines matching `^\t| "..."`  within each type block." Looking at the actual source, the union members use a *tab then pipe* format (`\t| "DATA_..."`) in `errors.ts`, but `state-events.ts` uses the same format. However, the plan's description of "four error code union types" in a single file is wrong (only three are in `errors.ts`). The task description should specify exactly which files to read and which type blocks to extract from in each file.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 verification could be more specific about the sanity check

The verify task says "temporarily comment out one entry in `ALL_ERROR_CODES` to confirm the new assertion catches it, then revert." This is good practice but should also verify the inverse: adding a fake entry to `ALL_ERROR_CODES` that isn't in the union types should also be caught. Currently `satisfies` handles this at compile time, but the regex count check should catch count mismatches in both directions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 success criteria could verify no other fitness tests have local file collectors

The "After implementation" checks verify `data-determinism.test.ts` no longer has a local `collectFiles` and `helpers.ts` exports it. The verification section mentions "No local file-collector functions in individual fitness test files (except `tree-accuracy.test.ts`)" but this isn't in the Expected Behavior checklist as a runnable check. Adding `grep -r 'function collect' tests/fitness/ | grep -v helpers.ts | grep -v tree-accuracy` as an after-check would make this concrete.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases, good Expected Behavior sections, and appropriate scope. However, the critical issue -- Phase 1's regex approach silently missing `StateErrorCode` because it lives in a different file -- would cause the implementation to produce an incorrect count (17 instead of 27), making the self-verifying check broken from the start. Fixing the multi-file extraction approach and tightening the regex pattern description would bring this to 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
