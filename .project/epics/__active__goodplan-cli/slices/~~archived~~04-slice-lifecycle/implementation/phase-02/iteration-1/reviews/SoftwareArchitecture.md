# Software Architecture Review: Phase 02 — Slice State Machine Transitions

## Issues

**[IMPORTANT]** Slice submit handlers do not sync slices/overview.json on status change
The learnings document states "Overview.json must be synced by every status-changing handler." The new slice handlers (slice-plan.ts, slice-implement.ts, slice-complete.ts, slice-abandon.ts) correctly use `setSliceStatus()` which bundles the overview sync. However, the three slice submit handlers in `slice-submit.ts` — `handleCompletePlan`, `handleCompleteRefinementRound`, and `handleCompleteImplementation` — all use `setSliceJson()` directly and never call `updateSliceOverviewStatus()` or `setSliceStatus()`. This means transitions to `plan-created`, `plan-refined` (or staying in `refining`), and `implementation-complete` do not update `slices/overview.json`.

The refactoring of slice-submit correctly migrated from the old `StateError | null` guard pattern to `Entity | StateError`, but missed the overview sync that the new `setSliceStatus()` helper was designed to enforce.

Fix: Replace `setSliceJson()` calls in `handleCompletePlan`, `handleCompleteRefinementRound`, and `handleCompleteImplementation` with `setSliceStatus()` where the status is being changed. For `handleCompleteRefinementRound`'s "stay in refining" path (which also sets the `refinement` field), either call `setSliceStatus()` and then update the refinement separately, or call `setSliceJson()` followed by `updateSliceOverviewStatus()`.

File: src/core/state/transitions/slice-submit.ts:84
File: src/core/state/transitions/slice-submit.ts:121
File: src/core/state/transitions/slice-submit.ts:132
File: src/core/state/transitions/slice-submit.ts:150
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `handleBeginRefinement` and `handleBeginImplementation` write project.json activeSlice unnecessarily
Both handlers set `project.json.activeSlice` to the current slice. Per the transition table in `transition-tables.md`, only `BEGIN_PLAN` "Sets project.json activeSlice." The slice is already active from `BEGIN_PLAN` — these handlers re-write the same value. This is not incorrect behavior today, but it diverges from the documented spec and adds unnecessary writes. More importantly, if a future handler clears `activeSlice` between phases (e.g., on `COMPLETE_PLAN` or `COMPLETE_REFINEMENT_ROUND`), these handlers would re-set it, masking that design change.

The State Key Dependencies table lists `project.json` in the Writes column for `BEGIN_PLAN` but not for any other slice lifecycle event between `BEGIN_PLAN` and `COMPLETE_SLICE`.

Fix: Remove the `project.json` activeSlice write from `handleBeginRefinement` and `handleBeginImplementation`. The slice is already active from `BEGIN_PLAN` and stays active until `COMPLETE_SLICE` or `ABANDON_SLICE`.

File: src/core/state/transitions/slice-implement.ts:34
File: src/core/state/transitions/slice-implement.ts:84
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Quest handlers in slice-submit still use the old `StateError | null` + `!` assertion pattern
The research file flagged this as a key risk area: "slice-submit.ts local helpers use `StateError | null` guard pattern. New slice handlers should use `Entity | StateError` pattern per learnings." The slice handlers were correctly migrated, but the quest helpers (`guardQuestStatus`, `getQuest`, `setQuestJson`) still use the old pattern, resulting in 10+ `quest!` non-null assertions. The TODO comment `// TODO(slice-05): consolidate quest helpers to helpers.ts` acknowledges this is deferred to slice 05. This is acceptable as-is since quest lifecycle is a separate slice, but it creates a window where the two patterns coexist in the same file.

No fix needed now — this is tracked by the existing TODO.

File: src/core/state/transitions/slice-submit.ts:46
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `handleBeginRefinement` uses `setSliceJson` + `updateSliceOverviewStatus` instead of `setSliceStatus`
In `handleBeginRefinement`, the handler sets the status to `refining` and initializes the `refinement` field by calling `setSliceJson()` (line 44) followed by `updateSliceOverviewStatus()` (line 50). This is functionally correct, but the `setSliceStatus()` helper was specifically created to prevent partial updates by bundling status + updated + overview sync. The pattern here splits these concerns across two calls, which is fragile — a future editor could remove the overview sync call without realizing it's needed.

Fix: Use `setSliceStatus()` first to set status + ts + sync overview, then use `setSliceJson()` to add the `refinement` field. Or, extend `setSliceStatus` to accept optional extra fields. Either way, this is a minor consistency issue since the current code is functionally correct.

File: src/core/state/transitions/slice-implement.ts:44
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation is architecturally well-structured: clean module decomposition (one file per event domain), consistent use of the `Entity | StateError` guard pattern in new code, proper separation of concerns, and deep helper functions that bundle side effects (`setSliceStatus`). The test coverage is thorough with 39 tests covering happy paths, guards, cross-entity effects, and edge cases. All tests pass.

The main issue dragging the score down is the overview sync gap in slice-submit.ts — this violates a documented learning/invariant ("Overview.json must be synced by every status-changing handler") and creates silent data inconsistency between `slice.json` and `slices/overview.json` for four status transitions. This is an IMPORTANT issue because it affects the Data Layer's consistency contract and could cause stale data in `list` commands that read overview.json. Fixing the overview sync and removing the unnecessary activeSlice writes would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
