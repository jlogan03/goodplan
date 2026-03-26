# API Contract Review: Task Capture Plan (Round 3)

## Issues

**[MINOR]** `task:create` description says `previousStatus: null` but `BeginResult` type uses string

The Expected Behavior in Phase 2 says `task:create` returns `{ entity, phase: "create-task", previousStatus: null, newStatus: "open", paths: {} }`. However, `BeginResult.previousStatus` is typed as `string`, not `string | null`. The existing `buildBeginResult()` logic returns `"none"` (a string) when the entity does not yet exist (see `oldEpic?.status ?? "none"` pattern at line 321 of `begin.ts`). The plan's CONVERT_TASK handler in `buildBeginResult()` will follow the same pattern and produce `previousStatus: "none"` for creation. The Expected Behavior should say `previousStatus: "none"` instead of `previousStatus: null` to match the actual contract.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** CONVERT_TASK handler step 5 quest shape is missing `refinement` field

The plan says CONVERT_TASK step 5 creates a quest via `setEntry()` with `{ name, goal, status: "created", refinement: null, created: ts, updated: ts }`. This is correct and matches `questSchema` (which requires `refinement: refinementSchema.nullable()`). However, the epic shape listed in step 5 (`{ name, goal, status: "created", created: ts, updated: ts }`) is missing fields that `epicSchema` likely requires (e.g., `verifications`, `sliceSequence`, `activated`, `refinement`). Looking at `handleCreateEpic`, it creates `{ name, status: "created", goal, verifications: [], refinement: null, sliceSequence: [], created, activated: null, updated }`. The plan should specify the full epic shape to avoid a schema validation failure at `commitState` time (INV-005). The quest shape should also include that `goal` is derived from `task.title + (description ? ": " + description : "")` or similar — the concatenation format matters for the contract.

Resolution: DIRECTLY_ACTIONABLE

---

No issues found for the following previously-flagged areas (all resolved):
- BeginPhase naming: `"drop-task"` and `"convert-task"` now used consistently throughout
- `task:convert` input pattern: switched to all-flags, `taskConvertInputSchema` eliminated
- `task:list` filter field divergence: documented as intentional with rationale
- `taskCreateInputSchema.context` documentation: doc comment added explaining auto-population by `/capture` skill

## Score: 9/10

All CRITICAL and IMPORTANT issues from rounds 1 and 2 are resolved. The plan's API contracts are consistent with existing codebase patterns: `BeginPhase` naming follows the `"create-decision"` precedent, flag-only commands follow the `quest:abandon` pattern, stdin-based commands follow `quest:create`, schema registration covers INV-006, and the `Target` union exhaustive switch updates are comprehensively listed. The two remaining MINOR issues are documentation accuracy (Expected Behavior showing `null` vs `"none"`) and incomplete epic field specification in CONVERT_TASK. To reach 10: fix the `previousStatus` value in Expected Behavior and spell out the full epic shape in the CONVERT_TASK handler description.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
