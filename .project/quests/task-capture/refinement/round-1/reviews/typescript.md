## Issues

**[CRITICAL]** CONVERT_TASK handler must update exhaustive switches in `resolveEntityDir`, `resolveEntityName`, `resolveEntityJsonPath`, and `buildBeginResult` for new Target type `{ type: "task" }`

Phase 1 adds `{ type: "task", name: string }` to the `Target` union in `src/core/rpc/types.ts`. The codebase has four exhaustive switches over `Target.type` that will fail to compile without a `"task"` case:

1. `resolveEntityName()` in `src/core/rpc/types.ts` (line 198)
2. `resolveEntityJsonPath()` in `src/core/rpc/types.ts` (line 216)
3. `resolveEntityDir()` in `src/core/rpc/paths.ts` (line 139)
4. `buildBeginResult()` in `src/core/rpc/begin.ts` (line 302) — needs task status extraction like the quest/slice/epic cases
5. `buildCreateEvent()` in `src/core/rpc/begin.ts` (line 167) — needs a `case "task"` for creating tasks

The plan's Phase 1 says "Add task target type to `src/core/rpc/types.ts` Target union" and mentions `resolveEntityName()` and `resolveEntityJsonPath()`, but does not mention `resolveEntityDir()`, `buildBeginResult()`, or `buildCreateEvent()`. These are all in `begin.ts` and `paths.ts` which also need updating. Phase 2 mentions "Add RPC handling for task operations in `src/core/rpc/begin.ts`" but this is vague — the specific functions and exhaustive switch cases should be listed in Phase 1 alongside the Target union change, since the code won't compile otherwise.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `init.ts` does not create `tasks/overview.json` — new projects will fail on first task creation

