## Issues

**[IMPORTANT]** Redundant `getJson` calls in `buildSliceCompleteResult`
`buildSliceCompleteResult` reads `oldSlice` and `newSlice` at lines 133-134, then re-reads the same data as `sliceJson` at line 155 (`getJson<Slice>(oldState, ...)` -- identical to `oldSlice`) and `newSliceData` at line 215 (`getJson<Slice>(newState, ...)` -- identical to `newSlice`). These are unnecessary duplicate reads that add confusion about which variable to reference.
File: src/core/rpc/complete.ts:155
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `CompleteResult.deferredRouted` type diverges from `rpc-layer-api.md` spec without spec update
The API spec defines `deferredRouted?: { item: DeferredItem; target: string }[]` but the implementation uses `deferredRouted?: DeferredItem[]`. The plan documents this as intentional ("`DeferredItem` already contains `targetSlice: string`, so no separate `target` field is needed"), which is a reasonable simplification. However, `rpc-layer-api.md` is the documented source of truth and has not been updated to match. This creates spec drift that will confuse future implementers and reviewers.
File: src/core/rpc/types.ts:99
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `deferredSkipped` detection relies on fragile activity log `phase` field matching
The skipped count is derived by filtering new activity log entries for `entry.phase === "deferred-skip"` (line 189). This couples `buildSliceCompleteResult` to the state machine's internal activity log format -- the string `"deferred-skip"` is not a shared constant or typed value. If the state machine changes this string, the RPC layer silently returns wrong counts. Using `Record<string, unknown>` for the log entry type compounds this: there is no compile-time safety.
File: src/core/rpc/complete.ts:189
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan says "Inject `ts` on each ArchitectureDelta entry" as an RPC-layer task but the RPC layer does not do this
The plan's task 2 says to "Inject `ts` on each ArchitectureDelta entry" in the RPC layer. In practice, the RPC layer passes `ArchitectureDeltaInput[]` (without `ts`) straight through to the event, and the state machine handler (`slice-complete.ts:111-113`) injects `ts` from `event.ts`. This is functionally correct, but the plan description is misleading about where `ts` injection happens. The state machine comment at line 110 ("Each delta arrives with ts already injected by the RPC layer") is also incorrect. No code change needed in this phase, but the misleading comment in `slice-complete.ts` should be fixed.
File: src/core/state/transitions/slice-complete.ts:110
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
Type safety is good overall: `noUncheckedIndexedAccess` compliance is evident (line 175 checks `d !== undefined`), `ArchitectureDeltaInput`/`LearningInput` types are correctly used at the input boundary, and coercion of `undefined` to `[]` is correct per the spec. The redundant reads and spec drift prevent a 9. Fix: (1) remove the two redundant `getJson` calls, reusing `oldSlice`/`newSlice`; (2) update `rpc-layer-api.md` to match the actual `deferredRouted` type; (3) extract the `"deferred-skip"` string to a shared constant or use a typed activity entry.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
