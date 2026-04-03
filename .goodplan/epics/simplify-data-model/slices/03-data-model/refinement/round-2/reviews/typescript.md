# TypeScript Review: Data Model Changes Plan (Round 2)

## Round 1 Issue Verification

All 9 round-1 issues have been addressed:
- **CREATE_DECISION event** (CRITICAL): Now has explicit task to add fields to `src/schemas/state-events.ts` (Phase 1, task 3).
- **BeginPayloadMap** (CRITICAL): Now has explicit task to extend `BeginPayloadMap["create-decision"]` in `types.ts` and update the `"create-decision"` case in `begin.ts` (Phase 1, tasks 4-5).
- **entityPath validation location** (IMPORTANT): Now specifies validation in RPC layer via `ProjectState` tree, not filesystem I/O. Correctly lists acceptable entity paths (Phase 1, task 6).
- **mapLearningInputs** (IMPORTANT): Now has explicit task to update `mapLearningInputs` with conditional spread (Phase 2, task 3).
- **Conditional spread** (IMPORTANT): Phase 1 and Phase 2 both have bolded notes about conditional spread for `exactOptionalPropertyTypes`.
- **gp upgrade vs gp migrate** (IMPORTANT): Phase 4 now references `gp migrate`, not `gp upgrade`.
- **~30 files** (MINOR): Phase 3 overview now says "~36 files affected (14 source + 22 test)".
- **decision:create payload** (MINOR): Phase 1 task 5 covers forwarding `entityPath` and `reconsiderWhen` using conditional spread in `begin.ts`.
- **z.infer pattern** (MINOR): Phase 3, task 1 now specifies "Export both `unifiedOverviewSchema` and `type UnifiedOverview = z.infer<typeof unifiedOverviewSchema>`."

## Issues

**[IMPORTANT]** Phase 3 task "Update `task-lifecycle.ts` (task drop/convert) for new overview path" is misleading -- the file has no direct overview path references
Codebase verification shows `task-lifecycle.ts` delegates to helper functions (`updateTaskOverviewStatus`, `addEpicToOverview`, `addQuestToOverview`) and never directly references `tasks/overview.json` or any overview path string. Updating the helpers (already covered by a separate task) is sufficient. Including `task-lifecycle.ts` in the task list will confuse the implementer into looking for changes that don't exist. Remove this task or reword it to clarify that only the helpers need updating and `task-lifecycle.ts` is transitively covered.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 task list omits `src/core/rpc/complete.ts` overview reference
`src/core/rpc/complete.ts` line 309 reads `getJson<EpicOverview>(newState, "epics/overview.json")` to derive `epicComplete`. The plan's task "Update RPC layer files (`migrate.ts`, `complete.ts`) for new overview path" mentions `complete.ts` but groups it with `migrate.ts` in a single bullet. The `complete.ts` change is structurally different from the `migrate.ts` change: `complete.ts` reads from the consolidated state tree (path changes from `epics/overview.json` to `overview.json`), while `migrate.ts` constructs the state tree from scratch (needs structural change to build a single overview instead of three). These should be separate tasks with different guidance.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 unified schema task does not specify what happens to existing type exports
The existing `overview.ts` exports 6 types/schemas: `overviewItemSchema`, `OverviewItem`, `overviewSchema`, `Overview`, `sliceOverviewItemSchema`, `SliceOverviewItem`, `epicOverviewItemSchema`, `EpicOverviewItem`, `epicOverviewSchema`, `EpicOverview`. The task says "Specify whether existing types are preserved as sub-shapes or replaced" but does not actually answer the question. The implementer needs a concrete decision. Recommendation: preserve `overviewItemSchema`/`OverviewItem`, `sliceOverviewItemSchema`/`SliceOverviewItem`, `epicOverviewItemSchema`/`EpicOverviewItem` as building blocks; replace `overviewSchema`/`Overview` and `epicOverviewSchema`/`EpicOverview` with `unifiedOverviewSchema`/`UnifiedOverview`. The old wrapper types (`Overview`, `EpicOverview`) that add `{ items: [...] }` become inner shapes of the unified type. This affects all import sites.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `migrate.ts` builds separate `epicsContents["overview.json"]` and `questsContents["overview.json"]` -- plan doesn't call this out
The migration builder in `src/core/rpc/migrate.ts` constructs the state tree with `epicsContents["overview.json"]` (line 281) and `questsContents["overview.json"]` (line 390) as separate entries. Under the consolidated model, both must be merged into a single root `overview.json` entry. The plan task "Update RPC layer files (`migrate.ts`, `complete.ts`) for new overview path" understates the `migrate.ts` change -- it's not just a path update, it requires restructuring how the migration builds the overview portion of the state tree (merging epic, quest, and task overview data into a single `JsonEntry` at the root).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `processLearnings` in `helpers.ts` passes `LearningEventEntry` objects through but the plan doesn't verify it preserves unknown fields
The plan correctly adds `validUntil` to the schemas and `mapLearningInputs`, but should note that `processLearnings` (line 566 of `helpers.ts`) appends entries to JSONL content arrays. Since `LearningEventEntry = LearningEntry` and the schema will include `validUntil`, this should work -- but the plan's task 4 ("Update completion handler to pass `validUntil` through") should confirm that `processLearnings` uses the entry objects as-is (it does) rather than reconstructing them field-by-field (it doesn't). A brief note saying "Verified: `processLearnings` passes entries through without field-by-field reconstruction" would prevent the implementer from a false investigation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 HMAC update step should reference the HMAC path-keying behavior
Phase 4 task 2 says "update HMAC" but the HMAC system keys signatures by state-tree path. When old files (`quests/overview.json`, `tasks/overview.json`) are removed and a new file (`overview.json`) is added, the HMAC entries for the old paths become stale. The migration must: (a) add an HMAC entry for `overview.json`, (b) remove HMAC entries for `quests/overview.json` and `tasks/overview.json`. The plan should note this two-step HMAC update to prevent the implementer from only adding the new entry and leaving stale entries that would cause `gp verify` to report phantom mismatches.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from round 1 (5/10). All critical issues resolved. The plan now has correct data flow for both Phase 1 and Phase 2, proper conditional spread notes, and correct command references. Remaining issues are important-level clarity gaps that could lead to implementer confusion (misleading task-lifecycle task, understated migrate.ts complexity, unresolved type export question) but no correctness gaps. To reach 9+: resolve the type export decision in Phase 3 task 1, split the RPC task into separate complete.ts and migrate.ts tasks with specific guidance, and remove the misleading task-lifecycle.ts task.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
