# Merged Review — Phase 01: Quest Types & Helpers

**Scores:** Generalist 9/10 | SoftwareArchitecture 8/10 | TypeScript 8/10

## Overall Assessment

Clean, well-structured phase. Helper consolidation follows established patterns exactly. The `guardQuestStatus` upgrade to return `Quest | StateError` (eliminating `quest!` non-null assertions) is the most impactful change. All plan tasks completed: 6 new quest events, `STATE_QUEST_ALREADY_ACTIVE` error code, `CompleteInput` extension, helper consolidation, placeholder handlers with exhaustiveness via `satisfies`, and test coverage for all 35 events.

## Issues

### Important (1)

**Quest submit handlers skip overview sync — use `setQuestStatus` instead of `setQuestJson`.**
_(Flagged by all three reviewers. SoftwareArchitecture provides the most actionable fix.)_

`handleCompleteQuestPlan`, `handleCompleteQuestRefinementRound`, and `handleCompleteQuestImplementation` in `slice-submit.ts` (lines 178, 226, 243, 267) still call `setQuestJson()` directly with manual status/timestamp spreads. The newly added `setQuestStatus()` bundles status + `updated` timestamp + overview sync — exactly mirroring `setSliceStatus()` which all slice handlers use. As a result, quest status changes do NOT sync `quests/overview.json`, while slice and epic status changes do. This will cause `quests/overview.json` to drift.

**Fix:** Replace direct `setQuestJson` calls with `setQuestStatus(state, event.quest, questOrErr, "<newStatus>", event.ts)`. For the refinement handler's compound update (status + refinement field), pass the merged entity: `setQuestStatus(state, event.quest, { ...questOrErr, refinement: finalRefinement }, "plan-refined", event.ts)` — matching how `handleCompleteRefinementRound` for slices spreads extra fields before calling `setSliceStatus`. Also remove the now-unused `QuestStatus` type import from `slice-submit.ts` (line 1) once callers are migrated.

This is pre-existing behavior (handlers predate `setQuestStatus`), so not blocking this phase, but should be resolved before or during phase 2 when new quest lifecycle handlers are added.

### Minor (2)

**Placeholder handlers discard parameters.**
_(TypeScript reviewer; corroborated by SoftwareArchitecture on the shared-reference risk.)_

`() => notImplementedError` in `reduce.ts` (lines 92–100) discards both `state` and `event` parameters. This is valid TypeScript (zero-parameter functions are assignment-compatible with the handler type) and works correctly. Two related concerns:

1. Explicitness: `(_state: ProjectState, _event: StateEvent) => notImplementedError` would make the contract clearer. Low priority since these are temporary placeholders.
2. Shared mutable reference: all 6 placeholders return the same `const` object. Safe today since no caller mutates the returned error, but consider `Object.freeze(notImplementedError)` as a guard against accidental future mutation.

**`CREATE_QUEST` uses `name` field; other quest events use `quest`.**
_(Generalist only; documented as intentional.)_

This matches the `CREATE_SLICE` / other-slice-events convention and requires no action. Documented here for future implementers.
