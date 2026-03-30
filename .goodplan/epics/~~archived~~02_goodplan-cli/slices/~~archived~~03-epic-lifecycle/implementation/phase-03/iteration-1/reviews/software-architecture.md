# Software Architecture Review — Phase 03 (Epic State Machine Transitions)

## Issues

**[IMPORTANT]** Overview.json not updated on epic status changes after creation

`CREATE_EPIC` inserts an entry into `epics/overview.json` with `status: "created"`, but no subsequent handler (`ACTIVATE_EPIC`, `COMPLETE_EPIC`, `ABANDON_EPIC`, or any phase transition) updates the overview item's `status` or `completed` fields. The overview will permanently show `status: "created"` for every epic regardless of actual lifecycle state.

The architecture's State Key Dependencies table in `state-machine-api.md` does not list overview.json as a write target for these events, so this is consistent with the documented spec. However, this means `epic:list --json` (which reads overview.json) will return stale status information. If this is intentional (overview is rebuilt from entity files at read time, or updates are deferred to a later slice), it should be documented. If not, the lifecycle handlers need to update the overview entry.

File: src/core/state/transitions/epic-lifecycle.ts:60
Resolution: USER_INPUT

---

**[IMPORTANT]** `updated` timestamp not set on most epic transitions

`CREATE_EPIC` sets `updated: now` on the epic. `ACTIVATE_EPIC` sets `updated: now`. But all other epic transitions (BEGIN_EXPLORE, COMPLETE_EXPLORE, BEGIN_ARCHITECTURE, COMPLETE_ARCHITECTURE, etc.) use `setEpicStatus()` which spreads the existing epic and only changes `status`. The `updated` field never advances for 10+ transitions between creation and activation. The `appendActivityLog` helper uses `project.updated` as its timestamp source, which is also never updated after `INIT_PROJECT`.

This means: (a) activity log entries for phase transitions will all carry the INIT_PROJECT timestamp, and (b) the `epic.updated` field doesn't reflect when the epic was last modified.

Events that carry `ts` (CREATE_EPIC, ACTIVATE_EPIC) correctly inject it. Events without `ts` rely on `project.updated`, which stagnates. The RPC layer may handle this by updating `project.updated` before calling `reduce()`, but the state machine itself does not — and `appendActivityLog` on line 82 of helpers.ts reads from `project.updated`.

File: src/core/state/transitions/helpers.ts:82
Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Duplicate helper patterns between epic and slice/quest handlers

`getSlice`, `setSliceJson`, `guardSliceStatus`, `getQuest`, `setQuestJson`, `guardQuestStatus` in `slice-submit.ts` mirror the epic helpers in `helpers.ts` (`getEpic`, `setEpicJson`, `guardEpicStatus`). When slice lifecycle handlers arrive (slice 04) and quest lifecycle handlers (slice 05), these will need to be shared. Currently they are local to `slice-submit.ts`, which is fine for this phase but will require extraction.

File: src/core/state/transitions/slice-submit.ts:22
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `evaluateRefinement` returns `advance` when `refinement === null` and scores are below threshold

In `helpers.ts:144`, when `refinement` is null and scores don't meet the threshold and override isn't set, the function returns `{ action: "advance" }`. This handles the skip path (first round from a non-refining status like `architecture-defined` or `plan-created`). The logic is correct for the documented skip paths, but the comment says "No refinement state yet (skip path)" — it would be clearer to note that this implicitly means "scores below threshold but no refinement state initialized, so this must be a skip path entry point."

File: src/core/state/transitions/helpers.ts:143
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The Handler Map with `satisfies` exhaustiveness checking is well-implemented and ensures compile-time completeness. The layering is excellent: zero I/O imports confirmed, pure functions throughout, clean dependency direction. The shared refinement circuit breaker in `evaluateRefinement()` is a good deep module that centralizes complex logic. All 66 tests pass covering normal paths, skip paths, guard rejections, and circuit breaker behavior.

To reach 9+: resolve the `updated` timestamp propagation issue (activity log entries getting stale timestamps is a correctness concern) and clarify the overview.json staleness design decision.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
