# TypeScript Domain Review -- Phase 1: create-side-quest Pipeline

## Issues

### [IMPORTANT] Unused imports in `submit-explore.ts`

**File:** `src/commands/subagent/submit-explore.ts` lines 6, 9-10

Three imports are no longer used after the refactor: `submitExploreInputSchema`, `readStdin`, and `validateInput`. The command now performs mutual-exclusivity validation inline via `GoodplanError` instead of via `validateInput(submitExploreInputSchema, ...)`. With `verbatimModuleSyntax: true`, these are value imports that pull in runtime modules for no reason. They don't cause a build error (Bun's bundler tree-shakes them), and `tsc --noEmit` passes because TypeScript allows unused imports -- but they violate the project's explicit import hygiene conventions and add dead module resolution.

**Resolution:** Remove the three unused imports. The `submitExploreInputSchema` is still used in `schema.ts` for command metadata, so it does not become orphaned.

### [MINOR] Inconsistent validation approach between `start-explore` and `submit-explore`

**File:** `src/commands/subagent/start-explore.ts`, `src/commands/subagent/submit-explore.ts`

Both commands now validate mutual exclusivity of `--epic`/`--quest` using an inline `GoodplanError` check. However, `submit-explore.ts` still imports the Zod schema `submitExploreInputSchema` (which has its own `.refine()` for the same constraint) but never calls it. Meanwhile `start-explore.ts` never imported a Zod schema (it didn't have one before, and correctly doesn't now).

The mismatch is cosmetic (both commands work correctly), but the dead Zod schema import in `submit-explore` suggests the refactor was incomplete. See IMPORTANT issue above.

**Resolution:** Addressed by removing the unused imports noted above.

### [MINOR] `exploreQuestSources` duplicates `completed-epics` and `completed-quests` keys pointing to same path

**File:** `src/core/context/priorities.ts` lines 88-89

Both `completed-epics` and `completed-quests` entries resolve to `"overview.json"` with `sourceType: "markdown"`. This mirrors the existing `exploreEpicSources` pattern (lines 78-79), so it is consistent -- but both the epic and quest variants will load the same file twice under different keys. This is not a bug (the context system deduplicates or handles this gracefully), but worth noting as a potential optimization target.

**Resolution:** No action required for this phase. Consistent with existing pattern.

### [MINOR] Import ordering in `quest-explore.ts`

**File:** `src/core/state/transitions/quest-explore.ts` lines 1-2

The `import type { QuestStatus }` sits above the JSDoc block comment for the module, while the remaining imports follow the comment block. This is inconsistent with the pattern in `epic-phase.ts` where the JSDoc comment precedes all imports, and `quest-plan.ts` where the type import is above the comment but it reads oddly.

**Resolution:** Move the `QuestStatus` import below the JSDoc comment block, grouping it with the other imports. Low priority.

## Verified Correct

- **Type narrowing:** Mutual-exclusivity guard `(epicVal !== undefined) === (questVal !== undefined)` correctly handles both-provided and neither-provided cases. The `questVal!` non-null assertion after the guard is safe because the guard guarantees exactly one is defined.
- **Event schema consistency:** `BEGIN_QUEST_EXPLORE` and `COMPLETE_QUEST_EXPLORE` in `state-events.ts` match the shapes consumed by the transition handlers in `quest-explore.ts`.
- **Transition table completeness:** `questExploreTransitions` covers all valid transitions (created->exploring, created->explored skip path, exploring->explored). The `beginQuestPlanTransitions` correctly updated to accept both `created` and `explored`.
- **Guard function usage:** `guardQuestStatus` accepts `QuestStatus | QuestStatus[]` -- the array form `["created", "explored"]` used in both `handleCompleteQuestExplore` and `handleBeginQuestPlan` matches the function signature.
- **No `as any` or `@ts-ignore`:** None found in any changed or new file.
- **`tsc --noEmit` passes clean:** No type errors across the entire project.
- **All 543 fitness tests pass:** Including transition-completeness and state-machine-purity tests, confirming the new transitions integrate correctly with the existing state machine.
- **Schema updates:** `submitExploreInputSchema` correctly uses `.optional()` on both fields with a `.refine()` for mutual exclusivity. `questStatusSchema` correctly adds `exploring` and `explored` in the right position.
- **`getPriorityTable` signature change:** Adding optional `target` parameter is backward-compatible -- all existing callers that don't pass `target` get the same behavior.
- **`begin.ts` and `submit.ts` routing:** Quest-scoped explore correctly short-circuits before `requireEpicName()`, avoiding runtime errors.
- **`schema.ts` command registration:** `start-explore` and `submit-explore` entries correctly drop `required: true` from `epic` and add `quest` arg, maintaining INV-006.
- **`next-commands.ts`:** New `commandToEvent` entries for `quest:explore` and quest-scoped `submit-explore` correctly wire up event types and templates.

## Score: 9/10

## Summary

Critical: 0, Important: 1, Minor: 3

Clean implementation that follows established patterns faithfully. The one IMPORTANT issue is dead imports in `submit-explore.ts` -- a straightforward cleanup. All type checking passes, fitness tests pass, and the new state machine transitions are correctly wired end-to-end.
