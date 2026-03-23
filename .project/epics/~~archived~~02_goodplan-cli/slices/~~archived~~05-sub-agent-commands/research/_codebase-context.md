# Codebase Context: Slice 05 — Sub-Agent Commands & Quest Lifecycle

Generated: 2026-03-22

## Fresh Documentation (reliable references)

All architecture files are **fresh** relative to the slice goal (2026-03-22 01:12). Most were updated same day or the day prior:

| File | Last Modified | Commit |
|------|--------------|--------|
| `architecture/state-machine-api.md` | 2026-03-22 17:00 | [slice-lifecycle] Phase 1 |
| `architecture/rpc-layer-api.md` | 2026-03-22 17:34 | [slice-lifecycle] Phase 3 |
| `architecture/_overview.md` | 2026-03-22 11:42 | [project-init] Complete slice |
| `architecture/commands-api.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `architecture/data-model.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `architecture/transition-tables.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `architecture/data-layer-api.md` | 2026-03-21 14:16 | Architecture: simplify data layer |
| `architecture/conventions.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `architecture/flows.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `architecture/invariants.md` | 2026-03-21 22:40 | Refine architecture: recursive tree model |
| `.project/conventions.md` | 2026-03-22 17:59 | [slice-lifecycle] Phase 5 |

**All documentation was updated within 24 hours of the goal being written. No stale docs detected.**

## Stale Documentation

None identified. All architecture docs reflect the recursive tree model and the 4-layer stack (state machine, data, RPC, commands) as implemented through slices 01-04.

## Recent Development Activity

The codebase has been built bottom-up through 4 completed slices, all within the last few days:

```
9e97f98 [sub-agent-commands] Create plan: 5 phases for quest lifecycle + context bundling
55c8ef4 [slice-lifecycle] Complete slice: learnings, arch updates, archive
1030bf2 [slice-lifecycle] Complete implementation
9596211 [slice-lifecycle] Phase 5: End-to-end integration
33062d6 [slice-lifecycle] Phase 4: Slice CLI commands
d9b1afc [slice-lifecycle] Phase 3: RPC layer wiring
454b4d0 [slice-lifecycle] Phase 2: Slice state machine transitions
0a977b6 [slice-lifecycle] Phase 1: StateEvent types & supporting schemas
...
e83e712 [epic-lifecycle] Phase 6: Submit commands + end-to-end integration
```

The most recent substantive code changes are from `slice-lifecycle` (slice 04), which established the slice entity lifecycle pattern this plan extends for quests.

## Key Patterns and Conventions from Existing Code

### 1. State Event Union (`src/schemas/state-events.ts`)

All events in a single discriminated union type `StateEvent`. Each event carries `ts: string` (injected by RPC layer). Current count: 28 events (16 epic, 9 slice, 3 quest submit stubs). The plan adds ~6 new quest lifecycle events (CREATE_QUEST, BEGIN_QUEST_PLAN, BEGIN_QUEST_REFINEMENT, BEGIN_QUEST_IMPLEMENTATION, COMPLETE_QUEST, ABANDON_QUEST).

Quest submit events already exist from slice 03/04:
- `COMPLETE_QUEST_PLAN`
- `COMPLETE_QUEST_REFINEMENT_ROUND`
- `COMPLETE_QUEST_IMPLEMENTATION`

### 2. Reducer Pattern (`src/core/state/reduce.ts`)

- `handlerRecord` object with `satisfies { [K in StateEvent['type']]: Handler<K> }` for compile-time exhaustiveness
- Converted to `Map<string, Handler>` for runtime lookup
- Handler type: `(state: ProjectState, event: Extract<StateEvent, {type: T}>) => ProjectState | StateError`
- Every new event type MUST be added to both the union AND the handler record (compiler enforces this)

### 3. Transition Handler File Organization (`src/core/state/transitions/`)

One file per entity/concern area:
- `init.ts` — INIT_PROJECT
- `epic-create.ts` — CREATE_EPIC
- `epic-lifecycle.ts` — ACTIVATE, COMPLETE, ABANDON epic
- `epic-phase.ts` — BEGIN/COMPLETE for explore, architecture, slicing
- `epic-refine.ts` — COMPLETE_REFINE_ARCHITECTURE, COMPLETE_REFINE_SLICES
- `epic-verify.ts` — ADD/UPDATE_VERIFICATION
- `slice-create.ts` — CREATE_SLICE
- `slice-plan.ts` — BEGIN_PLAN
- `slice-implement.ts` — BEGIN_IMPLEMENTATION, BEGIN_REFINEMENT
- `slice-submit.ts` — COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION + quest submit handlers
- `slice-complete.ts` — COMPLETE_SLICE
- `slice-abandon.ts` — ABANDON_SLICE
- `helpers.ts` — shared guard/set/get functions

Expected new files for quests: `quest-create.ts`, `quest-lifecycle.ts`, `quest-plan.ts`, `quest-implement.ts`, and consolidation of quest handlers currently in `slice-submit.ts`.

### 4. Helper Pattern (`src/core/state/transitions/helpers.ts`)

Established helper trios for each entity:
- `getXxx(state, name)` — reads entity JSON from state tree
- `guardXxxStatus(entity, name, expected, eventType)` — returns `Entity | StateError`
- `setXxxStatus(state, name, entity, newStatus, ts)` — updates entity + overview sync

**Quest helpers are currently LOCAL to `slice-submit.ts`** with `TODO(slice-05)` marker for consolidation:
- `getQuest()` — local, needs move to `helpers.ts`
- `setQuestJson()` — local, needs move to `helpers.ts`
- `guardQuestStatus()` — local, returns `StateError | null` (differs from slice/epic pattern which returns `Entity | StateError`). Plan specifies upgrading to match `guardSliceStatus` pattern.

### 5. RPC Layer Pattern (`src/core/rpc/`)

Three entry points: `begin()`, `complete()`, `submit()`. All follow identical structure:
1. `loadState(projectDir)` — reads entire `.project/` tree from filesystem
2. `buildXxxEvent(...)` — constructs StateEvent from typed inputs
3. `reduce(oldState, event)` — runs pure state machine
4. `commitState(projectDir, oldState, result)` — writes diffs to filesystem
5. `buildXxxResult(...)` — constructs typed result

**Quest gaps in RPC layer:**
- `begin.ts`: `buildCreateEvent` throws "not yet implemented" for `target.type === 'quest'`. Same for `buildAbandonEvent`. `buildPlanPhaseEvent`, `buildRefinePlanEvent`, `buildImplementEvent` only handle `slice` target.
- `complete.ts`: `buildCompleteEvent` throws "not yet implemented" for `target.type === 'quest'`. `buildCompleteResult` also unimplemented.
- `submit.ts`: Quest targets ARE wired for plan/refinement/implementation (already done in slice 03). `resolveStatuses` returns placeholder `"pre-submit"/"post-submit"` for quest targets — needs fix to read `quests/{name}/quest.json`.

### 6. RPC Types (`src/core/rpc/types.ts`)

- `Target` union already includes `{ type: "quest"; name: string }`
- `BeginPhase` type includes all phases needed; no additions expected
- `BeginPayloadMap` — quest create will reuse the `create` key (which has `name`, `goal?`, `epic?`; quest ignores `epic`)
- `CompleteInput` already has `{ type: "quest"; verificationPassed: boolean }` variant
- `SubmitInput` — no quest-specific additions needed (reuses existing plan/refinement/implementation phases)

### 7. CLI Command Pattern (`src/commands/`)

Two command styles:
- **Entity commands** (`epic:create`, `slice:plan`): colon-namespaced, registered in `subCommands` of `mainCommand`. Use `begin()` or `complete()` RPC.
- **Submit commands** (`submit-plan`, `submit-refinement`): flat top-level, registered in `subCommands`. Use `submit()` RPC.

All commands follow identical structure:
1. `defineCommand()` from citty with `meta`, `args`, `setup()`, `async run()`
2. `readStdin()` + `validateInput(schema, args, stdin)` for input parsing
3. Call RPC function
4. Format output: JSON mode (`--json`), quiet mode (`--quiet`), or human-readable with picocolors

Submit commands accept `--slice` or `--quest` (mutually exclusive) and build `Target` accordingly. This pattern is already established and will be reused for `start-*` commands.

### 8. Input Validation Schemas (`src/schemas/commands/`)

- `epic.ts` — epic command input schemas
- `slice.ts` — slice command input schemas (e.g., `createSliceInputSchema`)
- `submit.ts` — submit command input schemas (`submitPlanInputSchema`, `submitRefinementInputSchema`, `submitImplementationInputSchema`)
- `status.ts` — status command schema

Quest command schemas need to be added (likely `quest.ts` for entity commands; submit schemas already handle `--quest` flag).

### 9. Entity Schemas (`src/schemas/entities/`)

- `quest.ts` already exists with `QuestStatus` enum matching slice: `created | planning | plan-created | refining | plan-refined | implementing | implementation-complete | completed | abandoned`
- `questSchema` has: `name`, `status`, `goal`, `refinement` (nullable), `created`, `updated`
- Quest schema has NO `epic` field (by design — quests are unassociated)
- Quest schema has NO `deferred` field (unlike slices)

### 10. State Tree (`src/core/tree.ts`)

Four entry types: `DirectoryEntry`, `JsonEntry<T>`, `JsonlEntry<T>`, `MarkdownEntry`. The tree is `ProjectState = DirectoryEntry` (root directory).

Key navigation functions: `getJson<T>()`, `getJsonl<T>()`, `setEntry()`, `hasChild()`.

**MarkdownEntry is defined but no traversal utilities exist yet.** The context bundling module (phase 04 of the plan) will need tree traversal to collect MarkdownEntry nodes for `--inline` content inlining.

### 11. Test Patterns (`tests/unit/`)

- **State tests** (`tests/unit/state/`): Test `reduce()` directly with manually constructed `ProjectState` fixtures via `setEntry()`. Assert on returned state or `isStateError()`. Use `ZERO_STATE` as starting point.
- **RPC tests** (`tests/unit/rpc/`): Use real filesystem (`fs.mkdtempSync` in tmpdir). Call `rpcInit()` + `begin()` + `submit()` etc. Assert on results and re-loaded state.
- **Command tests** (`tests/unit/commands/`): Test CLI commands at the command handler level.
- Test framework: vitest. Constants like `TS = "2026-01-01T00:00:00.000Z"` for deterministic timestamps.
- State fixture construction: `reduce(ZERO_STATE, { type: "INIT_PROJECT", ... })` then `setEntry()` to manually place entities in desired statuses.

### 12. Command Registration (`src/commands/main.ts`)

All commands registered in a single flat `subCommands` object. Currently 30 commands. Quest commands (`quest:create`, `quest:show`, etc.) and `start-*` commands need to be added here. Pattern is straightforward import + register.

### 13. Overview Sync Pattern

Both epic and slice entities maintain `overview.json` files (`epics/overview.json`, `slices/overview.json`). Every status change updates the overview. Quests will need similar overview sync if listed (the plan should clarify whether `quests/overview.json` is needed).

## Areas of Active Churn vs Stability

### Active churn (touched in last 2 slices)
- `src/core/state/transitions/` — new handler files added each slice
- `src/core/state/reduce.ts` — new handler imports + record entries each slice
- `src/schemas/state-events.ts` — new event types each slice
- `src/core/rpc/begin.ts` — new phase/target routing each slice
- `src/core/rpc/complete.ts` — new target routing each slice
- `src/commands/main.ts` — new command registrations each slice
- `src/core/rpc/types.ts` — new phase/payload types each slice

### Stable (established, unlikely to change)
- `src/core/tree.ts` — core tree types, stable since slice 01
- `src/core/data/load.ts`, `src/core/data/commit.ts` — data layer, stable since slice 02
- `src/core/state/transitions/helpers.ts` — grows additively (new helpers) but existing functions are stable
- `src/schemas/entities/` — entity schemas are stable once created; `quest.ts` already exists
- `src/util/` — utilities (errors, output, stdin, validate) stable since slice 01
- `src/commands/global-args.ts` — stable

### Novel (no precedent in codebase)
- `src/core/context/` — entirely new module for context bundling. No existing code to follow. Tree traversal for MarkdownEntry collection, budget-based content inlining, per-phase priority tables — all new concepts.
- `start-*` commands — new command pattern (read-only, no state mutation, returns context bundle instead of state transition result). All existing commands either mutate state or read state; none assemble context bundles.
