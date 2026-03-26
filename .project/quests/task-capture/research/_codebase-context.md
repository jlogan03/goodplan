# Codebase Context: Task Capture Quest

## Entity Schema Pattern

All entities follow the same structure. Use quest as the closest template since tasks are also project-scoped (no epic field).

**Entity schema** (`src/schemas/entities/quest.ts`):
- Zod schema with status enum, timestamps, and entity-specific fields
- Exports both schema and `z.infer` type
- Imports `refinementSchema` and `timestampSchema` from `../shared.js`

**Task differences from quest**: Tasks won't have `refinement` (no plan/refine cycle). They'll have `context`, `convertedTo`, `droppedReason`, `title`, `description` instead.

**Overview schema** (`src/schemas/entities/overview.ts`): Shared across all entity types. Items have `{ name, status, epic?, created, completed }`. Task overview items will need `title` added since tasks use title (not name) for display.

**Schema registry** (`src/core/data/schema-registry.ts`): Pattern-based regex matching. Add two entries:
```
{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema }
{ pattern: /^tasks\/[^/]+\/task\.json$/, schema: taskSchema }
```

## State Events Pattern

**`src/schemas/state-events.ts`**: Single `StateEvent` discriminated union type. All events carry `ts: string` (injected by RPC layer). Task needs 3 new event types: `CREATE_TASK`, `DROP_TASK`, `CONVERT_TASK`.

**Gotcha**: The `satisfies` check in `reduce.ts` enforces compile-time exhaustiveness -- every event type in the union MUST have a handler. Adding events without handlers will cause a build failure.

## State Machine Transition Pattern

**Handler signature** (`src/core/state/reduce.ts`):
```typescript
type Handler<T> = (state: ProjectState, event: Extract<StateEvent, { type: T }>) => ProjectState | StateError;
```

**Handler record**: Object with `satisfies { [K in StateEvent['type']]: Handler<K> }`. Adding a new event type to `StateEvent` without adding it here causes a compile error.

**Transition handler files** (`src/core/state/transitions/`):
- `quest-create.ts` — best template for `task-create.ts` (guard existence, create JSON, update overview, append activity log)
- `quest-abandon.ts` — template for `task-lifecycle.ts` (DROP_TASK)
- CONVERT_TASK is novel: needs to both update the task AND create a new quest/epic entity. Can either dispatch a sub-event or inline the creation logic using helpers from `helpers.ts`.

**Shared helpers** (`src/core/state/transitions/helpers.ts`):
- `getQuest`, `guardQuestStatus`, `setQuestJson`, `setQuestStatus`, `updateQuestOverviewStatus`, `addQuestToOverview`, `isQuestTerminal` — full set of quest helpers exists, need analogous task helpers
- `appendActivityLog(state, ts, phase, scope, summary)` — reuse directly

## RPC Layer Pattern

**Target union** (`src/core/rpc/types.ts`): Add `{ type: "task"; name: string }` to `Target` type. This union is used in exhaustive switches in `resolveEntityName()` and `resolveEntityJsonPath()` -- both must be updated.

**BeginPhase and BeginPayloadMap** (`src/core/rpc/types.ts`): Task operations need new phases. Options:
1. Add `"drop"` and `"convert"` to `BeginPhase` with payloads in `BeginPayloadMap`
2. Or reuse `"create"` (already handles quest/epic by target type) and add new phases for drop/convert

**begin.ts** (`src/core/rpc/begin.ts`): Maps `(phase, target, payload)` to `StateEvent` via `buildBeginEvent()`. Has exhaustive switch with `never` default. `buildCreateEvent()` already handles project/epic/slice/quest by target type -- add task case. New `buildDropEvent()` and `buildConvertEvent()` helpers needed.

**`buildBeginResult()`**: Already handles quest target type for status extraction -- add task case following same pattern.

## CLI Command Pattern

**Command structure** (`src/commands/quest/create.ts` is the template):
1. `defineCommand()` from citty with `meta`, `args`, `setup()`, `async run()`
2. Reads stdin via `readStdin()`, validates with `validateInput(schema, args, stdin)`
3. Calls `begin()` from RPC layer
4. Outputs result in 3 modes: `--json`/`--query`, human-readable, or quiet

**Command input schemas** (`src/schemas/commands/quest.ts`): Separate file for Zod stdin validation schemas. Task needs `src/schemas/commands/task.ts`.

**Registration** (`src/commands/main.ts`): Flat colon-namespaced subcommands (e.g., `"task:create": taskCreateCommand`). Import at top, register in `subCommands` object.

**Read-only commands** (`quest:list`, `quest:show`): Bypass RPC, use `loadState()` directly. Task list/show follow this pattern.

