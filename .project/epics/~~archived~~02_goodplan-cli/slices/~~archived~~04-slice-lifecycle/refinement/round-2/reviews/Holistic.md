# Holistic Review: Slice Lifecycle Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 2 slice-complete deferred routing has a return-channel problem for deferredSkipped/deferredRouted counts

Phase 2 task 4 step 2 says "The RPC layer should include a `deferredSkipped` count in the result so callers know items were dropped." But the state machine is pure and returns `ProjectState | StateError` -- there is no channel for returning metadata like counts alongside the new state. The plan says Phase 3 `buildCompleteResult` derives `deferredRouted` from the new state, but deriving *skipped* count requires comparing what was requested vs what landed. The state machine cannot "log a warning in the activity log" about skipped items and also provide a count to the RPC layer without one of: (a) encoding the skip count in the state tree (e.g., a transient metadata field), (b) the RPC layer independently re-checking which deferred items landed by scanning target slice deferred arrays before and after reduce, or (c) having the state machine activity log entry include structured skip data that the RPC layer parses back out.

Option (b) is cleanest -- the RPC layer already has both old and new state. But the plan does not specify this mechanism. The implementer would have to invent it.

**Fix:** In Phase 3 task 5 (`buildCompleteResult`), specify that `deferredRouted` count is derived by comparing old vs new deferred arrays on target slices (the RPC layer has both `oldState` and `newState`). Skipped items are those where the target slice doesn't exist in the new state's deferred arrays. Remove the phrase "The RPC layer should include a `deferredSkipped` count" from Phase 2 (the state machine phase) since that's an RPC concern.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `learningsRolledUp` count has the same return-channel problem

Phase 2 task 4 step 8 says "learningsRolledUp: count how many learnings were rolled up to epic and project levels." Like deferredSkipped, the state machine has no channel for this metadata. The plan acknowledges epicComplete detection was moved to RPC (step 7), but learningsRolledUp counting is still described in Phase 2 (state machine) rather than Phase 3 (RPC).

**Fix:** Move the `learningsRolledUp` counting to Phase 3 `buildCompleteResult`, derived by comparing old vs new learnings.jsonl at epic and project levels. Phase 2 should only write the learnings entries; Phase 3 counts them.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 e2e walkthrough step 3 is hand-wavy about epic activation setup

Step 3 says "Set up epic for activation: `goodplan epic:explore --epic my-epic`, `goodplan submit-explore --epic my-epic`, etc. through full phase chain to `slices-refined`. Add verification, activate." This is ~10 commands collapsed into "etc." An implementer performing manual verification would need to know every command in the chain. The epic activation prerequisites are non-trivial (explore, define-architecture, define-slices, refine-slices, add-verification, activate).

**Fix:** Expand step 3 to list every command required to get the epic to `activated` status. This is a verification walkthrough -- it must be concrete and reproducible. At minimum, list: `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-slices` (with passing scores or `--override`), `epic:add-verification`, `epic:activate`. Include the required file-writes (e.g., writing stub plan.md files if needed by guards).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "before" checks could be more precise

The "before" checks use `grep "CREATE_SLICE" src/schemas/state-events.ts` and `grep "learningSchema" src/schemas/`. The first is good. The second searches for `learningSchema` but the plan creates `learningInputSchema` -- the before-check should search for `learningInputSchema` to be falsifiable against the specific artifact being created. Currently `learningEntrySchema` already exists in `src/schemas/records/learning.ts`, so a broader grep could match.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `slice:create` command calls `begin('create', ...)` but `begin()` is synchronous

The existing `epicCreateCommand` calls `await begin(...)` despite `begin()` being synchronous (returns `BeginResult`, not `Promise<BeginResult>`). The plan follows the same pattern by convention, which is fine. But Phase 4 task 1 says "Calls `begin('create', {type:'slice', name}, {name, goal, epic})`" -- the second positional arg to `begin()` is `target`, and the third is `payload`, but `target` should be `{type:'slice', name: input.name}` (the `name` is on the target, not the payload). The payload should be `{name: input.name, goal: input.goal, epic}`. This is consistent with the existing `epicCreateCommand` pattern but worth clarifying since the plan's shorthand is ambiguous.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `slice-create.ts` references "Creates `slices/<name>/` directory structure" without specifying what directories

The epic-create handler creates 4 subdirectories (architecture, research, brainstorm, prototypes). The plan for slice-create says "Creates `slices/<name>/` directory structure" but doesn't enumerate which subdirectories a slice gets. The `data-model.md` should be the source of truth here. Without specifying, the implementer has to look it up independently.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** No explicit documentation update task for `state-machine-api.md` beyond the Phase 1 note

Phase 1 mentions updating `state-machine-api.md` to add `goal` to CREATE_SLICE, but Phase 5 (which handles docs updates via conventions.md) does not include a task to verify `state-machine-api.md` is fully updated with all 6 new events and their payloads after implementation. The architecture doc should match the implementation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong improvement from round 1 (7/10). The major issues from round 1 (shared-records.ts, guard helper pattern, BeginPayloadMap, slice:create input pattern, buildBeginResult/buildCompleteResult gaps) are all addressed. The remaining issues are about metadata count derivation mechanisms (the state machine cannot return sideband data, so the RPC layer must derive counts -- the plan describes this for epicComplete but not for deferredRouted/learningsRolledUp), and the e2e walkthrough specificity. To reach 9+: fix the count derivation placement (move to Phase 3), expand the e2e walkthrough step 3.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
