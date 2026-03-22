# Phase 2: Slice State Machine Transitions

All slice transition handlers. Pure functions, no I/O. The most complex phase — COMPLETE_SLICE has the richest logic in the entire system (deferred routing, learnings rollup, epicComplete detection).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/transitions/slice-create.ts` — file not found
- [ ] `grep "CREATE_SLICE" src/core/state/reduce.ts` — matches only the placeholder stub from Phase 1

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/state/` — all state machine tests pass (existing + new)
- [ ] `grep -r "from.*fs" src/core/state/` — returns nothing (purity preserved)
- [ ] `npx tsc --noEmit` — passes

### Tasks

- [ ] Create `src/core/state/transitions/slice-create.ts` — CREATE_SLICE handler. Creates `slices/<name>/slice.json` (with goal, status: created, epic reference, empty deferred array, refinement: null, created/updated from ts). Creates `slices/<name>/` directory structure. Updates `slices/overview.json` (adds item with `epic` field set to the parent epic name — needed for `slice:list --epic` filtering). Appends to `epics/<epic>/epic.json` sliceSequence array. Appends activity-log entry. Guard: slice name must not already exist. Use the same helper patterns from epic-create (setEntry for directories, updateOverviewStatus equivalent for slices). Note: `overviewItemSchema` in `src/schemas/overview.ts` needs an optional `epic?: string` field added (Phase 1 scope, since it's a schema change).
- [ ] Create `src/core/state/transitions/slice-plan.ts` — BEGIN_PLAN handler. **Sequential enforcement guard**: check `slices/overview.json` items — if this isn't the first slice, the previous slice (by sliceSequence order in epic.json) must have status `completed` or `abandoned`. If not → STATE_SLICE_NOT_READY with detail including the blocking slice name. Sets `project.json` activeSlice. Sets slice status to `planning`. Appends activity-log.
- [ ] Create `src/core/state/transitions/slice-implement.ts` — BEGIN_REFINEMENT handler: unconditional from `plan-created`, sets `refining`, initializes refinement field `{ round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] }`. BEGIN_IMPLEMENTATION handler: guard `hasChild(state, "slices/<name>", "plan-refined.md")` — STATE_CONTENT_MISSING if absent. Sets `implementing`. Both append activity-log and set activeSlice. Note: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION already implemented in slice 03's `slice-submit.ts`.
- [ ] Create `src/core/state/transitions/slice-complete.ts` — COMPLETE_SLICE handler (the most complex handler in the system):
  1. **Guard**: status == implementation-complete AND verificationPassed == true. If verificationPassed == false → STATE_VERIFICATION_FAILED.
  2. **Deferred routing**: for each item in `event.deferred`, find the target slice by name in `slices/overview.json`, append to its `slices/<target>/slice.json` deferred array. If target doesn't exist → skip the item but log a warning in the activity log (per INV-007: no silent errors). Note: the state machine only writes the data; the RPC layer derives all counts (deferredRouted, deferredSkipped) in `buildCompleteResult` by comparing old vs new state — see Phase 3.
  3. **Learnings**: Transform each `LearningInput` to `LearningEntry` by adding `source: \`slices/${event.slice}\`` and `rollup: learning.rollupTo.length > 0`. Write the full `LearningEntry[]` to `slices/<name>/learnings.jsonl` (per-slice). For each learning with `rollupTo` containing `"epic"`, also append to `epics/<epic>/learnings.jsonl`. For `"project"`, append to top-level `learnings.jsonl`. Note: all `getJsonl()` calls must handle `undefined` with `?? []`, matching the existing `appendActivityLog` pattern in helpers.ts (JSONL files won't exist until first write).
  4. **Architecture deltas**: write `event.architectureDelta` to `slices/<name>/architecture-deltas.jsonl`. Each delta arrives with `ts` already injected by the RPC layer (Phase 3) — the state machine writes them as-is.
  5. **Status**: set slice to `completed`, call `updateSliceOverviewStatus` to sync `slices/overview.json` (INV: overview must be synced by every status-changing handler).
  6. **Clear activeSlice**: set `project.json` activeSlice to null.
  7. **epicComplete detection**: the state machine does NOT flag this directly (it returns `ProjectState | StateError` — no room for extra properties). Instead, the RPC layer's `buildCompleteResult` checks all sibling slices in the epic (via `slices/overview.json` in the new state) to derive `epicComplete`. This aligns with transition-tables.md "Implicit Transitions" which places detection in the RPC layer.
  8. Note: `learningsRolledUp` count is derived by the RPC layer in `buildCompleteResult` (Phase 3), not by the state machine.
- [ ] Create `src/core/state/transitions/slice-abandon.ts` — ABANDON_SLICE handler. Guard: status is non-terminal (not completed, not abandoned). Sets abandoned, records reason. Calls `updateSliceOverviewStatus` to sync `slices/overview.json` status to `abandoned`. Clears activeSlice if this was the active slice. Appends activity-log.
- [ ] Replace Phase 1's placeholder stubs in `reduce.ts` handler record with real handler imports.
- [ ] Export transition tables from each handler file as typed arrays (matching slice 03 pattern).
- [ ] Add shared helpers to `helpers.ts`: `getSlice(state, name)`, `guardSliceStatus(slice, name, validStatuses, eventType)` returning `Slice | StateError` (matching `guardEpicStatus` pattern — NOT the old `StateError | null` pattern), `updateSliceOverviewStatus(state, name, newStatus)`, `setSliceJson(state, name, slice)`, `setSliceStatus(state, name, slice, newStatus, ts)`. Note: `setSliceStatus` is intentional sugar over `setSliceJson` (mirrors `setEpicStatus` / `setEpicJson` pattern) — it bundles the status field update, overview sync, and `updated` timestamp in one call to prevent partial updates.
- [ ] Refactor `slice-submit.ts` to import shared helpers from `helpers.ts` — remove local `getSlice`, `guardSliceStatus`, `setSliceJson`. Update callers (`handleCompletePlan`, `handleCompleteRefinementRound`, `handleCompleteImplementation`) to use `isStateError()` narrowing on the `guardSliceStatus` return value (which IS the narrowed `Slice` on the success path), assigning the result directly (`const sliceOrErr = guardSliceStatus(...); if (isStateError(sliceOrErr)) return sliceOrErr; const slice = sliceOrErr;`) and removing all existing `slice!` non-null assertions in `slice-submit.ts`. Note: quest helpers (`getQuest`, `guardQuestStatus`, `setQuestJson`) remain in `slice-submit.ts` for now — consolidation into `helpers.ts` is deferred to slice 05 (quest lifecycle scope). Add a `// TODO(slice-05): consolidate quest helpers to helpers.ts` comment in `slice-submit.ts`.
- [ ] Write unit tests organized by handler file:
  - slice-create: CREATE_SLICE produces slice.json + overview update + sliceSequence update + activity log. Duplicate name guard.
  - slice-plan: BEGIN_PLAN sequential enforcement — first slice succeeds, second blocked by incomplete first, second succeeds after first completed/abandoned.
  - slice-implement: BEGIN_REFINEMENT initializes refinement field. BEGIN_IMPLEMENTATION guards plan-refined.md existence.
  - slice-complete: COMPLETE_SLICE happy path (deferred routed, learnings appended, architectureDelta recorded, status completed, activeSlice cleared). verificationPassed: false → error. Deferred to nonexistent target → skip. epicComplete: true when all siblings done. learningsRolledUp counts.
  - slice-abandon: from various non-terminal states, terminal → error, clears activeSlice if active.
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes with comprehensive coverage. `grep -r "from.*fs" src/core/state/` returns nothing. Full lifecycle exercisable through reduce() directly.
