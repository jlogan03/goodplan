# Software Architecture Review — Phase 3: Result Type Paths

## Issues

**[IMPORTANT]** `mapToBeginPhase` lacks exhaustive `default: never` check
The `mapToBeginPhase` function in `paths.ts` handles all current `BeginPhase | SubmitPhase | "complete"` values, but has no `default` case with a `never` type assertion. If a new phase is added to `BeginPhase` or `SubmitPhase` in the future, this function will silently return `undefined` at runtime instead of producing a compile error. The downstream `resolveForBeginPhase` does have the `default: never` check, which would catch the issue one call deeper — but the error message would be confusing (an `undefined` being switched on). Adding the exhaustive check here catches the problem at the right abstraction level.
File: src/core/rpc/paths.ts:51
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Redundant `| "complete"` in `resolvePathReferences` signature
The `SubmitPhase` type already includes `"complete"` as a variant (types.ts:53), so the explicit `| "complete"` in the `resolvePathReferences` signature and `mapToBeginPhase` is redundant. TypeScript unions are idempotent so this is harmless, but it adds visual noise and may confuse readers into thinking `"complete"` is not part of `SubmitPhase`. Consider removing the redundant union member or adding a comment explaining the intent (e.g., "explicit for clarity since `complete()` passes this literal").
File: src/core/rpc/paths.ts:36
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `RollupResult` does not get `paths` field — intentional but undocumented
The `begin()` function returns early for rollup operations (line 47-48 in begin.ts) before assigning `paths`. This is correct — `RollupResult` has a different shape and rollup targets return `{}` from `resolvePathReferences` anyway. However, the early return means the `resolvePathReferences` call is skipped entirely. A brief inline comment at the early return would make the intent explicit (e.g., "Rollup has a different result type — no paths field").
File: src/core/rpc/begin.ts:47
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Excellent structural implementation. The new `paths.ts` module is deep — small public interface (`resolvePathReferences`) hiding phase-mapping and entity-directory resolution internally. Dependency direction is correct (paths.ts depends on types.ts, consumed by begin/submit/complete). The module cleanly separates concerns: entity directory resolution, submit-to-begin mapping, and per-phase path resolution are distinct internal functions. The coexistence strategy for `architecturePaths` vs `paths` is well-documented with clear forward migration intent. Test boundaries are well-aligned with module boundaries — unit tests verify `resolvePathReferences` through its public API, integration tests verify end-to-end through the CLI binary. The only substantive issue is the missing exhaustive check in `mapToBeginPhase`.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
