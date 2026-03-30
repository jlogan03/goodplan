# Plan: Task Capture

## Overview

Add a lightweight task capture system to goodplan — a "junk drawer" for thoughts, bugs, and ideas noticed during work. Three layers: (1) task entity schema + state machine, (2) 5 CLI commands (`task:create/list/show/convert/drop`), (3) a `/capture` skill that auto-grabs context and creates tasks with minimal friction.

Tasks store structured context snapshots (active slice/quest/epic, git branch, what the user was doing) so they remain actionable when revisited later. The `/capture` skill uses judgment to determine if it has enough context to create the task automatically or needs to ask the user clarifying questions. `task:convert` atomically creates a quest/epic from a task and checks for related open tasks to bundle.

Follows established entity patterns (quest/slice). Uses overview.json for fast listing, state machine events for lifecycle, schema registry for state tree inclusion.

## Phase 1: Task Entity & Schema

Define the task data model, state machine events, and state machine handlers so tasks can be created and managed programmatically.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r "taskSchema\|task\.json" src/schemas/` → no matches (task entity doesn't exist)
- [ ] `grep "CREATE_TASK" src/schemas/state-events.ts` → no matches (no task events)
- [ ] `grep "tasks" src/core/data/schema-registry.ts` → no matches (tasks not in registry)

**After implementation** (should pass / show presence):
- [ ] `grep -r "taskSchema" src/schemas/entities/` → task schema defined with context snapshot fields
- [ ] `grep "CREATE_TASK\|DROP_TASK\|CONVERT_TASK" src/schemas/state-events.ts` → all 3 events defined
- [ ] `grep "tasks" src/core/data/schema-registry.ts` → tasks/overview.json and tasks/*/task.json patterns registered
- [ ] `bun test` — all existing tests pass + new unit tests for task state transitions

### Tasks

- [ ] Create `src/schemas/entities/task.ts` with Zod schemas:
  - `taskContextSchema`: `{ activeSlice?: string, activeQuest?: string, activeEpic?: string, gitBranch?: string, capturedDuring?: string }`
  - `taskStatusSchema`: `z.enum(["open", "converted", "dropped"])`
  - `taskSchema`: `{ name: string, title: string, status: taskStatusSchema, created: timestampSchema, context: taskContextSchema, convertedTo?: { type: "quest" | "epic", name: string }, droppedReason?: string, description?: string }`
  - Export `z.infer` types for all schemas
- [ ] Create `src/schemas/commands/task.ts` with Zod stdin schemas:
  - `taskCreateInputSchema`: `{ title: string, description?: string, context?: taskContextSchema }`
  - `taskDropInputSchema`: `{ reason: string }`
  - `taskConvertInputSchema`: `{ to: "quest" | "epic" }`
- [ ] Add task state events to `src/schemas/state-events.ts`:
  - `CREATE_TASK`: `{ type: "CREATE_TASK", name: string, title: string, description?: string, context?: TaskContext, ts: string }`
  - `DROP_TASK`: `{ type: "DROP_TASK", name: string, reason: string, ts: string }`
  - `CONVERT_TASK`: `{ type: "CONVERT_TASK", name: string, to: "quest" | "epic", convertedName: string, ts: string }`
  - Add all to `StateEvent` discriminated union
- [ ] Add schema registry entries in `src/core/data/schema-registry.ts`:
  - `{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema }`
  - `{ pattern: /^tasks\/[^/]+\/task\.json$/, schema: taskSchema }`
- [ ] Create state machine handlers in `src/core/state/transitions/`:
  - `task-create.ts`: handles CREATE_TASK — creates `tasks/<name>/task.json`, adds to `tasks/overview.json`
  - `task-lifecycle.ts`: handles DROP_TASK and CONVERT_TASK — updates task status, sets droppedReason or convertedTo. CONVERT_TASK also creates the quest/epic entity (reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic)
- [ ] Register handlers in `src/core/state/reduce.ts` handler record
- [ ] Add task target type to `src/core/rpc/types.ts` Target union: `{ type: "task", name: string }`
- [ ] Write unit tests in `tests/unit/state/task.test.ts`: CREATE_TASK, DROP_TASK, CONVERT_TASK (including quest/epic creation), duplicate name rejection, invalid transitions

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
- [ ] `echo '{"title":"Fix error handling","description":"migrate.ts has wrong error codes"}' | goodplan task:create --json` → creates task, returns `{ entity, newStatus: "open" }`
- [ ] `goodplan task:list --json` → returns `{ items: [{ name, title, status, created }] }` with only open tasks by default
- [ ] `goodplan task:show --task <name> --json` → returns full task including context and description
- [ ] `echo '{"reason":"not worth doing"}' | goodplan task:drop --task <name> --json` → marks task as dropped
- [ ] `echo '{"to":"quest"}' | goodplan task:convert --task <name> --json` → creates quest from task, marks task as converted, returns `{ task: { status: "converted", convertedTo: { type: "quest", name } }, created: { entity, type: "quest" } }`
- [ ] `goodplan status --json` → `.artifacts` includes `openTasks` and `totalTasks` counts

### Tasks

- [ ] Create `src/commands/task/` directory with 5 command files:
  - `create.ts`: reads stdin (taskCreateInputSchema), calls `begin(projectDir, "create", { type: "task", name: slugify(title) }, payload)`. Generate name from title using kebab-case slug (same pattern as other entities). Human output: "Created task: <name>"
  - `list.ts`: bypasses RPC, reads `tasks/overview.json` via loadState. Filter to `status === "open"` by default. Add `--all` flag to include converted/dropped. Human output: table with name, title, created date, status
  - `show.ts`: bypasses RPC, reads `tasks/<name>/task.json`. Requires `--task <name>` flag. Human output: formatted task with context
  - `drop.ts`: reads stdin (taskDropInputSchema), calls RPC to dispatch DROP_TASK. Requires `--task <name>` flag. Human output: "Dropped task: <name>"
  - `convert.ts`: reads stdin (taskConvertInputSchema), calls RPC to dispatch CONVERT_TASK. Requires `--task <name>` flag. Auto-derives quest/epic name from task slug, goal from task title + description. Human output: "Converted task <name> to quest <quest-name>"
- [ ] Register all 5 commands in `src/commands/main.ts` as `task:create`, `task:list`, `task:show`, `task:drop`, `task:convert`
- [ ] Add RPC handling for task operations in `src/core/rpc/begin.ts` (or equivalent): map task create/drop/convert to the appropriate state events
- [ ] Update `src/commands/global/status.ts`:
  - Add `openTasks` and `totalTasks` to `countArtifacts()` by reading `tasks/overview.json`
  - Update `formatStatusHuman()` to display task count (e.g., "Tasks: 3 open")
- [ ] Update `src/schemas/commands/status.ts`: add `openTasks` and `totalTasks` to `artifactsSchema`
- [ ] Write integration tests in `tests/integration/task.test.ts`: create → list → show → drop cycle, create → convert → verify quest exists cycle, status includes task counts, duplicate name rejection, drop/convert on non-existent task

### Verification

- `bun run check` — lint passes
- `tsc --noEmit` — type check passes
- `bun test` — all tests pass including new integration tests
- Full CLI cycle works: create a task, list it, show it, drop it. Create another, convert to quest, verify quest exists via `quest:show`

## Phase 3: /capture Skill & project-status Integration

Create the `/capture` skill for frictionless task creation and update `/project-status` to display tasks.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/capture/SKILL.md` → no such file (skill doesn't exist)
- [ ] `grep "task" skills/project-status/SKILL.md` → no task-related content

**After implementation** (should pass / show presence):
- [ ] `ls skills/capture/SKILL.md` → skill file exists
- [ ] Skill auto-captures context from `goodplan status --json` and `git branch`
- [ ] Skill uses judgment: creates task immediately if context is sufficient, asks clarifying questions if ambiguous
- [ ] `grep "task\|Task" skills/project-status/SKILL.md` → project-status mentions open task count

### Tasks

- [ ] Create `skills/capture/SKILL.md` with:
  - Trigger: `/capture`, "capture this", "note this", "remember to", "task:", "todo:"
  - **Context auto-collection**: Run `goodplan status --json` to get active slice/quest/epic. Run `git branch --show-current` for git branch. Read the active entity's goal.md for a 1-line summary. Derive `capturedDuring` from conversation context and system state.
  - **Smart judgment flow**:
    1. If the user provided a clear description inline (e.g., "/capture the error handling in migrate.ts needs fixing"): auto-derive title from description, fill context automatically, create task immediately via `echo '{"title":"...","description":"...","context":{...}}' | goodplan task:create --json`. Present what was captured.
    2. If the user just said "/capture" with no description: ask "What did you notice?" via AskUserQuestion. Based on the answer, determine if more context is needed. If the answer is clear and actionable, create immediately. If vague, ask "What should be done about it?"
    3. Never ask more than 2 questions. If 2 questions haven't produced enough context, create with what you have — something captured is better than nothing.
  - **Output**: Show what was captured in a brief summary (title, key context). Don't interrupt the user's flow.
  - **CLI interaction**: Follow `../_shared/references/cli-interaction.md` conventions. Use `--json` for all CLI calls.
- [ ] Update `skills/project-status/SKILL.md`:
  - In the status output template, add a "Tasks" line showing open task count (e.g., "**Tasks**: 3 open"). Only show if `openTasks > 0` in `status --json` response.
- [ ] Register the skill in the install script (`scripts/install-skills.sh`) — add `capture` to the skills list
- [ ] Run `bun run install:skills` to install the new skill

### Verification

- `bun run install:skills` — installs without errors, `capture` skill appears in output
- Read the installed skill at `~/.claude/skills/capture/SKILL.md` and confirm it follows cli-interaction.md conventions
- Run `goodplan status --json` on a project with tasks — confirm `openTasks`/`totalTasks` present
