# TypeScript Review: Data Model Changes Plan (Round 3)

## Round 2 Issue Verification

All 6 round-2 issues have been addressed:
- **task-lifecycle.ts misleading task** (IMPORTANT): Now correctly reworded to clarify that helpers encapsulate overview access and `task-lifecycle.ts` is transitively covered. No direct changes expected unless helpers are incomplete.
- **complete.ts overview reference** (IMPORTANT): Now a separate task (Phase 3, task 12) with specific guidance: change path from `epics/overview.json` to `overview.json`, access `.epics` instead of `.items`, update `EpicOverview` type import to `UnifiedOverview`.
- **Type export decision** (IMPORTANT): Phase 3 task 1 now explicitly specifies the type strategy: preserve item-level schemas as building blocks, replace wrapper types with `unifiedOverviewSchema`/`UnifiedOverview`.
- **migrate.ts understated complexity** (MINOR): Now a separate task (Phase 3, task 13) with specific guidance about merging `epicsContents`, `questsContents`, and `tasksContents` overview entries into a single root-level `JsonEntry`.
- **processLearnings verification note** (MINOR): Phase 2 task 4 now includes a verification note confirming `processLearnings` passes entries through as-is without field-by-field reconstruction.
- **HMAC path-keying** (MINOR): Phase 4 task 2 now specifies the two-step HMAC update: add entry for `overview.json` AND remove stale entries for old paths.

## Issues

**[IMPORTANT]** Phase 1 task 6 `entityPath` validation mixes state-tree lookup with filesystem I/O language
The task correctly says to validate "in the `begin()` function (RPC layer, `begin.ts`) after `loadState` and before `buildBeginEvent`, using `resolve()` or `getJson()` against the loaded `ProjectState` tree — NOT in the transition handler, NOT via direct filesystem I/O." This is good. However, the final sentence says "Validation checks `stat(projectDir/.goodplan/<entityPath>/<entityType>.json)`" — `stat` implies a filesystem call, contradicting the earlier instruction. The loaded `ProjectState` tree from `loadState(projectDir)` already contains all entity JSON paths. The correct validation is `getJson(oldState, entityPath + "/epic.json")` (or the appropriate entity type JSON) returning non-undefined. Remove the `stat()` wording and replace with explicit `getJson()` lookups against `oldState`. The acceptable entity types and their JSON files are already listed correctly: `epics/<name>/epic.json`, `epics/<name>/slices/<name>/slice.json`, `quests/<name>/quest.json`, `tasks/<name>/task.json`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 task 13 (`migrate.ts`) incorrectly references `tasksContents["overview.json"]`
The task says "Merge `epicsContents["overview.json"]`, `questsContents["overview.json"]`, and `tasksContents["overview.json"]` into one root-level `JsonEntry`." Codebase verification shows `buildMigrationState()` creates only `epicsContents["overview.json"]` (line 281) and `questsContents["overview.json"]` (line 390). There is no `tasksContents` directory or `tasksContents["overview.json"]` — the migration builder does not support tasks (tasks are created via `gp task:create` post-init, not during migration from a pre-CLI project). The root tree (line 394) has no `tasks` directory entry. The implementer should: (a) merge `epicsContents["overview.json"]` and `questsContents["overview.json"]` into a root-level `overview.json` with `{ epics, quests, tasks: [] }`, and (b) remove the old entries from `epicsContents` and `questsContents`. Update the task to reference only the two existing overview entries.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task 3 uses `!== undefined` check but should note empty array is a valid distinct value
The task correctly says "Use `!== undefined` (not truthiness) since `validUntil` is `string[] | undefined` and an empty array is valid." This is good — but the conditional spread pattern shown (`...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {})`) should also be used consistently in Phase 1 for `reconsiderWhen` (also `string[] | undefined`). Phase 1 task 5 says "using conditional spread" but doesn't specify the `!== undefined` check. An empty `reconsiderWhen: []` is semantically valid ("no conditions yet") and distinct from absence. Align Phase 1 language with Phase 2's explicit `!== undefined` pattern.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from rounds 1 and 2 are fully resolved. The plan now has correct data flow for all phases, proper conditional spread patterns, correct command references (`gp migrate` not `gp upgrade`), explicit type export strategy, and separated `complete.ts`/`migrate.ts` tasks. The two remaining important issues are wording-level: the `stat()` vs `getJson()` inconsistency in Phase 1 task 6 could lead an implementer to add a filesystem call where a state-tree lookup is intended, and the `tasksContents` reference in Phase 3 task 13 points to something that doesn't exist. The minor issue is a consistency gap in conditional spread guidance between phases. All three are directly actionable text edits.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
