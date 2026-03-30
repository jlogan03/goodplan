# TypeScript Reviewer — Phase 2: RPC Layer Integration

## Issues

**[CRITICAL]** `nextCommands` is required on result types but helper functions don't include it — 5 compilation errors
The `nextCommands` field was added as a required (non-optional) property on `BeginResult`, `CompleteResult`, and `SubmitResult`. The top-level `begin()`, `submit()`, and `complete()` functions correctly spread the base result and add `nextCommands` before returning. However, the internal helper functions (`buildBeginResult`, `buildSubmitResult`, `buildSliceCompleteResult`, `buildQuestCompleteResult`, and the epic branch in `buildCompleteResult`) return these same result types *without* `nextCommands`, causing 5 TypeScript errors:

- `src/core/rpc/begin.ts:412` — `buildBeginResult` returns `BeginResult` without `nextCommands`
- `src/core/rpc/complete.ts:269` — `buildCompleteResult` epic branch returns `CompleteResult` without `nextCommands`
- `src/core/rpc/complete.ts:300` — `buildSliceCompleteResult` returns `CompleteResult` without `nextCommands`
- `src/core/rpc/complete.ts:400` — `buildQuestCompleteResult` returns `CompleteResult` without `nextCommands`
- `src/core/rpc/submit.ts:208` — `buildSubmitResult` returns `SubmitResult` without `nextCommands`

**Fix:** Change the return types of these helper functions to `Omit<BeginResult, 'nextCommands' | 'paths'>`, `Omit<CompleteResult, 'nextCommands' | 'paths' | 'context'>`, and `Omit<SubmitResult, 'nextCommands' | 'paths'>` respectively. This is the correct approach because the helpers build the *base* result, and the caller enriches it with `paths` and `nextCommands`. The `Omit` return type makes this contract explicit. Alternatively, since `paths` is already optional, a narrower fix is to `Omit` just `nextCommands` (and optionally `paths`), but `Omit` of all caller-added fields is clearest.

File: src/core/rpc/begin.ts:412
File: src/core/rpc/submit.ts:208
File: src/core/rpc/complete.ts:269
File: src/core/rpc/complete.ts:300
File: src/core/rpc/complete.ts:400
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `nextCommands` is required but `paths` is optional — inconsistent optionality on result types
`paths` is typed as optional (`paths?: PathReferences`) with a comment "typed optional for backward compatibility with consumers that don't expect it", yet `nextCommands` is typed as required (`nextCommands: NextCommands`). If backward compatibility is a concern for `paths`, the same concern applies to `nextCommands` — existing consumers that destructure these result types will now fail to compile if they don't handle `nextCommands`. If backward compatibility is NOT a concern (since this is a new addition), consider making `paths` required too (removing the `?`) for consistency. Either way, the current asymmetry should be a deliberate choice, not accidental.

File: src/core/rpc/types.ts:133
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The compilation fails with 5 TypeScript errors, making the code unshippable. The root cause is straightforward — helper function return types need updating — but type safety is the core responsibility of this reviewer, and broken compilation is a hard blocker. Fix the `Omit` return types to reach 9+, and address the optionality consistency for 10.

## Summary
- Critical: 1
- Important: 0
- Minor: 1