**Flag-based commands** (`quest:abandon`): Simple scalars use flags (not stdin). Task drop could use `--reason` flag (like quest abandon) or stdin.

## Status Command Integration

**`src/commands/global/status.ts`**:
- `countArtifacts()` builds `Artifacts` object -- add `openTasks` and `totalTasks` by reading `tasks/overview.json`
- `formatStatusHuman()` renders sections -- add "Tasks: N open" line
- `generateRecommendations()` -- consider adding task-related recommendations

**`src/schemas/commands/status.ts`**: `artifactsSchema` needs `openTasks` and `totalTasks` fields. This is a schema change that affects `goodplan status --json` output.

## Project Schema

**`src/schemas/entities/project.ts`**: Has `activeQuest: z.string().nullable()`. Tasks don't need an `activeTask` field (tasks are passive -- no active workflow state). No changes needed here.

## Test Pattern

**Unit tests** (`tests/unit/state/quest-create.test.ts` is the template):
- Import `ZERO_STATE`, `reduce`, `isStateError`, `getJson`, `getJsonl`
- Helper `initProject()` creates base state via `reduce(ZERO_STATE, INIT_PROJECT)`
- Tests: happy path (creates entity with correct fields), overview update, activity log entry, duplicate rejection, missing prerequisite rejection
- Each test is self-contained with fresh state

**Test file naming**: `tests/unit/state/task.test.ts` for state machine, `tests/unit/commands/task/task-commands.test.ts` for CLI commands.

**No integration tests currently exist** (tests/integration/ has only .gitkeep). The plan calls for integration tests in `tests/integration/task.test.ts`.

## Skill Pattern

**`skills/project-status/SKILL.md`**: Reads `status --json`, formats output. Add task count display when `openTasks > 0`.

**`scripts/install-skills.sh`**: Explicit skill directory list in `SKILL_DIRS` array. Add `capture` to this list.

**New skill** (`skills/capture/SKILL.md`): Follow existing SKILL.md frontmatter format (name, requires, description). Reference `../_shared/references/cli-interaction.md` for CLI interaction conventions.

## Documentation Freshness

| Area | Last Modified |
|---|---|
| `.project/architecture/` | 2026-03-26 (today -- fresh) |
| `.project/quests/task-capture/` | 2026-03-26 (today -- fresh) |

Architecture docs and quest definition are current.

## Recent Development Activity

Last 20 commits affecting plan areas (`src/schemas/`, `src/commands/`, `src/core/state/`, `src/core/rpc/`):
- Most recent: `[migrate-to-cli]` phases 1-4 (migration schemas, protocol types, state construction)
- Before that: `[show-status-enrich]` (artifact enrichment, result type paths, file arrays, semver)
- Before that: `[state-cmd-tracer]`, `[integration-test]`, `[decisions-learnings]`, `[sub-agent-commands]`

The codebase is actively developed with consistent patterns. No conflicting in-flight work.

## Key Gotchas and Constraints

1. **Exhaustive switches**: `StateEvent` union, `Target` union, `BeginPhase` union, and handler record all use exhaustive checking. Adding a new entity requires touching all of them simultaneously.

2. **`exactOptionalPropertyTypes`**: Zod `optional()` produces `T | undefined` but the TS config requires explicit handling. Use conditional spread pattern documented in `project_zod_optional_properties.md` memory.

3. **`noUncheckedIndexedAccess`**: Array/record access returns `T | undefined`. Must handle undefined from overview item lookups.

4. **CONVERT_TASK is the hardest part**: No existing event creates two entities atomically. Options: (a) inline quest/epic creation in the handler using existing helpers, (b) dispatch a sub-event by calling `reduce()` recursively (bad -- breaks purity assumptions), (c) build the target entity state directly using `setEntry()` and helper functions. Option (a) is cleanest.

5. **Task naming**: Tasks need a `name` (slug for filesystem) derived from `title`. Other entities receive `name` directly. The slugification happens at the command layer, not the state machine.

6. **Overview schema reuse**: The shared `overviewSchema` has `{ name, status, epic?, created, completed }`. Tasks might want `title` in overview items for display. Either extend overview or accept name-only listing.

7. **No `activeTask` on project.json**: Unlike quests (which set `project.activeQuest`), tasks are passive. No project.json changes needed.

8. **Init handler creates overview files**: `src/core/state/transitions/init.ts` creates `quests/overview.json` etc. Must also create `tasks/overview.json` for newly initialized projects. Existing projects need the overview file created on first task creation (or migration).

9. **Schema version**: Adding `openTasks`/`totalTasks` to status schema is backward-compatible (new fields with defaults) but consumers may not expect them.
