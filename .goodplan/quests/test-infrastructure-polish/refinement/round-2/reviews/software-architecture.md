# Software Architecture Review: Test Infrastructure Polish (Round 2)

## Issues

**[MINOR]** Phase 1 regex pattern may miss error codes with digits

The regex `/"([A-Z]+_[A-Z_]+)"/g` matches only uppercase letters and underscores. If a future error code contains a digit (e.g., `"DATA_V2_MIGRATION_ERROR"`), it would be silently missed. A slightly broader pattern like `/"([A-Z][A-Z0-9_]+)"/g` would be more future-proof without increasing false positive risk, since all current codes are uppercase-letter-only. This is minor because no current codes contain digits and the bidirectional set-equality check would catch the mismatch immediately.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 issues have been properly addressed. The critical issue (StateErrorCode in a different file) is resolved -- the plan now explicitly reads both source files. The regex is now indentation-agnostic and scoped between type declaration and semicolon, handling both `| "..."` and `= "..."` formats. Bidirectional set equality is explicitly specified, catching both missing and stale entries. The `collectFiles` sorting contract is documented as load-bearing.

The plan correctly identifies that all changes are test code except removing `EXPECTED_ERROR_CODE_COUNT` from `src/util/errors.ts`. Module boundaries are respected: the fitness test reads source files for regex extraction (appropriate for a fitness function) without introducing new runtime dependencies. The shared `collectFiles` helper in `tests/fitness/helpers.ts` is a clean consolidation that aligns test boundaries with module boundaries. No invariants are violated.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
