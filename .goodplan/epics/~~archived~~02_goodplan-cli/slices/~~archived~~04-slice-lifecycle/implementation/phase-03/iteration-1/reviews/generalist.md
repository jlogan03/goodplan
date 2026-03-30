# Phase 03: RPC Layer Wiring — Generalist Review

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Phase 3 successfully wires slice lifecycle operations through the RPC layer. All plan tasks are completed: `begin()` handles slice-specific BeginPhase values (create, plan, refine-plan, implement, abandon), `complete()` handles slice targets with full CompleteInput payload support including deferred routing/learnings/architecture deltas, `BeginPayloadMap` is extended with runtime validation, `buildBeginResult` and `buildCompleteResult` handle slice targets, `CompleteResult` type is extended with optional fields, and comprehensive tests cover all specified scenarios. The state machine refactoring (slice-submit.ts using shared helpers, removing `!` assertions) is clean and well-executed. Build passes, 460 tests pass, biome clean.

## Plan Adherence

All 7 plan tasks are completed and checked off. The implementation matches the plan specification closely:
- `begin()` maps all 5 slice BeginPhase values to correct state events
- `complete()` coerces undefined arrays to `[]` per spec
- `BeginPayloadMap` has `epic?: string` and `goal?: string` with runtime validation throwing `VALIDATION_INVALID_INPUT`
- `buildBeginResult` reads old/new Slice from state tree
- `buildCompleteResult` derives epicComplete, deferredRouted, deferredSkipped, learningsRolledUp, architecturePaths
- `CompleteResult` extended with all optional fields from plan
- Unit tests cover all specified scenarios

## Findings

### Important

1. **CompleteResult.deferredRouted type diverges from rpc-layer-api.md spec** — The architecture spec defines `deferredRouted` as `{ item: DeferredItem; target: string }[]` (each entry wraps the item with an explicit target field). The implementation uses `DeferredItem[]` directly (the `DeferredItem` type already contains `targetSlice`). The plan explicitly notes this tradeoff ("each `DeferredItem` already contains `targetSlice: string`, so no separate `target` field is needed"), so this is a deliberate deviation. However, the architecture doc should be updated to match the implementation, or vice versa, to prevent future confusion. The current approach is arguably better (avoids redundancy), but the spec drift should be tracked.

### Minor

2. **Redundant slice read in buildSliceCompleteResult** — At line 155 of `complete.ts`, `sliceJson` is read from `oldState` using the same path as `oldSlice` (line 133). The variable `sliceJson` is only used for the `undefined` check at line 159, but `oldSlice` already serves this purpose. This is a minor readability issue, not a correctness bug — both variables hold the same data.

3. **Architecture delta comment slightly misleading** — Line 459 of `slice-complete.ts` (state machine) says "Each delta arrives with ts already injected by the RPC layer", but the very next line overwrites `ts` with `event.ts`. The RPC layer does not actually inject `ts` into deltas before the event — the state machine handler does it. The comment should say "Inject ts from event timestamp" instead.

## Integration & Reuse

- Excellent reuse of shared helpers from `helpers.ts` — `getSlice`, `guardSliceStatus`, `setSliceStatus`, `setSliceJson`, `updateSliceOverviewStatus`, `isSliceTerminal` are used consistently across all new handlers
- `slice-submit.ts` refactored to use shared helpers, eliminating all `!` non-null assertions (replaced with `isStateError()` narrowing)
- `TODO(slice-05)` comment for quest helper consolidation is present as planned
- RPC layer follows the established loadState -> reduce -> commitState -> buildResult pattern exactly
- Tests exercise the full end-to-end RPC flow (filesystem I/O, state machine, commit) rather than mocking, which matches the existing test patterns in `begin.test.ts` and `submit.test.ts`

## Test Coverage

Tests are thorough and cover all plan-specified scenarios:
- begin: create slice, plan, abandon, validation errors (missing epic, missing goal)
- complete: happy path with full payload, verification failure, deferred routing to existing/nonexistent targets, epicComplete detection (true/false), learnings rollup (epic-only, project, no rollup), architecture deltas, undefined array coercion
- Error propagation from state machine to GoodplanError verified
