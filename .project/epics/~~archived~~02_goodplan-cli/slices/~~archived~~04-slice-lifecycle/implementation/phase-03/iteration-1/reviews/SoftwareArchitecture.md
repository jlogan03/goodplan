# Software Architecture Review — Phase 03: RPC Layer Wiring

## Issues

**[IMPORTANT]** `CompleteResult.deferredRouted` type diverges from API spec

The `rpc-layer-api.md` spec defines `deferredRouted` as `{ item: DeferredItem; target: string }[]` — a wrapper that pairs each deferred item with the target slice name. The implementation uses `DeferredItem[]` directly. The plan's task description explicitly calls this out as intentional ("each `DeferredItem` already contains `targetSlice: string`, so no separate `target` field is needed"), but the architecture spec has not been updated to match. This creates a contract divergence between documented API and implementation. Either the spec should be updated to `DeferredItem[]` or the implementation should match the spec's wrapper shape.

File: src/core/rpc/types.ts:99
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `deferredSkipped` field not in API spec

`CompleteResult.deferredSkipped?: number` was added to `types.ts` but does not appear in `rpc-layer-api.md`'s `CompleteResult` definition. This is a new public API field on a result type consumed by the Commands layer. The field is useful and well-motivated (the plan describes deriving it), but the architecture spec should be updated to include it — otherwise the spec is incomplete as a contract reference.

File: src/core/rpc/types.ts:100
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `architecturePaths.currentArchitecture` returns state-tree-relative path, not filesystem path

The implementation returns `epics/${epic}/architecture` (a relative path within the state tree). The API spec says these are "root paths so the LLM can update project-level architecture directly." For the LLM to actually use these paths, it needs absolute filesystem paths (or at minimum, paths relative to the project root). Other result types (`PathReferences` in `BeginResult`, `SubmitResult`) are documented as "absolute filesystem paths." The Commands layer will need to resolve these before returning to the caller. This is likely the intended behavior (the Commands layer resolves relative to `projectDir`), but the mismatch should be explicitly acknowledged — either the RPC layer should return absolute paths using `projectDir`, or the spec should clarify these are project-relative.

File: src/core/rpc/complete.ts:219
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Redundant `newSlice` lookup in `buildSliceCompleteResult`

`newSlice` is fetched from `getJson<Slice>(newState, ...)` at line 134 and used throughout. Then at line 215, the same path is fetched again into `newSliceData`. Since `newSlice` is already available and confirmed non-undefined (the early return on line 142 guards this), the second fetch is unnecessary.

File: src/core/rpc/complete.ts:215
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Misleading comment in state machine about RPC `ts` injection

The comment at `slice-complete.ts:110` says "Each delta arrives with ts already injected by the RPC layer" but the very next line (`ts: event.ts`) shows the state machine is the one injecting `ts`. The RPC layer correctly passes `ArchitectureDeltaInput[]` (without `ts`) and the state machine adds it. The comment should be corrected to avoid confusion.

File: src/core/state/transitions/slice-complete.ts:110
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `sliceJson` variable assigned but only used as `sliceJson !== undefined` guard

In `buildSliceCompleteResult`, `sliceJson` (line 155) fetches `oldState` slice data, but it is only used in the `if (overview !== undefined && sliceJson !== undefined)` guard. The variable's contents are never accessed. This guard is checking whether the old slice existed, but `oldSlice` (line 133) already captures this and could be reused, eliminating the redundant fetch.

File: src/core/rpc/complete.ts:155
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation correctly follows the 4-layer architecture (RPC orchestrates State Machine + Data Layer without containing transition logic). Module boundaries are clean: `begin.ts`, `complete.ts`, `submit.ts` each own their event-building and result-building, sharing types through `types.ts`. The dependency direction is correct (RPC depends on State Machine and Data Layer, never the reverse). The extraction of `buildSliceCompleteResult` as a dedicated function keeps the main `buildCompleteResult` dispatcher clean and follows the existing pattern. Test coverage is thorough with proper end-to-end RPC tests through the real filesystem.

To reach 9+: resolve the API spec divergences (deferredRouted type shape, deferredSkipped field, architecturePaths path format) so the documented contract matches the implementation. Clean up the minor redundancies.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
