# Software Architecture Review: Data Model Changes Plan (Round 3)

## Issues

**[IMPORTANT]** Phase 1 entityPath validation specifies contradictory approaches: state tree lookup vs filesystem stat

The plan's task at line 44 says two different things: "using `resolve()` or `getJson()` against the loaded `ProjectState` tree" (pure state tree lookup) and "Validation checks `stat(projectDir/.goodplan/<entityPath>/<entityType>.json)`" (filesystem I/O). These are contradictory. The state tree approach is correct and sufficient: `assembleState()` loads all entity JSON files (`epic.json`, `slice.json`, `quest.json`, `task.json`) into the `ProjectState` tree, so `getJson(oldState, "<entityPath>/<entityType>.json")` will return the entity if it exists. The `stat()` approach introduces redundant filesystem I/O and creates a dependency on the filesystem in a code path that already has the data in memory. The plan should remove the `stat()` sentence and rely exclusively on the state tree. Acceptable validation pattern: `getJson(oldState, "epics/<name>/epic.json")` for epics, `getJson(oldState, "epics/<epic>/slices/<name>/slice.json")` for slices, etc. The entity type is derivable from the path structure (first segment determines entity type).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 task-lifecycle.ts has a direct overview path read that helpers don't cover

The plan states "Ensure helpers fully encapsulate overview access so `task-lifecycle.ts` never constructs overview paths directly. No direct changes expected unless helpers are incomplete." However, `task-lifecycle.ts` line 108 performs a direct `getJson<Overview>(state, \`${targetNamespace}/overview.json\`)` guard-read. This is not covered by any existing helper -- it's a standalone existence check. In the consolidated model, this should become a read of `overview.json` at the root. The plan's exhaustive grep task (line 126) would catch this, but the guidance that "no direct changes expected" is misleading. Either: (a) add a helper like `getOverview(state): UnifiedOverview | undefined` that encapsulates the read, or (b) acknowledge that `task-lifecycle.ts` needs a direct update. Option (a) is cleaner and would also benefit `complete.ts` line 309 which does a similar direct read.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 migrate.ts task references `tasksContents["overview.json"]` which doesn't exist

The plan at line 125 says: "Merge `epicsContents["overview.json"]`, `questsContents["overview.json"]`, and `tasksContents["overview.json"]` into one root-level `JsonEntry`." In the actual `migrate.ts`, there is no `tasksContents` variable -- the migration predates the tasks feature. The `buildMigrationState` function only creates `epicsContents` (with `overview.json`) and `questsContents` (with `overview.json`). The unified overview in migrate.ts should merge these two plus an empty `tasks: []` array. The plan text should be corrected to match the actual code.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `mapLearningInputs` in complete.ts builds entries field-by-field, contradicting the "flows through automatically" assumption

The plan's Phase 2 note at line 79 says: "`processLearnings` in `helpers.ts` passes `LearningEventEntry` objects as-is without field-by-field reconstruction, so `validUntil` flows through automatically once the schema includes it -- verify this assumption holds." This is correct for `processLearnings`. However, `mapLearningInputs` in `complete.ts` (lines 144-152) builds each `LearningEventEntry` field-by-field with explicit property assignments (`category`, `summary`, `file`, `tags`, `source`, `rollup`, `rollupTo`). The plan correctly has the task to add `validUntil` via conditional spread at line 78, but the "flows through automatically" note could mislead the implementer into thinking no change is needed in `mapLearningInputs`. The note is about `processLearnings`, not `mapLearningInputs` -- but they're easy to conflate. Consider rewording to clarify which function needs changes (mapLearningInputs) and which doesn't (processLearnings).

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-2 issues have been addressed well. The plan now has explicit type strategy for overview consolidation, clear helper encapsulation guidance for task-lifecycle.ts, entityPath validation placement between loadState and buildBeginEvent, HMAC task annotated as verification-only, and crash-safe migration using commitState. The one important remaining issue (contradictory validation approaches) could cause confusion during implementation -- the stat() approach should be removed in favor of the state tree approach. The three minor issues are clarification items that a competent implementer could resolve, but fixing them prevents unnecessary detective work.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
