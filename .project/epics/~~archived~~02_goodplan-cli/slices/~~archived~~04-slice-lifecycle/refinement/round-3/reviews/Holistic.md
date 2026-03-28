# Holistic Review — Slice Lifecycle Plan (Round 3)

## Issues

**[IMPORTANT]** Phase 2 slice-complete: overview update missing from the explicit step list

Phase 2's COMPLETE_SLICE handler lists 7 numbered steps but step 5 says "set slice to `completed`, update overview" as a single bullet. The `updateSliceOverviewStatus` helper is defined in the helpers task, but the COMPLETE_SLICE step list doesn't explicitly call it out as a separate operation the way CREATE_SLICE does ("Updates `slices/overview.json`"). This matters because overview sync is a documented learning ("Overview.json must be synced by every status-changing handler"). The step should explicitly name the helper call to prevent an implementer from only setting `slice.json` status and forgetting the overview.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 `BeginPayloadMap` expansion — `epic` field type mismatch with runtime validation

Phase 3 task 3 says to add `epic?: string` to the `create` key in `BeginPayloadMap`, keeping it optional so `INIT_PROJECT` doesn't break, then adding runtime validation for slice creation. However, Phase 4's `slice:create` command (task 1) calls `begin(projectDir, 'create', {type:'slice', name}, {name, goal, epic})` where `epic` comes from a required `--epic` flag. The type system allows callers to omit `epic` when creating a slice, and only a runtime check catches it. This is acknowledged as a "deliberate type-safety tradeoff" in the plan, which is acceptable, but the plan should note that the `epic` field absence error message should name the `--epic` flag (user-facing), not just say "epic is absent" (developer-facing). The existing `goal === undefined` error at `begin.ts:119` sets the precedent — match its style.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 ABANDON_SLICE — no overview status update mentioned

The ABANDON_SLICE task says "Sets abandoned, records reason. Clears activeSlice if this was the active slice. Appends activity-log." but does not mention updating `slices/overview.json` status to `abandoned`. Every other status-changing handler in the plan mentions the overview update. This is likely an omission in the description (the `setSliceStatus` helper bundles overview sync), but should be explicit to prevent confusion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 e2e walkthrough step 8 — writes plan-refined.md before refine-plan

Step 8 says: "`goodplan slice:refine-plan --slice 01-auth` -> refining. Write plan-refined.md ... then `echo ... | goodplan submit-refinement --slice 01-auth` -> plan-refined". The ordering is correct (refine-plan transitions to refining, then you write the refined plan, then submit-refinement scores it). However, the step text begins "Write plan-refined.md" right after the refine-plan command, which could be misread as writing the file before running refine-plan. Consider adding a clearer sentence break: "Transitions to refining. Write plan-refined.md to `.project/slices/01-auth/plan-refined.md`, then submit."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `slice:list` task mentions overviewItemSchema change already covered in Phase 1

Phase 4 task 2 (`slice:list`) contains the sentence: "Update `overviewItemSchema` in `src/schemas/overview.ts` to include optional `epic?: string`". Phase 1 task 4 already covers this exact change. The Phase 4 mention should be a reference ("uses the `epic` field added in Phase 1") rather than a duplicate instruction, to avoid confusion about whether it's done once or twice.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 helpers — quest helper consolidation decision not actionable

Phase 2's refactor task says: "quest helpers (`getQuest`, `guardQuestStatus`, `setQuestJson`) should also be consolidated into `helpers.ts` or flagged as deferred work for slice 05". This leaves the implementer to decide. Since this plan is for slice 04, the task should commit to one choice. Recommendation: flag as deferred (add a note in the overview or a comment in `slice-submit.ts`) since quest lifecycle is slice 05's scope.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

This is a well-structured, thorough plan at iteration 3. All previous critical and important issues have been resolved. The phasing is logical and follows the proven bottom-up pattern from slices 02-03. Success criteria are clear and testable. The e2e walkthrough is comprehensive — covering sequential enforcement, circuit breaker, deferred routing, epicComplete, and binary regression.

The two IMPORTANT issues are about explicitness rather than correctness — the underlying logic is right but the instructions could mislead an implementer on details (overview sync in COMPLETE_SLICE, user-facing error message for missing `--epic`). The MINOR issues are editorial. To reach 10/10: make the overview sync explicit in every status-changing step, and commit to a decision on quest helper consolidation.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
