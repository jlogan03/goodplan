# Software Architecture Review: Data Model Changes Plan

## Issues

**[CRITICAL]** Plan references `gp upgrade` but the CLI command is `gp migrate`
The plan's Phase 4 ("Upgrade Migration") consistently references `gp upgrade` as the command that handles migration. However, the actual CLI command is `gp migrate` (file: `src/commands/global/migrate.ts`, delegating to `rpcMigrate`). The epic architecture doc (`architecture/_overview.md`) lists `/gp:upgrade` as the *skill* name (renamed from `migrate`), but the underlying CLI command hasn't been renamed yet -- that rename is part of the broader simplify-data-model epic, not this slice. The plan must use `gp migrate` or explicitly include the CLI command rename as a prerequisite/task.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** entityPath validation in the state machine violates INV-003 (state machine purity)
Phase 1, task 3 says: "Add `entityPath` validation in `decision:create` command: if provided, verify the path resolves to an entity directory in `.goodplan/`." The task description is correct (validation in the *command* layer), but the Expected Behavior section includes `gp decision:create --json` failing with a "validation error" for a nonexistent path, and the research file notes "entityPath validation (checking entity existence) belongs in the RPC layer or command, not the pure reducer." This is architecturally sound, but the plan doesn't specify *where* in the call chain this validation happens. Currently `decision:create` calls `begin()` which builds a `StateEvent` and calls `reduce()`. The validation must happen *before* the event is built -- either in the command handler (after `validateInput`) or in a new RPC-layer function. The plan should be explicit about the insertion point to prevent an implementer from accidentally putting filesystem checks inside the state machine transition handler (`handleCreateDecision`), which would violate INV-003.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** CREATE_DECISION state event type missing new fields
The research file correctly identifies that `CREATE_DECISION` in `src/schemas/state-events.ts` (line 123) carries `{ id, domain, title, summary, ts }` and needs the new fields. However, the plan's Phase 1 tasks do not include updating the `StateEvent` union type. Tasks list updating the decision entry schema, the command input schema, the `decision:create` handler, and `decision:show` -- but the state event type is the bridge between them. Without updating `CREATE_DECISION` to include optional `entityPath` and `reconsiderWhen`, the transition handler (`handleCreateDecision`) cannot access these fields from the event, and the implementer will hit a type error. The research file flagged this; the plan should have a task for it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Learning `validUntil` field not propagated through RPC mapping
Phase 2 task 3 says "Update completion handler (`processLearnings` or equivalent)." However, the actual mapping bottleneck is in `mapLearningInputs()` at `src/core/rpc/complete.ts` line 125. This function explicitly constructs each `LearningEventEntry` field-by-field (lines 144-152), not via spread. If `validUntil` is added to both schemas but not explicitly mapped in `mapLearningInputs`, it will be silently dropped. The research file notes "processLearnings passes entries through opaquely" which is true -- but the entries arrive at `processLearnings` *after* `mapLearningInputs` has already stripped them. The plan should add a specific task: "Update `mapLearningInputs()` in `src/core/rpc/complete.ts` to include `validUntil` in the constructed `LearningEventEntry`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 overview consolidation changes data-model.md but plan doesn't update it
The architecture doc `architecture/data-model.md` documents the current 3-file overview structure (lines 116-137) with example state trees showing `epics/overview.json`, `quests/overview.json` as separate entries. Phase 3 changes this to a single root `overview.json`. The plan has no task for updating `data-model.md` or the example state tree in it. This doc is read by the architecture overview and by future slice planning -- stale docs here will mislead future work. Per the epic's own "Post-Migration Documentation Updates" section, doc updates should be tracked.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 missing task for `src/core/context/priorities.ts`
The research file identifies `src/core/context/priorities.ts` as containing overview path references, but the plan's Phase 3 tasks don't mention the context subsystem at all. The tasks reference commands, transitions, RPC layer, and test fixtures -- but the context module is a separate concern that reads overview data for priority computation. The "Grep exhaustively" task may catch this, but it's significant enough to call out explicitly since the context module is a different architectural layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 migration doesn't account for `slices/overview.json` legacy artifact
The research file notes: "slices/overview.json is a legacy artifact -- no source code references it." Phase 4's migration logic detects and consolidates `quests/overview.json` and `tasks/overview.json`, but doesn't address `slices/overview.json`. While it's inert, the migration is the right time to clean it up. If left behind, it will confuse anyone examining the `.goodplan/` directory post-migration. The plan should either explicitly remove it in the migration or note that it's intentionally left.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 entityPath validation message could mislead about valid paths
The Expected Behavior says `entityPath: "nonexistent/path"` should fail. But the plan doesn't specify what constitutes a valid entity path -- just "verify the path resolves to an entity directory in `.goodplan/`." Valid paths include `epics/<name>` (has `epic.json`), `epics/<name>/slices/<name>` (has `slice.json`), `quests/<name>` (has `quest.json`), and `tasks/<name>` (has `task.json`). The validation logic should be specified: check for the corresponding entity JSON file (e.g., path ends with epic name -> check for `epic.json` in that directory). Without this, the implementer might just check for directory existence, which would accept paths like `architecture/` or `research/` that aren't entities.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 should specify the new unified overview TypeScript type exports
The plan says "Create unified overview schema in `src/schemas/entities/overview.ts`" but doesn't specify what types to export or how existing consumers (`Overview`, `EpicOverview`, `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem`) should be handled. These types are imported across the codebase. The plan should specify whether the existing types are preserved (as sub-shapes of the unified type) or replaced, to avoid breaking imports across 14+ source files.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 COMPLETE_SLICE and COMPLETE_QUEST state events may need validUntil
If `validUntil` flows through `mapLearningInputs` into `LearningEventEntry`, and the state machine's `COMPLETE_SLICE`/`COMPLETE_QUEST` events carry `learnings: LearningEventEntry[]`, then the `LearningEventEntry` type change (from schema update) propagates automatically. But this implicit propagation should be verified -- the plan should note that the state event types don't need updating because they reference the `LearningEventEntry` type, which inherits the schema change.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan demonstrates solid understanding of the codebase structure and makes correct high-level architectural decisions (additive fields, clean-break migration, proper layer separation). However, it has two critical issues (wrong CLI command name, ambiguous validation placement that risks INV-003 violation) and four important issues where explicit field-by-field mapping patterns in the codebase mean that schema-only changes will silently drop data. The plan would reach 9+ by: (1) fixing the `gp upgrade` vs `gp migrate` discrepancy, (2) specifying exact insertion points for entityPath validation, (3) adding the missing `StateEvent` type and `mapLearningInputs` tasks, and (4) adding doc update and context module tasks for Phase 3.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
