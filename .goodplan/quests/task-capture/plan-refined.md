# Plan: Task Capture

## Overview

Add a lightweight task capture system to goodplan — a "junk drawer" for thoughts, bugs, and ideas noticed during work. Three layers: (1) task entity schema + state machine, (2) 5 CLI commands (`task:create/list/show/convert/drop`), (3) a `/capture` skill that auto-grabs context and creates tasks with minimal friction.

Tasks store structured context snapshots (active slice/quest/epic, git branch, what the user was doing) so they remain actionable when revisited later. The `/capture` skill uses judgment to determine if it has enough context to create the task automatically or needs to ask the user clarifying questions. `task:convert` atomically creates a quest/epic from a task and checks for related open tasks to bundle.

Follows established entity patterns (quest/slice). Uses overview.json for fast listing, state machine events for lifecycle, schema registry for state tree inclusion.

## Phase 1: Task Entity & Schema

Define the task data model, state machine events, and state machine handlers so tasks can be created and managed programmatically.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r "taskSchema" src/schemas/` → no matches (task entity doesn't exist)
- [ ] `grep "CREATE_TASK" src/schemas/state-events.ts` → no matches (no task events)
- [ ] `grep "tasks" src/core/data/schema-registry.ts` → no matches (tasks not in registry)

**After implementation** (should pass / show presence):
- [ ] `grep -r "taskSchema" src/schemas/entities/` → task schema defined with context snapshot fields
- [ ] `grep "CREATE_TASK\|DROP_TASK\|CONVERT_TASK" src/schemas/state-events.ts` → all 3 events defined
- [ ] `grep "tasks" src/core/data/schema-registry.ts` → tasks/overview.json and tasks/*/task.json patterns registered
- [ ] `bun test` — all existing tests pass + new unit tests for task state transitions

### Tasks

- [x] Create `src/schemas/entities/task.ts` with Zod schemas:
  - `taskContextSchema`: `{ activeSlice?: string, activeQuest?: string, activeEpic?: string, gitBranch?: string, capturedDuring?: string }` — add doc comment on `capturedDuring`: free-text description of what the user was doing, e.g., "implementing slice foo-bar", "planning quest task-capture"
  - `taskStatusSchema`: `z.enum(["open", "converted", "dropped"])`
  - `taskSchema`: `{ name: string, title: string, status: taskStatusSchema, created: timestampSchema, context: taskContextSchema, convertedTo?: { type: "quest" | "epic", name: string }, droppedReason?: string, description?: string }`
  - Export `z.infer` types for all schemas
- [x] Create `src/schemas/commands/task.ts` with Zod stdin schemas:
  - `taskCreateInputSchema`: `{ name: string, title: string, description?: string, context?: taskContextSchema }` — `name` is required (consistent with all other entity creation commands). The `/capture` skill auto-derives name by slugifying title so users never think about it. Add doc comment on `context`: typically auto-populated by the /capture skill, may be omitted for direct CLI usage.
  - `taskListResultSchema`: `{ items: z.array(overviewItemSchema), filter: z.enum(["open", "all"]) }` — output schema for `task:list` (INV-006 compliance, analogous to `statusResultSchema`)
  - ~~`taskConvertInputSchema`~~: Not needed — `task:convert` uses all-flags pattern (`--task`, `--to`, `--name`, `--goal`) since all fields are simple scalars.
- [x] Add task state events to `src/schemas/state-events.ts`:
  - `CREATE_TASK`: `{ type: "CREATE_TASK", name: string, title: string, description?: string, context?: TaskContext, ts: string }`
  - `DROP_TASK`: `{ type: "DROP_TASK", name: string, reason: string, ts: string }`
  - `CONVERT_TASK`: `{ type: "CONVERT_TASK", name: string, to: "quest" | "epic", convertedName: string, convertedGoal?: string, ts: string }`
  - Add all to `StateEvent` discriminated union
- [x] Add schema registry entries in `src/core/data/schema-registry.ts`:
  - `{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema }`
  - `{ pattern: /^tasks\/[^/]+\/task\.json$/, schema: taskSchema }`
- [x] Create state machine handlers in `src/core/state/transitions/`:
  - `task-create.ts`: handles CREATE_TASK — creates `tasks/<name>/task.json`, adds to `tasks/overview.json`. If `tasks/overview.json` is missing (existing projects), create it lazily with `{ items: [] }` before adding the entry. With `exactOptionalPropertyTypes`, optional fields `description`, `convertedTo`, and `droppedReason` must be omitted entirely (not set to `undefined`) — use conditional spread pattern (e.g., `...(description ? { description } : {})`).
  - `task-lifecycle.ts`: handles DROP_TASK and CONVERT_TASK — updates task status, sets droppedReason or convertedTo. CONVERT_TASK **must inline** quest/epic creation using tree helpers (`setEntry`, `addQuestToOverview`/`addEpicToOverview`, `appendActivityLog`). Do NOT call `reduce()` recursively — this violates INV-003 purity assumptions and the single-event-per-commit model. CONVERT_TASK handler steps:
    1. Guard task exists and status is "open"
    2. Guard no duplicate name in the target namespace: if `to === "quest"`, check `hasChild(state, "quests", name)`; if `to === "epic"`, check `hasChild(state, "epics", name)`
    3. Update task status to "converted", set `convertedTo: { type, name }`
    4. Update tasks overview entry status
    5. Create quest/epic JSON via `setEntry()` — quest gets `{ name, goal, status: "created", refinement: null, created: ts, updated: ts }` where `goal = task.title + (description ? "\n\n" + description : "")`, epic gets `{ name, goal, status: "created", verifications: [], refinement: null, sliceSequence: [], created: ts, activated: null, updated: ts }` with the same `goal` derivation. All required schema fields must be present. Entity is in `created` status, ready for normal workflow.
    6. For `to === "epic"`, create 4 subdirectories via `setEntry()` mirroring `handleCreateEpic`: architecture/, research/, brainstorm/, prototypes/. For `to === "quest"`, no subdirs needed.
    7. Add new entity to quests/epics overview via `addQuestToOverview` (existing) or `addEpicToOverview` (new helper — create in `helpers.ts` to parallel `addQuestToOverview`; signature: `(state: ProjectState, epicName: string, status: string, ts: string) => ProjectState`; overview item shape: `{ name, status, created, completed: null }` — no `title` field, matching `handleCreateEpic` pattern)
    8. Append two activity log entries (one for convert, one for new entity creation)
- [x] Register handlers in `src/core/state/reduce.ts` handler record
- [x] Add task target type to `src/core/rpc/types.ts` Target union: `{ type: "task", name: string }`. Update ALL exhaustive switches over `Target.type`:
  1. `resolveEntityName()` in `src/core/rpc/types.ts`
  2. `resolveEntityJsonPath()` in `src/core/rpc/types.ts`
  3. `resolveEntityDir()` in `src/core/rpc/paths.ts` — add `case "task": return nodePath.join(projectDir, "tasks", target.name)`
  4. `buildBeginResult()` in `src/core/rpc/begin.ts`
  5. `resolvePathReferences()` in `src/core/rpc/paths.ts`
  6. `mapToBeginPhase()` in `src/core/rpc/paths.ts` — new phases return `{}` for paths
  7. `resolveForBeginPhase()` in `src/core/rpc/paths.ts` — new phases return `{}` for paths
- [x] Add `BeginPhase` values and payload types in `src/core/rpc/types.ts`:
  - Add `"create-task"` to `BeginPhase` (follows `"create-decision"` precedent). Add `BeginPayloadMap["create-task"]`: `{ name: string, title: string, description?: string, context?: TaskContext }`
  - Add `"drop-task"` to `BeginPhase`. Add `BeginPayloadMap["drop-task"]`: `{ reason: string }`
  - Add `"convert-task"` to `BeginPhase`. Add `BeginPayloadMap["convert-task"]`: `{ to: "quest" | "epic", name?: string, goal?: string }`
  - Add cases to `buildBeginEvent()` in `src/core/rpc/begin.ts`, and `mapToBeginPhase()` and `resolveForBeginPhase()` in `src/core/rpc/paths.ts` — all have exhaustive `never` defaults. New phases return `{}` for paths (lifecycle phases with no artifact paths), matching the existing pattern for `"create"`, `"abandon"`, etc.
- [x] Update `src/core/state/transitions/init.ts`: add `tasks/overview.json` creation with `{ items: [] }` alongside existing overview file creation (epics, slices, quests)
- [x] Add optional `title` to `overviewItemSchema` in `src/schemas/entities/overview.ts`: `title: z.string().optional()` — backward-compatible, additive. Needed for `task:list` to display titles from overview. With `exactOptionalPropertyTypes`, existing overview creation code should continue to omit `title` (valid with `.optional()`). CONVERT_TASK and `task-create.ts` handlers should include `title` using conditional spread pattern (`...(title ? { title } : {})`). Verify `commitState` round-trips existing overview files without adding `title: undefined`.
- [x] Update `tests/fitness/transition-completeness.test.ts`: add minimal event entries for the three new event types to `minimalEvents`:
  - `CREATE_TASK: { type: "CREATE_TASK", name: "t1", title: "Test task", ts }`
  - `DROP_TASK: { type: "DROP_TASK", name: "t1", reason: "not needed", ts }`
  - `CONVERT_TASK: { type: "CONVERT_TASK", name: "t1", to: "quest", convertedName: "q1", ts }`
  (The fitness function iterates `handlerKeys` and asserts each key is in `minimalEvents` before exercising `reduce()` — missing entries cause immediate test failure.)
- [x] Write unit tests in `tests/unit/state/task.test.ts`: CREATE_TASK, DROP_TASK, CONVERT_TASK (including quest/epic creation and converted entity fields), duplicate name rejection, invalid transitions, lazy overview creation

### Verification

- `bun run check` — lint passes
- `tsc --noEmit` — type check passes
- `bun test` — all tests pass including new task state machine tests
- State tree includes tasks after assembleState on a fixture with `.project/tasks/`

## Phase 2: CLI Commands

Implement all 5 `task:*` commands and integrate task count into `status --json`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `echo '{"title":"test"}' | goodplan task:create --json` → exits with VALIDATION_UNKNOWN_COMMAND
- [ ] `goodplan task:list --json` → exits with VALIDATION_UNKNOWN_COMMAND

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"fix-error-handling","title":"Fix error handling","description":"migrate.ts has wrong error codes"}' | goodplan task:create --json` → creates task, returns `{ entity, phase: "create-task", previousStatus: "none", newStatus: "open", paths: {} }`
- [ ] `goodplan task:list --json` → returns `{ items: [...], filter: "open" }` with only open tasks by default
- [ ] `goodplan task:list --all --json` → returns `{ items: [...], filter: "all" }` including converted/dropped
- [ ] `goodplan task:show --task <name> --json` → returns full task including context and description
- [ ] `goodplan task:drop --task <name> --reason "not worth doing" --json` → marks task as dropped
- [ ] `goodplan task:convert --task <name> --to quest --json` → creates quest from task, marks task as converted, returns standard `BeginResult` for the task transition (open → converted). Created quest verifiable via `quest:show`.
- [ ] `goodplan status --json` → `.artifacts` includes `openTasks` and `totalTasks` counts
- [ ] `goodplan schema --json` → shows all 5 task command schemas

