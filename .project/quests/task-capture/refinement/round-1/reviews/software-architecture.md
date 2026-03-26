# Software Architecture Review: Task Capture Plan

## Issues

**[CRITICAL]** CONVERT_TASK handler creates entities without routing through existing event dispatch
The plan says CONVERT_TASK should "reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic." The research doc correctly identifies this as the hardest part (gotcha #4) and suggests option (a) — inlining creation using helpers. However, the plan's Phase 1 task description is ambiguous: "CONVERT_TASK also creates the quest/epic entity (reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic)." This leaves the implementer to choose, but option (b) — recursive `reduce()` — would violate the reducer's purity assumptions and break the single-event-per-commit model. The plan must prescribe a single approach. Option (a) — inlining the entity creation using `setEntry()` and the existing helper functions (`addQuestToOverview`, `appendActivityLog`, etc.) — is the correct choice. The plan should explicitly state: "Inline quest/epic creation in the CONVERT_TASK handler using tree helpers (setEntry, addQuestToOverview, appendActivityLog). Do NOT call reduce() recursively."
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Missing `tasks/overview.json` initialization in INIT_PROJECT handler
The plan does not include a task to update `src/core/state/transitions/init.ts` to create `tasks/overview.json` during project initialization. The research doc identifies this as gotcha #8: "Init handler creates overview files... Must also create tasks/overview.json for newly initialized projects." Without this, `handleCreateTask` will fail on newly initialized projects because the overview guard (matching the quest-create pattern) will find no `tasks/overview.json`. The plan's Phase 1 task list must include: "Update `handleInitProject` in `src/core/state/transitions/init.ts` to create `tasks/overview.json` with `{ items: [] }`."
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Task entity uses `title` but overview schema only has `name` — display will be degraded
The plan gives tasks a `title` field (distinct from `name`, which is a filesystem slug derived from the title). But the shared `overviewSchema` only carries `{ name, status, epic?, created, completed }` — no `title`. The `task:list` command says it should display "table with name, title, created date, status" but if overview items don't carry `title`, the list command would need to load every individual `task.json` to get titles, defeating the purpose of the overview. The plan must address this. Options: (a) extend `overviewItemSchema` with an optional `title` field (backward compatible — existing overview items just won't have it), (b) create a separate `taskOverviewSchema` with `title` included. Option (a) is simpler and consistent with the "narrow interfaces" philosophy since it's additive. The plan should add a task to extend `overviewItemSchema` in `src/schemas/entities/overview.ts` with `title: z.string().optional()`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan proposes `task:create` uses stdin but `task:drop` also uses stdin — inconsistent with existing abandon pattern
The existing `quest:abandon` command uses flags (`--reason`) not stdin, precisely because `reason` is a simple scalar. The plan's `task:drop` command uses stdin (`taskDropInputSchema: { reason: string }`) which is inconsistent with the established pattern. Similarly, `task:convert` uses stdin for `{ to: "quest" | "epic" }` — a single scalar. The plan should follow the existing flag-based convention for simple scalars: `task:drop --task <name> --reason <text>` and `task:convert --task <name> --to quest`. This also aligns with INV-004 (target flags required) and keeps the CLI self-describing. Stdin should be reserved for complex structured input (like `task:create` which has optional nested `context`).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing updates to exhaustive switches in `resolvePathReferences()` and `buildBeginResult()`
Adding `{ type: "task" }` to the `Target` union will cause compile errors in every exhaustive switch over `Target`. The plan mentions updating `resolveEntityName()` and `resolveEntityJsonPath()` (via the research doc) but does not mention `resolvePathReferences()` in `src/core/rpc/paths.ts` or `buildBeginResult()` in `src/core/rpc/begin.ts` (lines 302-343). Both have exhaustive `if/else` chains over target types. The plan's Phase 1 task "Add task target type to `src/core/rpc/types.ts`" should explicitly list ALL exhaustive switches that must be updated: `resolveEntityName()`, `resolveEntityJsonPath()`, `resolvePathReferences()`, and `buildBeginResult()`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** New `BeginPhase` values needed for `drop` and `convert` but plan doesn't specify them
The plan says `task:drop` and `task:convert` call RPC but doesn't specify what `BeginPhase` values they use. Looking at the `BeginPhase` union and `BeginPayloadMap`, there are no `"drop"` or `"convert"` phases. The plan's Phase 2 task "Add RPC handling for task operations in `src/core/rpc/begin.ts`" is too vague. It must specify: (a) add `"drop"` and `"convert"` to `BeginPhase`, (b) add corresponding entries to `BeginPayloadMap`, (c) add cases to `buildBeginEvent()`'s switch, (d) add `buildDropEvent()` and `buildConvertEvent()` helper functions. Alternatively, if `drop` and `convert` are task-only operations, the plan should consider whether reusing the `"abandon"` phase (which already exists) makes more sense for `drop`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan references `begin()` call in `task:create` but task creation has different payload shape
The plan says `create.ts` calls `begin(projectDir, "create", { type: "task", name: slugify(title) }, payload)`. But the existing `BeginPayloadMap["create"]` is `{ name: string; goal?: string; epic?: string }`. Tasks have `title` and `description` instead of `goal`. Either: (a) the `buildCreateEvent` handler must map `goal` to `title`/`description` for the task case (leaky), or (b) `BeginPayloadMap["create"]` needs extending with task-specific fields like `title` and `description`. Option (b) is cleaner — add `title?: string; description?: string` to `BeginPayloadMap["create"]` and have the task case in `buildCreateEvent` use them. The plan should be explicit about this mapping.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `CONVERT_TASK` needs to create the converted entity's directory structure including goal file
When a task is converted to a quest, the plan says it "auto-derives quest/epic name from task slug, goal from task title + description." But quest creation in the codebase creates `quests/<name>/quest.json` with a `goal` field — and the quest workflow later expects `hasChild(state, "quests/<name>", "goal.md")` or similar content. The CONVERT_TASK handler must create the quest/epic entity with enough structure that it can proceed through its lifecycle. At minimum: create the `quest.json`/`epic.json` with correct fields, add to overview, and append activity log. The plan should specify exactly what fields the converted quest/epic gets and confirm it will be in `created` status ready for normal workflow.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Transition table not updated in architecture docs
The plan adds 3 new state events (CREATE_TASK, DROP_TASK, CONVERT_TASK) with their own lifecycle, but doesn't include a task to update `.project/architecture/transition-tables.md` with the task transition table. This is the "source of truth for the state machine implementation and tests" per its header. A new "Task" section should be added with rows for: `(none) -> CREATE_TASK -> open`, `open -> DROP_TASK -> dropped`, `open -> CONVERT_TASK -> converted`, plus guards (duplicate name rejection, invalid transitions on terminal states).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Task schema stores `context` but Phase 1 doesn't address who populates it
The `taskContextSchema` has `activeSlice`, `activeQuest`, `activeEpic`, `gitBranch`, `capturedDuring`. The `CREATE_TASK` event carries `context?: TaskContext`. Phase 3's `/capture` skill populates this from `status --json` output. But Phase 2's `task:create` command takes context in stdin — it's up to the caller to provide it. This is fine architecturally, but the plan should note that the CLI command itself does no context auto-population; that's exclusively the skill's job. This keeps the CLI stateless per INV-004.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:list` bypasses RPC but `task:create` doesn't generate `tasks/overview.json` on first use for migrated projects
For projects initialized before this feature, `tasks/overview.json` won't exist. The plan handles new projects via init.ts updates (once the CRITICAL issue above is fixed), but existing initialized projects won't have `tasks/overview.json`. The `task-create` handler should create `tasks/overview.json` with `{ items: [] }` if it doesn't exist, similar to how migration handles structural bootstrapping. Alternatively, `task:list` should handle a missing overview gracefully (return empty list).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan doesn't specify terminal states for tasks
The transition table doc has a "Terminal States" section listing terminal states per entity. Tasks should have `converted` and `dropped` as terminal states. The DROP_TASK and CONVERT_TASK handlers need guards to reject events on tasks already in terminal status (the plan mentions "invalid transitions" in tests but doesn't specify the guard logic in the handler tasks).
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan demonstrates good domain understanding and follows existing patterns well (entity schema, command structure, overview pattern, skill design). However, it has 3 critical issues (CONVERT_TASK ambiguity, missing init.ts update, overview schema gap) and 6 important issues around RPC layer integration that would cause compile errors or runtime failures if implemented as-is. The plan is strongest in Phase 3 (skill design) and weakest in Phase 1-2 RPC integration — the exhaustive switch/type system touchpoints are under-specified. To reach 9+: resolve all critical issues, specify exact BeginPhase/BeginPayloadMap changes, list all exhaustive switches that need task cases, align drop/convert with flag conventions, and add the transition table update.

## Summary
- Critical: 3
- Important: 6
- Minor: 3
