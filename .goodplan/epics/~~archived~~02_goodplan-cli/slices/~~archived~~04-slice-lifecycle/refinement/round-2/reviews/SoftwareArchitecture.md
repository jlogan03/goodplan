## Issues

**[IMPORTANT]** Phase 2 COMPLETE_SLICE atomicity: deferred routing to nonexistent target has unclear state machine behavior

Phase 2 task 4, step 2 says: "If target doesn't exist -> skip the item but log a warning in the activity log (per INV-007: no silent errors). The RPC layer should include a `deferredSkipped` count in the result so callers know items were dropped." This is good -- the warning-instead-of-silent-skip was a round-1 improvement. However, there is a subtlety: the state machine is pure and returns `ProjectState | StateError`. If a deferred item targets a nonexistent slice, the handler must still succeed (returning the new ProjectState), but it needs to encode both the warning and the skip count somewhere the RPC layer can read.

The plan says the RPC layer provides `deferredSkipped` in the result, but how does the RPC layer know which items were skipped? The state machine handler processes deferred items and either appends them to target slices or skips them. The RPC layer would need to diff the old and new states to count how many deferred items were actually routed vs how many were in the input. This is feasible but the plan should specify the mechanism: the RPC layer counts how many target slices in `event.deferred` actually have new items in the new state compared to old state, or alternatively, the state machine writes the skip count to the activity log entry where the RPC layer can read it.

The simpler approach: the RPC layer iterates `input.deferred`, checks each `targetSlice` against `slices/overview.json` in the new state, and counts matches. Since the state machine already did the routing, the RPC layer is just re-deriving the count from the committed state -- consistent with how `epicComplete` is derived.

Fix: Specify in Phase 3 (RPC Layer Wiring) how `buildCompleteResult` derives `deferredSkipped` or `deferredRouted` count. Recommend: RPC layer counts items where targetSlice exists in the new state's `slices/overview.json`. This avoids coupling between the state machine's internal routing logic and the RPC result builder.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 COMPLETE_SLICE learnings persistence: `source` field injection not clearly owned

Phase 2 task 4, step 3 says: "The Learning entries need `source` field populated from the slice scope." The `learningEntrySchema` requires `source: z.string().min(1)` and `rollup: z.boolean()`. The input schema (`learningInputSchema` from Phase 1) omits these fields. But the state machine is pure -- it cannot know the "slice scope" string format without it being passed in.

Looking at the event definition in `state-machine-api.md`: `COMPLETE_SLICE` carries `learnings: Learning[]` where `Learning` is the *input* type (no `source`, no `rollup`). The state machine handler writes to `slices/<name>/learnings.jsonl`, so it knows the slice name and can construct `source: "slices/<name>"`. The `rollup: boolean` field is `rollupTo.length > 0`.

This works architecturally (the state machine has all the information it needs), but the plan should be explicit that the state machine handler transforms `LearningInput[]` to `LearningEntry[]` by injecting `source` (from the slice name in the event) and `rollup` (derived from `rollupTo.length > 0`). This is a non-trivial transformation that belongs in the state machine (since it's pure data transformation, no I/O), and the plan should specify it clearly to avoid the implementor putting this logic in the RPC layer.

Fix: In Phase 2 task 4 step 3, explicitly state: "Transform each `LearningInput` to `LearningEntry` by adding `source: \`slices/${event.slice}\`` and `rollup: learning.rollupTo.length > 0`. Write the full `LearningEntry[]` to the JSONL file."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `BeginPayloadMap["create"]` change makes `goal` required for project init

Phase 3 task 3 changes `create` from `{ name: string; goal?: string }` to `{ name: string; goal: string; epic?: string }`. This makes `goal` required for all `create` calls, including `begin('create', {type:'project'}, {name, goal})`. Looking at the current `buildCreateEvent` for project: `{ type: "INIT_PROJECT", name: payload.name, ts }` -- it ignores `goal`. The `INIT_PROJECT` event doesn't carry a `goal` field.

This means project init callers will now need to pass a `goal` string that gets silently discarded. Check `src/commands/global/init.ts` to see if it currently passes `goal`. If it doesn't, this is a breaking change to the init command. The plan should either: (a) keep `goal` optional in the payload type and validate at runtime per target type, or (b) accept that project init callers pass a dummy goal string.

Looking at the existing epic:create command, it already validates `goal` is present via `createEpicInputSchema`. The runtime validation in `buildCreateEvent` for epic (`if (payload.goal === undefined)`) would become dead code if `goal` is required at the type level, which is fine -- belt and suspenders. But the project init path needs attention.

Fix: Verify that `init.ts` currently passes a `goal` value to `begin('create', ...)`. If it does not, this change breaks it. Consider keeping `goal` as `goal?: string` in the payload map but adding runtime validation for epic/slice targets, or make init pass an empty/placeholder goal.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 2 slice overview update helper naming inconsistency

Phase 2 task list proposes `updateSliceOverviewStatus(state, name, newStatus)` as a new helper. The existing helper is `updateOverviewStatus(state, epicName, newStatus)` which operates on `epics/overview.json`. The naming suggests these are parallel, but they operate on different overview files (`epics/overview.json` vs `slices/overview.json`). The plan should either: (a) rename the existing helper to `updateEpicOverviewStatus` for clarity and make both names parallel, or (b) make a generic helper that takes the overview path. Option (a) is a minor rename that improves readability. Option (b) is over-engineering since the two overview files may evolve differently.

This is cosmetic but affects code readability when both helpers are used in the same file (e.g., COMPLETE_SLICE handler might touch both if epicComplete triggers epic-level changes).

Fix: No action needed -- the naming is acceptable. But if the implementor notices confusion during Phase 2, consider renaming `updateOverviewStatus` to `updateEpicOverviewStatus` for disambiguation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 e2e walkthrough step 12 circuit breaker test is expensive

Phase 5 step 12 says "submit maxRounds (10) rounds with below-threshold scores -> STATE_MAX_ROUNDS_REACHED". This means the e2e test script needs to loop 10 times through `submit-refinement` to hit the circuit breaker. While correct, this is slow for an e2e verification script. The unit tests in Phase 2 already cover the circuit breaker logic exhaustively. For e2e, consider reducing the loop or noting that the implementor can verify this via unit tests alone and do a lighter e2e check (e.g., verify the error code is correct after reaching max rounds, without necessarily doing all 10 rounds in the e2e script -- perhaps by setting up state directly).

This is a minor efficiency concern, not a correctness issue.

Fix: No change needed -- the plan is correct. The implementor may choose to optimize the e2e test.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The round-1 issues have been comprehensively addressed. The plan now correctly: reuses existing schemas and creates input variants alongside them, commits to the `BeginPayloadMap` shape with `goal: string` and `epic?: string`, standardizes on `--epic` flag (not stdin) for slice:create, specifies epicComplete detection in the RPC layer, and includes the `slice-submit.ts` refactoring task. The two remaining IMPORTANT issues are about specifying mechanisms that are implied but not explicit -- how the RPC layer derives `deferredRouted`/`deferredSkipped` counts, and how `LearningInput` transforms to `LearningEntry` in the state machine. These are implementation-detail-level clarifications that would prevent friction during implementation. The MINOR issues are cosmetic or efficiency-related. To reach 10/10: add the two mechanism clarifications and verify the `goal` required change doesn't break project init.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