### Tasks

- [ ] Create `src/commands/task/` directory with 5 command files:
  - `create.ts`: reads stdin (taskCreateInputSchema), calls `begin(projectDir, "create-task", { type: "task", name }, payload)`. Human output follows established pattern: `"<name>: (none) -> open"` with picocolors.
  - `list.ts`: bypasses RPC, reads `tasks/overview.json` via loadState. Filter to `status === "open"` by default. Add `--all` flag to include converted/dropped. Human output: indented line format matching existing list commands: `  bold(name)  title  status  (created date)`. When filtering, signal: "3 open tasks (use --all to show all 7)". JSON output includes `filter: "open" | "all"` field (intentional divergence from `quest:list` which returns only `{ items }` — tasks benefit from explicit filter state since filtering is the default).
  - `show.ts`: bypasses RPC, reads `tasks/<name>/task.json`. Requires `--task <name>` flag. Human output: formatted display of name, title, status, description, created, and context fields (git branch, active entities, capturedDuring)
  - `drop.ts`: uses `--task <name> --reason <text>` flags (matches `quest:abandon` pattern — no stdin for simple scalars). Calls `begin(projectDir, "drop-task", { type: "task", name }, { reason })`. Human output: `"<name>: open -> dropped"` with picocolors.
  - `convert.ts`: uses `--task <name> --to quest|epic --name <override> --goal <override>` flags (all fields are simple scalars — no stdin needed, eliminates `taskConvertInputSchema`). Calls `begin(projectDir, "convert-task", { type: "task", name }, payload)`. Auto-derives quest/epic name from task slug, goal from task title + description if not overridden via flags. Human output: `"<name>: open -> converted"` with picocolors, plus `"Created quest: <quest-name>"` (uses input name directly for human output).