The `handleInitProject` in `src/core/state/transitions/init.ts` creates `epics/overview.json`, `slices/overview.json`, and `quests/overview.json` but not `tasks/overview.json`. The research doc (gotcha #8) identifies this but the plan does not include a task to update `init.ts`. The `handleCreateQuest` handler guards on `overview === undefined` and returns a StateError if the overview file is missing. If `task-create.ts` follows the same pattern (which it should), task creation will fail on every newly initialized project because `tasks/overview.json` was never created.

The plan must add a task in Phase 1 to update `src/core/state/transitions/init.ts` to also create `tasks/overview.json`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `BeginPhase` and `BeginPayloadMap` need new entries for `"drop"` and `"convert"` phases — plan is ambiguous

Phase 2 says `task:drop` "calls RPC to dispatch DROP_TASK" and `task:convert` "calls RPC to dispatch CONVERT_TASK" via `begin()`. But `begin()` requires a `BeginPhase` value and a matching `BeginPayloadMap` entry. The current `BeginPhase` union has no `"drop"` or `"convert"` phase. The plan needs to specify:

1. Whether to add new phases `"drop"` and `"convert"` to `BeginPhase` (and corresponding `BeginPayloadMap` entries), OR
2. Whether to reuse existing phases (e.g., `"abandon"` for drop, or a new mapping in `buildBeginEvent`).

The research doc (section "BeginPhase and BeginPayloadMap") identifies this choice but the plan doesn't resolve it. Adding new `BeginPhase` entries also requires updating `mapToBeginPhase()` in `src/core/rpc/paths.ts` and `resolveForBeginPhase()` — both have exhaustive `never` default cases.

This should be decided and specified in Phase 1 (alongside the event/schema work) so Phase 2 can implement cleanly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `task:create` uses stdin but derives `name` from `title` — plan says to call `begin()` with `name: slugify(title)` but `BeginPayloadMap["create"]` expects `{ name, goal? }`, not `{ name, title, description, context }`

The plan's Phase 2 `create.ts` task says: "calls `begin(projectDir, "create", { type: "task", name: slugify(title) }, payload)`". But the current `BeginPayloadMap["create"]` is `{ name: string; goal?: string; epic?: string }`. The CREATE_TASK event needs `title`, `description`, and `context` — none of which fit the existing payload shape.

Options: (a) Extend `BeginPayloadMap["create"]` with optional `title`, `description`, `context` fields; (b) Add a separate `"create-task"` phase (like `"create-decision"` exists for decisions); (c) Route task creation through a different mechanism.

Option (b) is cleanest — it follows the `create-decision` precedent and avoids polluting the generic create payload. The plan should specify this explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan uses `taskStatusSchema: z.enum(["open", "converted", "dropped"])` but the overview schema uses `status: z.string().min(1)` — overview items won't include `title` for task display

The shared `overviewItemSchema` in `src/schemas/entities/overview.ts` has `{ name, status, epic?, created, completed }`. The research doc (gotcha #6) notes tasks want `title` in overview items for display. The plan's `task:list` command says it returns `{ items: [{ name, title, status, created }] }` with `title` — but if it reads `tasks/overview.json` via the shared `overviewSchema`, there is no `title` field. The plan's `addTaskToOverview` helper (implied by the Phase 1 pattern) would need to store `title`, but the shared schema would reject it at validation (INV-005).

The plan must either: (a) create a `taskOverviewSchema` extending the shared one with `title`, and register it separately in the schema registry; or (b) add `title` as optional to the shared `overviewItemSchema` (simpler, but leaks task-specific concerns).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `task:drop` uses stdin (`taskDropInputSchema: { reason }`) but existing `quest:abandon` uses flags (`--reason`), and the research doc notes "Task drop could use --reason flag (like quest abandon) or stdin" — the plan should follow the established flag pattern for simple scalars

The codebase convention (INV-004, and the `quest:abandon` implementation at `src/commands/quest/abandon.ts`) uses flags for simple scalar inputs. `task:drop` only takes a `reason` string — this is exactly the same shape as `quest:abandon` which uses `--reason` flag, not stdin. Using stdin for a single string field breaks the established convention without justification.

Change `task:drop` to use `--task <name> --reason <text>` flags instead of stdin. This also eliminates the need for `taskDropInputSchema` entirely.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `task:convert` needs to be an atomic two-entity operation but the plan says "CONVERT_TASK also creates the quest/epic entity (reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic)" — this needs precision

The CONVERT_TASK handler must atomically: (1) mark the task as converted, (2) create the new quest/epic entity (including its overview entry). The plan says to "reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic." The research doc (gotcha #4) correctly identifies that recursive `reduce()` calls break purity assumptions, so inlining is the right approach.

However, the inlined logic must replicate several steps from `handleCreateQuest`: create `quest.json`, add to `quests/overview.json`, and append activity log. The plan should explicitly list what the CONVERT_TASK handler must do:
1. Guard task exists and status is "open"
2. Guard no duplicate quest/epic name
3. Update task status to "converted", set `convertedTo`
4. Update tasks overview
5. Create quest/epic JSON (reusing `setEntry`)
6. Add to quests/epics overview
7. Set project `activeQuest` (like quest creation does? Actually quest creation doesn't set activeQuest — clarify)
8. Append activity log entries (one for convert, one for the new entity creation)

Without this specificity, the implementer may miss steps like duplicate name checking or overview updates for the created entity.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `taskConvertInputSchema` only has `{ to: "quest" | "epic" }` but the command also needs `--task <name>` — the schema should include `task` or the flag should be merged like `completeQuestInputSchema`

Looking at the existing `completeQuestInputSchema`, it merges the `--quest` flag into the schema: `{ quest: z.string(), verificationPassed: z.boolean(), ... }`. The plan's `taskConvertInputSchema` only has `{ to: "quest" | "epic" }` but the command needs `--task <name>`. Either the stdin schema should include `task` (merged from the flag like the complete pattern), or the validate step should handle them separately. The plan should be explicit about which pattern to follow.

Similarly, `taskDropInputSchema` has `{ reason: string }` but if we switch to flags per the earlier issue, this schema becomes unnecessary.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `taskContextSchema` fields should all be optional — plan correctly marks them as optional but `capturedDuring` should clarify its type

The `taskContextSchema` shows `capturedDuring?: string` which is fine, but the `/capture` skill says it will "Derive `capturedDuring` from conversation context and system state." This field should have a brief description in the schema or a doc comment explaining what kinds of values it holds (e.g., "implementing slice foo-bar", "planning quest task-capture") so implementers know the expected format.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 calls for `tests/integration/task.test.ts` but the research doc notes "No integration tests currently exist (tests/integration/ has only .gitkeep)" — these tests may actually be unit tests using the state machine directly

If these tests create tasks via `begin()` (which does filesystem I/O through `loadState`/`commitState`), they are true integration tests and need filesystem fixtures. If they use `reduce()` directly (pure state machine), they are unit tests and should go in `tests/unit/`. The plan should clarify the test approach. Given that the "create -> list -> show -> drop cycle" test involves CLI commands that do I/O, integration tests seem correct but will need a temp directory setup pattern that doesn't exist yet.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `StateErrorCode` may need a new code for task-specific errors (e.g., `STATE_TASK_NOT_FOUND` or `STATE_TASK_ALREADY_CONVERTED`)

Currently the plan reuses `STATE_INVALID_TRANSITION` for all task error cases. This is consistent with how quest/epic errors work, so it's fine. But if task:convert's "already converted" error should be distinguishable from other invalid transitions, a specific code would be clearer. Low priority — the existing pattern works.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the three-layer structure and follows existing entity patterns. However, it has two critical gaps (missing `init.ts` update and incomplete exhaustive-switch coverage) that would cause compile failures or runtime errors on new projects. It also has several important ambiguities around the RPC layer integration (BeginPhase/BeginPayloadMap design, payload shape for task create, atomic convert logic) that would force the implementer to make unguided design decisions. Resolving the critical issues, specifying the RPC routing approach (recommend a `"create-task"` phase plus `"drop"` and `"convert"` phases), clarifying the overview schema for tasks, and aligning `task:drop` with the flags convention would bring this to 9+.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
