# Software Architecture Review — Phase 1: create-side-quest Pipeline

## Issues

### [MINOR] Dead imports in `submit-explore.ts`

**File:** `src/commands/subagent/submit-explore.ts` (lines 6, 9, 10)

Three imports are no longer used after the refactor: `submitExploreInputSchema`, `readStdin`, and `validateInput`. The original code used Zod schema validation via `validateInput(submitExploreInputSchema, args, stdin)`, but this was replaced by an inline mutual-exclusivity guard using `GoodplanError`. The unused imports remain.

This is cosmetic but violates `verbatimModuleSyntax: true` expectations and would be caught by a linter. No architectural concern.

**Resolution:** Remove the three unused imports.

### [MINOR] Transition table missing error rows for `BEGIN_QUEST_EXPLORE`

**File:** `src/core/state/transitions/quest-explore.ts` (lines 71-79)

The `questExploreTransitions` array has 3 rows but does not include error-case rows. Comparing with `epic-phase.ts`, the epic explore transitions also omit explicit error rows — so this is consistent with the existing pattern. However, `quest-plan.ts` (line 73-76) does include `(error)` rows for its transitions. The inconsistency across quest transitions is minor but worth noting.

The `transition-completeness.test.ts` fitness function validates that every event in `handlerRecord` has a matching event in the collected transitions, and this test passes (543/543). So the omission does not break any invariant.

**Resolution:** Consider adding `(error)` rows for consistency with `quest-plan.ts`, but not required.

### [MINOR] `getPriorityTable` signature change widens the API surface

**File:** `src/core/context/priorities.ts` (line 145)

`getPriorityTable` changed from `(phase: SubmitPhase)` to `(phase: SubmitPhase, target?: Target)`. The `target` parameter is optional, so backward compatibility is maintained. The conditional logic (`if phase === "explore" && target?.type === "quest"`) is clean and localized. However, this introduces a second dimension of dispatch (phase x target-type) into what was previously a flat lookup table.

Currently only one combination triggers the override (explore + quest). If more target-type-specific tables are needed in the future, the pattern should be refactored to a two-dimensional lookup rather than growing `if` chains. For now, this is acceptable.

**Resolution:** No action needed. Monitor for additional target-type overrides.

## Score: 9/10

## Summary

Critical: 0, Important: 0, Minor: 3

The implementation is architecturally sound. All changes respect the 4-layer stack (Commands -> RPC -> State Machine -> Filesystem) with no reverse dependencies. The new `quest-explore.ts` transition module follows the established `epic-phase.ts` pattern precisely: pure functions, no I/O, proper use of shared helpers (`getQuest`, `guardQuestStatus`, `setQuestStatus`, `appendActivityLog`). The state machine remains pure (INV-003 verified via passing fitness tests). The `quest:explore` command correctly routes through the RPC `begin()` layer (INV-001). Schema output updates maintain INV-006. The transition-tables.md documentation is updated consistently with the code.

The `begin.ts` and `submit.ts` RPC routing correctly dispatches quest-scoped explore events via target-type checks, mirroring the established epic pattern. The context module's `exploreQuestSources` provides appropriate quest-specific content priorities (quest goal, architecture, conventions) without coupling to epic-specific sources. The `activeQuest` guard decision (not setting it during explore) is well-documented and follows the epic precedent.

TypeScript type checks pass cleanly. All 543 fitness tests pass, including transition completeness (INV-003) and command metadata coverage.
