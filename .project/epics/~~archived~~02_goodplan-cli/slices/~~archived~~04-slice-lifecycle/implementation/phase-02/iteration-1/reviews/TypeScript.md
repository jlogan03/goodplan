# TypeScript Review: Phase 02 — Slice State Machine Transitions

## Issues

**[IMPORTANT]** slice-submit.ts handlers do not sync slices/overview.json on status change
The `handleCompletePlan`, `handleCompleteRefinementRound`, and `handleCompleteImplementation` functions in `slice-submit.ts` use `setSliceJson()` directly, which only updates `slice.json`. They never call `updateSliceOverviewStatus()` or `setSliceStatus()`. Per project learnings ("Overview.json must be synced by every status-changing handler"), every status change must sync the overview. The new handlers in this phase (`slice-create.ts`, `slice-plan.ts`, `slice-implement.ts`, `slice-complete.ts`, `slice-abandon.ts`) correctly use `setSliceStatus()` or explicit `updateSliceOverviewStatus()` calls. The pre-existing `slice-submit.ts` handlers are now inconsistent and will leave `slices/overview.json` permanently showing the wrong status for slices transitioning through `planning -> plan-created -> refining -> plan-refined -> implementing -> implementation-complete`.
File: src/core/state/transitions/slice-submit.ts:84
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** handleBeginRefinement uses setSliceJson + updateSliceOverviewStatus instead of setSliceStatus
`handleBeginRefinement` in `slice-implement.ts` (lines 44-50) manually calls `setSliceJson()` then `updateSliceOverviewStatus()` as two separate steps. This works correctly but bypasses the `setSliceStatus()` helper that was specifically created to "prevent partial updates by bundling all status-change side effects." The separate calls exist because it also needs to set the `refinement` field, but `setSliceStatus` could be called after `setSliceJson` sets the refinement, or the pattern could be adjusted to use `setSliceStatus` with the pre-modified slice object.
File: src/core/state/transitions/slice-implement.ts:44
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Unused import: setEntry in slice-implement.ts
`setEntry` is imported from `../../tree.js` in `slice-implement.ts` but `setSliceJson` and `setSliceStatus` from helpers are used for slice mutations, and `setEntry` is only used for `project.json` updates. Actually, `setEntry` IS used for project.json writes on lines 38 and 88. Disregard — this is not an issue.

_Retracted: setEntry is used for project.json updates._

**[MINOR]** Unused import: updateSliceOverviewStatus in slice-implement.ts
`updateSliceOverviewStatus` is imported in `slice-implement.ts` line 18 but only used in `handleBeginRefinement`. `handleBeginImplementation` uses `setSliceStatus` which calls `updateSliceOverviewStatus` internally. This is fine — it's used, just only by one of the two handlers.

_Retracted: import is used._

## Score: 9/10

The implementation is clean, well-structured, and correct for all new handlers. Type safety is strong throughout — discriminated unions with `Extract`, proper `isStateError()` narrowing (following the `Entity | StateError` pattern from learnings), no `as any` or `@ts-ignore`. All transition handlers are pure (no I/O imports confirmed), and the test coverage is comprehensive with 39 passing tests covering happy paths, error paths, sequential enforcement, deferred routing, learnings rollup, and terminal state guards.

The one IMPORTANT issue (overview sync gap in pre-existing `slice-submit.ts`) is a real bug that affects data consistency. If this is addressed, the score would be 10/10. The code otherwise follows all conventions, respects all 7 invariants, and matches the transition tables precisely.

## Summary
- Critical: 0
- Important: 1
- Minor: 0