- [ ] Register all 5 commands in `src/commands/main.ts` as `task:create`, `task:list`, `task:show`, `task:drop`, `task:convert`
- [ ] Add RPC handling for task operations in `src/core/rpc/begin.ts`: map `"create-task"`, `"drop-task"`, `"convert-task"` phases to the appropriate state events via `buildBeginEvent()`. `task:convert` returns standard `BeginResult` for the task transition (open → converted) — created quest/epic is verifiable via `quest:show`/`epic:show`.
- [ ] Register task input schemas in `src/commands/schema.ts`: import and register `taskCreateInputSchema` alongside existing entity schemas (INV-006 compliance). No `taskConvertInputSchema` needed since `task:convert` uses all-flags. For `task:list`, `registerCommand()` must include `all` as an optional boolean arg (mirroring `slice:list`'s `epic` arg) and use description: "List tasks. Defaults to open tasks only; use --all to include converted/dropped. JSON includes filter field."
- [ ] Update `src/commands/global/status.ts`:
  - Add `openTasks` and `totalTasks` to `countArtifacts()` by reading `tasks/overview.json`
  - Update `formatStatusHuman()` to display task count (e.g., "Tasks: 3 open")
- [ ] Update `src/schemas/commands/status.ts`: add `openTasks` and `totalTasks` to `artifactsSchema`
- [ ] Update `tests/fitness/stateless-commands.test.ts` for the new task commands:
  - Add `"task:list"` and `"task:show"` to `READ_ONLY_COMMANDS`
  - Add `"task:create"` to `STDIN_ENTITY_COMMANDS`
  - Add `"task"` to `ENTITY_ARGS` (needed so `task:drop` and `task:convert`, which use `--task`, register as valid mutation commands rather than violations)
- [ ] Write tests in `tests/unit/commands/task/task-commands.test.ts`: Tests use `reduce()` directly (unit tests, not integration — no integration test pattern exists yet). Cover: create → list → show → drop cycle, create → convert → verify quest exists cycle, status includes task counts, duplicate name rejection, drop/convert on non-existent task. Confirm existing `StateErrorCode` values cover task error cases (reuse `STATE_INVALID_TRANSITION` per established pattern).

### Verification

- `bun run check` — lint passes
- `tsc --noEmit` — type check passes
- `bun test` — all tests pass including new unit tests
- Full CLI cycle works: create a task, list it, show it, drop it. Create another, convert to quest, verify quest exists via `quest:show`
- Run the full create/list/show/drop/convert cycle with `--json` flags and verify output shapes match the Expected Behavior section (primary consumers are LLM skills using `--json`)

## Phase 3: /capture Skill & project-status Integration

Create the `/capture` skill for frictionless task creation and update `/project-status` to display tasks.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/capture/SKILL.md` → no such file (skill doesn't exist)
- [ ] `grep "task" skills/project-status/SKILL.md` → no task-related content

**After implementation** (should pass / show presence):
- [ ] `ls skills/capture/SKILL.md` → skill file exists
- [ ] Skill SKILL.md contains steps for running `goodplan status --json` and `git branch --show-current` to collect context
- [ ] Skill SKILL.md specifies two paths: inline capture (user provides description with trigger) and bare `/capture` (asks user what they noticed)
- [ ] `grep "task\|Task" skills/project-status/SKILL.md` → project-status mentions open task count

### Tasks

- [x] Create `skills/capture/SKILL.md` with:
  - Frontmatter: `name: capture`, `requires: goodplan >= 1.0.0`, `description: Quick capture of a bug, idea, or improvement noticed during current work — creates a lightweight task without breaking flow. For quick lightweight notes only, not for research (/explore) or large-scope work (/create-epic).`
  - Trigger: `/capture`, "capture this", "note this" — avoid overly generic triggers like "todo:" and "remember to" which false-trigger in normal conversation
  - **Step 0**: Version check — run `goodplan --version --json` and verify compatibility
  - **Step 1**: Load `../_shared/references/cli-interaction.md` (relative to this skill's directory) for CLI interaction conventions
  - **Context auto-collection**: Run `goodplan status --json` to get active slice/quest/epic. Run `git branch --show-current` for git branch. Read the active entity's goal.md for a 1-line summary. Derive `capturedDuring` from conversation context and system state (e.g., "implementing slice foo-bar", "planning quest task-capture").
  - **Smart judgment flow**:
    1. If the user provided a clear description inline (e.g., "/capture the error handling in migrate.ts needs fixing"): auto-derive title and name from description (slugify title: lowercase, replace spaces and non-alphanumeric characters with hyphens, collapse consecutive hyphens, strip leading/trailing hyphens, truncate to 50 chars), fill context automatically, create task immediately via `echo '{"name":"...","title":"...","description":"...","context":{...}}' | goodplan task:create --json`. Present what was captured.
    2. If the user just said "/capture" with no description: ask "What did you notice?" via AskUserQuestion. Based on the answer, determine if more context is needed. If the answer is clear and actionable, create immediately. If vague, ask "What should be done about it?"
    3. Never ask more than 2 questions. If 2 questions haven't produced enough context, create with what you have — something captured is better than nothing.
  - **Output**: One-liner summary, e.g., `Captured: **Fix error handling** (while working on migrate slice, branch: feat/migrate)`. Don't interrupt the user's flow.
  - **CLI interaction**: Use `--json` for all CLI calls.
- [x] Update `skills/project-status/SKILL.md`:
  - In both Format A and Format B templates, add a "**Tasks**: N open" line after the existing artifact counts section. Only show if `openTasks > 0` in `status --json` response.
- [x] Register the skill in the install script (`scripts/install-skills.sh`) — add `capture` to the skills list
- [x] Run `bun run install:skills` to install the new skill
- [x] Update architecture docs:
  - `.project/architecture/transition-tables.md`: Add "Task" section with transitions: `(none) → CREATE_TASK → open`, `open → DROP_TASK → dropped`, `open → CONVERT_TASK → converted`. Guards: duplicate name rejection, invalid transitions on terminal states. Add `converted` and `dropped` to Terminal States section.
  - `.project/architecture/data-model.md`: Add task entity description (schema, context snapshot fields, relationship to quests/epics via convert)
  - `.project/architecture/_overview.md`: Update subsystem notes to include task entity

### Verification

- `bun run install:skills` — installs without errors, `capture` skill appears in output
- Read the installed skill at `~/.claude/skills/capture/SKILL.md` and confirm it follows cli-interaction.md conventions (version check, reference loading, frontmatter) and specifies both paths: inline capture (description provided with trigger) and bare `/capture` (asks what user noticed)
- End-to-end: install skill (`bun run install:skills`), create task via CLI, verify `task:list --json` shows it, verify `status --json` includes `openTasks` count
- Run `goodplan status --json` on a project with tasks — confirm `openTasks`/`totalTasks` present
