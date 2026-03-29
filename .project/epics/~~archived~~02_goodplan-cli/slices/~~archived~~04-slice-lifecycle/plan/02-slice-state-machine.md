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

- [ ] Create `src/core/state/transitions/slice-create.ts` — CREATE_SLICE handler. Creates `slices/<name>/slice.json` (with goal, status: created, epic reference, empty deferred array, refinement: null, created/updated from ts). Creates `slices/<name>/` directory structure. Updates `slices/overview.json` (adds item). Appends to `epics/<epic>/epic.json` sliceSequence array. Appends activity-log entry. Guard: slice name must not already exist. Use the same helper patterns from epic-create (setEntry for directories, updateOverviewStatus equivalent for slices).
- [ ] Create `src/core/state/transitions/slice-plan.ts` — BEGIN_PLAN handler. **Sequential enforcement guard**: check `slices/overview.json` items — if this isn't the first slice, the previous slice (by sliceSequence order in epic.json) must have status `completed` or `abandoned`. If not → STATE_SLICE_NOT_READY with detail including the blocking slice name. Sets `project.json` activeSlice. Sets slice status to `planning`. Appends activity-log.
- [ ] Create `src/core/state/transitions/slice-implement.ts` — BEGIN_REFINEMENT handler: unconditional from `plan-created`, sets `refining`, initializes refinement field `{ round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] }`. BEGIN_IMPLEMENTATION handler: guard `hasChild(state, "slices/<name>", "plan-refined.md")` — STATE_CONTENT_MISSING if absent. Sets `implementing`. Both append activity-log and set activeSlice. Note: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION already implemented in slice 03's `slice-submit.ts`.
- [ ] Create `src/core/state/transitions/slice-complete.ts` — COMPLETE_SLICE handler (the most complex handler in the system):
  1. **Guard**: status == implementation-complete AND verificationPassed == true. If verificationPassed == false → STATE_VERIFICATION_FAILED.
  2. **Deferred routing**: for each item in `event.deferred`, find the target slice by name in `slices/overview.json`, append to its `slices/<target>/slice.json` deferred array. If target doesn't exist → skip silently (target may be defined later).
  3. **Learnings**: write `event.learnings` to `slices/<name>/learnings.jsonl` (per-slice). For each learning with `rollupTo` containing `"epic"`, also append to `epics/<epic>/learnings.jsonl`. For `"project"`, append to top-level `learnings.jsonl`. The Learning entries need `source` field populated from the slice scope.
  4. **Architecture deltas**: write `event.architectureDelta` to `slices/<name>/architecture-deltas.jsonl`. Inject `ts` from event.ts on each delta.
  5. **Status**: set slice to `completed`, update overview.
  6. **Clear activeSlice**: set `project.json` activeSlice to null.
  7. **epicComplete detection**: after completing, check all sibling slices in the epic (via slices/overview.json). If ALL are completed or abandoned → return `epicComplete: true` in the result state (flag it via a marker in the state tree or a property the RPC layer can detect).
  8. **learningsRolledUp**: count how many learnings were rolled up to epic and project levels.
- [ ] Create `src/core/state/transitions/slice-abandon.ts` — ABANDON_SLICE handler. Guard: status is non-terminal (not completed, not abandoned). Sets abandoned, records reason. Clears activeSlice if this was the active slice. Appends activity-log.
- [ ] Replace Phase 1's placeholder stubs in `reduce.ts` handler record with real handler imports.
- [ ] Export transition tables from each handler file as typed arrays (matching slice 03 pattern).
- [ ] Add shared helpers to `helpers.ts` as needed: `getSlice(state, name)`, `guardSliceStatus(state, name, validStatuses)` returning `Slice | StateError`, `updateSliceOverviewStatus(state, name, newStatus)`, `setSliceJson(state, name, slice)`.
- [ ] Write unit tests organized by handler file:
  - slice-create: CREATE_SLICE produces slice.json + overview update + sliceSequence update + activity log. Duplicate name guard.
  - slice-plan: BEGIN_PLAN sequential enforcement — first slice succeeds, second blocked by incomplete first, second succeeds after first completed/abandoned.
  - slice-implement: BEGIN_REFINEMENT initializes refinement field. BEGIN_IMPLEMENTATION guards plan-refined.md existence.
  - slice-complete: COMPLETE_SLICE happy path (deferred routed, learnings appended, architectureDelta recorded, status completed, activeSlice cleared). verificationPassed: false → error. Deferred to nonexistent target → skip. epicComplete: true when all siblings done. learningsRolledUp counts.
  - slice-abandon: from various non-terminal states, terminal → error, clears activeSlice if active.
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes with comprehensive coverage. `grep -r "from.*fs" src/core/state/` returns nothing. Full lifecycle exercisable through reduce() directly.
