# Phase 03: RPC Layer Wiring — Merged Review

**Scores:** Generalist 9/10 | TypeScript 8/10 | SoftwareArchitecture 8/10
**Consensus score: 8/10**
**Critical: 0 | Important: 4 | Minor: 3**

## Summary

Phase 3 successfully wires slice lifecycle operations through the RPC layer. All 7 plan tasks are complete: `begin()` handles all 5 slice BeginPhase values, `complete()` supports full CompleteInput payload with deferred routing/learnings/architecture deltas, `BeginPayloadMap` extended with runtime validation, result builders handle slice targets, `CompleteResult` extended with optional fields, and comprehensive end-to-end tests pass. State machine refactoring in `slice-submit.ts` (shared helpers, `!`-assertion removal) is clean. Build passes, 460 tests pass, biome clean.

---

## Important

**1. `CompleteResult.deferredRouted` type diverges from `rpc-layer-api.md` spec**
The API spec defines `deferredRouted` as `{ item: DeferredItem; target: string }[]`. The implementation uses `DeferredItem[]` directly. The plan acknowledges this as intentional (`DeferredItem` already contains `targetSlice: string`), but `rpc-layer-api.md` has not been updated. This is a contract divergence that will confuse future implementers.
Files: `src/core/rpc/types.ts:99`, `rpc-layer-api.md`
Resolution: Update `rpc-layer-api.md` to reflect `DeferredItem[]` (preferred — avoids redundancy), or change the implementation to match the spec.

**2. `CompleteResult.deferredSkipped` is not in the API spec**
`deferredSkipped?: number` was added to `types.ts` but does not appear in `rpc-layer-api.md`'s `CompleteResult` definition. This is a new public field consumed by the Commands layer; the spec is incomplete as a contract reference.
File: `src/core/rpc/types.ts:100`
Resolution: Add `deferredSkipped` to `rpc-layer-api.md`.

**3. `architecturePaths.currentArchitecture` returns a state-tree-relative path, not a filesystem path**
The RPC layer returns `epics/${epic}/architecture` (relative to the state tree). Other result types (`PathReferences` in `BeginResult`, `SubmitResult`) are documented as absolute filesystem paths. For the LLM to use these paths, they must be resolvable. The Commands layer will likely resolve them against `projectDir`, but the spec is silent on this.
File: `src/core/rpc/complete.ts:219`
Resolution: Either have the RPC layer return absolute paths (using `projectDir`), or explicitly document in `rpc-layer-api.md` that these are project-relative paths requiring resolution by the Commands layer.

**4. Redundant `getJson` calls in `buildSliceCompleteResult`**
`oldSlice` (line 133) and `newSlice` (line 134) are fetched up front, then the same data is re-fetched into `sliceJson` (line 155, used only as an existence guard — `oldSlice` would suffice) and `newSliceData` (line 215 — identical to `newSlice`). These duplicate reads add confusion about which variable is canonical.
File: `src/core/rpc/complete.ts:155, 215`
Resolution: Remove the two redundant fetches; reuse `oldSlice` for the existence guard and `newSlice` for the line-215 usage.

---

## Minor

**5. Misleading comment in state machine about RPC `ts` injection**
`slice-complete.ts:110` says "Each delta arrives with ts already injected by the RPC layer", but the very next line (`ts: event.ts`) shows the state machine is the one injecting `ts`. The RPC layer passes `ArchitectureDeltaInput[]` without `ts`.
File: `src/core/state/transitions/slice-complete.ts:110`
Resolution: Change comment to "Inject ts from event timestamp".

**6. `deferredSkipped` detection couples to untyped activity log string**
`buildSliceCompleteResult` derives `deferredSkipped` by filtering activity log entries for `entry.phase === "deferred-skip"` (line 189). This string is not a shared constant or typed value. If the state machine changes this string, the RPC layer silently returns wrong counts. `Record<string, unknown>` for log entries provides no compile-time safety.
File: `src/core/rpc/complete.ts:189`
Resolution: Extract `"deferred-skip"` to a shared constant (or a typed activity entry discriminant) to make the coupling explicit and safe.

**7. Architecture delta `ts` injection location differs from plan description**
The plan's task 2 describes "`ts` injection" as an RPC-layer task, but injection actually happens in the state machine. Functionally correct; the plan description and the state machine comment are both misleading. (Covered by item 5 for the comment; this item tracks the plan description discrepancy for documentation purposes only — no code change needed.)

---

## Strengths

- Correct 4-layer architecture: RPC orchestrates State Machine + Data Layer without owning transition logic.
- Consistent `loadState -> reduce -> commitState -> buildResult` pattern across all handlers.
- `slice-submit.ts` refactoring eliminates all `!` assertions with proper `isStateError()` narrowing.
- `noUncheckedIndexedAccess` compliance evident (line 175 `d !== undefined` guard).
- End-to-end tests use real filesystem I/O (no mocking), consistent with existing test patterns.
- `TODO(slice-05)` comment for quest helper consolidation correctly deferred.
