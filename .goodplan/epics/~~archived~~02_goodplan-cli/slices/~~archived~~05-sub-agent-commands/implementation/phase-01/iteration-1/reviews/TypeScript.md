# TypeScript Review — Phase 1: Quest Types & Helpers

## Issues

**[IMPORTANT]** Quest submit handlers skip overview sync by using `setQuestJson` instead of `setQuestStatus`
The consolidation moved quest helpers to `helpers.ts` and added a new `setQuestStatus` function that bundles status change + timestamp + overview sync (matching `setSliceStatus`). However, the existing quest submit handlers in `slice-submit.ts` still call `setQuestJson` directly with manual status/timestamp spreads. This means quest status changes from `COMPLETE_QUEST_PLAN`, `COMPLETE_QUEST_REFINEMENT_ROUND`, and `COMPLETE_QUEST_IMPLEMENTATION` do not sync `quests/overview.json`. The slice handlers correctly use `setSliceStatus` for overview sync. The quest handlers should be updated to use `setQuestStatus` to maintain consistency and fix the missing overview sync.
File: src/core/state/transitions/slice-submit.ts:178 (and lines 226, 243, 267)
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Placeholder handlers ignore both parameters
The `notImplementedError` constant is used as `() => notImplementedError`, discarding both `state` and `event` parameters. The `satisfies` check passes because the handler type allows any function returning `ProjectState | StateError`, and a zero-parameter function is assignment-compatible. This works correctly but is slightly unusual. An alternative like `(_state: ProjectState, _event: StateEvent) => notImplementedError` would be more explicit about the contract. Not blocking since these are temporary placeholders.
File: src/core/state/reduce.ts:92-100
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `QuestStatus` import in `slice-submit.ts` is now unused
After the refactor, `QuestStatus` is imported on line 1 of `slice-submit.ts` but no longer directly referenced in the file body (the guard functions in `helpers.ts` handle the status type). TypeScript's `verbatimModuleSyntax` is enabled in `tsconfig.json` and this is a `type` import, so it won't cause a runtime issue, but it is dead code.
File: src/core/state/transitions/slice-submit.ts:1
Resolution: CODEBASE_EXPLORATION

## Score: 8/10

Solid implementation of the type additions, helper consolidation, and `guardQuestStatus` upgrade. The new quest event types correctly mirror the slice pattern (required arrays on events, optional at RPC boundary). The `satisfies` exhaustiveness check and test coverage for all 35 events are well done. The overview sync gap is the main issue preventing a higher score -- fixing the quest submit handlers to use `setQuestStatus` (like slices use `setSliceStatus`) would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
