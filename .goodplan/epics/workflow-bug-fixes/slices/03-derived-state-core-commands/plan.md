# Implementation Plan: 03-derived-state-core-commands

## Goal

Build the derived state computer and replace v1 bootstrap commands (`gp init`, `gp status`, `gp schema`) with v2 event-sourced equivalents. The derived state computer is consumed by every subsequent command slice (04-12), making this the critical bridge between the engine layer (slices 01-02) and the command layer.

## Overview

5 phases, building bottom-up: derived state computer first, then commands that consume it, then migration detection.

- **Phase 1**: Derived state computer -- pure function from events to `DerivedStateData`
- **Phase 2**: `gp init` -- bootstrap `.goodplan/`, emit first event
- **Phase 3**: `gp status` -- consume derived state, replace v1 status command
- **Phase 4**: `gp schema` -- self-documenting command tree, replace v1 schema command
- **Phase 5**: `gp migrate` skeleton -- v1 detection and status report (not full migration)

Dependencies: slice 01 (event engine: append, replay) and slice 02 (invariant engine: beforeAppend hook, CheckContext). Both are complete.

### Dependency Direction

All new code respects the layer rules: `src/engine/derived-state/` depends only on `src/schemas/` and `src/util/`. Commands in `src/commands/` depend on the engine layer. No reverse dependencies.

**Circular dependency constraint**: `create-replay-get-context.ts` (in `src/engine/invariants/`) imports from `src/engine/derived-state/compute.ts`. The `derived-state/` module must NEVER import from `invariants/`. Dependency direction: `invariants/ -> derived-state/`, not the reverse.

---

## Phase 1: Derived State Computer

### Objective

Implement the `computeDerivedState` function as a pure reducer: replay all events from one or more scope logs and produce a `DerivedStateData` value. This is the foundation consumed by every command in subsequent slices.

### Files

| File | Action | Purpose |
|---|---|---|
| `src/schemas/entities/derived-state.ts` | Create | TypeScript interfaces for `DerivedStateData`, `ProjectState`, `EpicState`, `SliceState`, `SideQuestState`, `ChunkState`, `NextStep`, `Phase`, `SteeringPreference`, `Finding`. Zod schemas only for serialized form (`z.record()` for Maps). |
| `src/util/types.ts` | Create | `DeepReadonly<T>` recursive utility type handling `Map`, `Set`, `Array`, and plain objects. Used by `computeDerivedState` return type. |
| `src/engine/derived-state/compute.ts` | Create | `computeDerivedState(events: AnyEventEnvelope[]): DerivedStateData` -- the core reducer |
| `src/engine/derived-state/reducers.ts` | Create | Per-domain reducer functions: `reduceEntityLifecycle`, `reduceSpine`, `reduceRefinement`, etc. Called by `compute.ts` dispatching on `event.domain` |
| `src/engine/derived-state/accessors.ts` | Create | Standalone pure accessor functions: `currentPhase()`, `validTransitions()`, `blockers()`, `suggestedNextSteps()`, `convergenceState()`, `latestScores()` |
| `src/engine/derived-state/replay-all-scopes.ts` | Create | `replayAllScopes(projectDir: string): Promise<DerivedStateData>` -- reads project + all epic + all side-quest event logs, calls `computeDerivedState` per scope, merges into a single `DerivedStateData` |
| `src/engine/derived-state/index.ts` | Create | Public API barrel: `computeDerivedState`, `replayAllScopes`, accessor functions. Must use `export type` for type-only re-exports per `verbatimModuleSyntax`. |
| `src/engine/derived-state/serialize.ts` | Create | `serializeDerivedState(state: DerivedStateData): Record<string, unknown>` -- converts `Map` fields to `Record` for JSON output |
| `tests/engine/derived-state/compute.test.ts` | Create | Unit tests for `computeDerivedState` with synthetic event sequences |
| `tests/engine/derived-state/accessors.test.ts` | Create | Unit tests for accessor functions |
| `tests/engine/derived-state/replay-all-scopes.test.ts` | Create | Integration test: temp dir with multiple scope logs, verify merged state |
| `tests/engine/derived-state/serialize.test.ts` | Create | Round-trip tests for Map-to-Record serialization (including nested Maps) |
| `src/engine/invariants/types.ts` | Modify | Extend `CheckContext` with optional `derivedState` field |
| `src/engine/invariants/replay-context.ts` | Modify | Update `createReplayGetContext` to compute and inject `derivedState` |

### Implementation Details

**DerivedStateData types** (`src/schemas/entities/derived-state.ts`):

**Map vs Zod Record pattern**: Zod v4 has no `z.map()`. Define `DerivedStateData` and its nested types as TypeScript interfaces directly (not via `z.infer`). Use `z.record()` only in `serialize.ts` for the serialized JSON form. The reducer builds `Map` instances directly. This gives us type-safe Maps at runtime with clean JSON serialization.

**v1/v2 coexistence**: These v2 types (`ProjectState`, `EpicState`, etc.) coexist with v1 schemas in `src/schemas/entities/`. v1 schemas are used by existing commands not yet migrated. Cleanup happens as commands migrate in later slices.

Key types:

- `Phase` -- string literal union covering all phases (P0 through P12 for epics, S0-S3 for side-quests). Use `z.enum()` for the Zod schema (compile-time safety), and derive the TypeScript type from it. **Dual type pattern**: `Phase` uses `z.enum()` + `z.infer` because enum types benefit from Zod runtime validation. Parent interfaces (`EpicState`, `DerivedStateData`, etc.) are hand-written TypeScript interfaces because complex nested types with Maps cannot be expressed in Zod v4. This is intentional.
- `SteeringPreference` -- `"always-consult" | "best-guess-and-flag" | "ask-in-the-moment"`
- `ProjectState` -- `{ name: string; version: string; steeringPreference: SteeringPreference; initialized: boolean }`
- `EpicState` -- `{ dir: string; goal: ContentRef | null; architectureTarget: ContentRef | null; pressureTest: ContentRef | null; sliceSet: ContentRef | null; steeringPreference: SteeringPreference; phase: Phase; slices: Map<string, SliceState>; findings: Finding[]; ... }`
- `SliceState` -- `{ dir: string; goal: ContentRef | null; plan: ContentRef | null; phase: Phase; chunks: Map<string, ChunkState>; ... }`
- `SideQuestState` -- `{ dir: string; goal: ContentRef | null; plan: ContentRef | null; phase: Phase; chunks: Map<string, ChunkState>; ... }`
- `DerivedStateData` -- `{ project: ProjectState; epics: Map<string, EpicState>; sideQuests: Map<string, SideQuestState>; convergenceSnapshots: Map<string, ConvergenceSnapshot>; latestDimensionScores: Map<string, DimensionScore[]> }`

**Scope merge semantics**: Project-scope replay produces `ProjectState`. Each epic-scope replay produces one `EpicState` (with nested `SliceState` entries). Each side-quest-scope replay produces one `SideQuestState`. `replayAllScopes` collects these into `DerivedStateData`. No cross-scope references in this slice.

For now, `ConvergenceSnapshot` and `DimensionScore` can be defined as placeholder types (opaque objects). The trust layer (slice 04+) will flesh them out. The key requirement is that the Map key scheme (`${scopeRef}:${artifactType}`) is established.

**Core reducer** (`compute.ts`):

```typescript
export function computeDerivedState(events: AnyEventEnvelope[]): Readonly<DerivedStateData> {
  const state = createEmptyState();
  for (const event of events) {
    applyEvent(state, event);
  }
  return state; // return type uses Readonly<> / DeepReadonly for immutability signal; no runtime freeze
}
```

Use TypeScript `Readonly<>` / `DeepReadonly` types instead of runtime `Object.freeze`. More idiomatic, zero runtime cost, and avoids the shallow-freeze confusion (nested Maps would not be frozen anyway).

**`DeepReadonly<T>` utility** (`src/util/types.ts`):

Define a recursive type that handles: `ReadonlyMap<K, DeepReadonly<V>>` for Maps, `ReadonlySet<DeepReadonly<T>>` for Sets, `ReadonlyArray<DeepReadonly<T>>` for arrays, and `{ readonly [K in keyof T]: DeepReadonly<T[K]> }` for plain objects. Primitives pass through unchanged. This is the return type of `computeDerivedState`.

**CheckContext extension**: Slice 02's `CheckContext` interface in `src/engine/invariants/types.ts` was designed for forward-compatible extension with derived state (see comment at line 14). In this phase, extend `CheckContext` with an optional `derivedState?: DerivedStateData` field and update `createReplayGetContext` to compute and inject it. This bridges the invariant engine and derived state computer. The field is optional so existing slice 02 invariants continue to work unchanged -- new invariants in later slices can use it for richer checks.

**CheckContext extension details**: `createReplayGetContext` must use the conditional spread pattern when building `CheckContext` to satisfy `exactOptionalPropertyTypes`: `...(derivedState !== undefined ? { derivedState } : {})`. The derived state is computed on the same event array already replayed for `CheckContext` -- no second file read or additional I/O.

The `applyEvent` function dispatches on `event.domain` then `event.type`. Use a switch/case structure. Unknown event types are silently skipped (forward compatibility per architecture spec).

**Reducers** (`reducers.ts`):

Implement per-domain reducers. Start with the event types needed for Phase 1-4 of this slice:
- `entity-lifecycle` domain: `project-initialized`, `epic-created`, `slice-created`, `side-quest-created`, `epic-activated`, `epic-paused`, `epic-resumed`, `epic-completed`, `epic-abandoned`, `slice-landed`, `slice-abandoned`, and all phase-boundary events listed in the Phase Detection section of `engine.md`
- `spine` domain: `architecture-committed`, `conventions-committed`, `subsystem-registered`
- Other domains: stub reducers that skip (log a debug message if `--verbose`)

For event types not yet needed, the reducer should do nothing (silently skip). This is expected -- we build incrementally.

**Phase detection**: Implement the phase detection logic from `engine.md` architecture doc. Scan events for the latest phase-boundary event and compute current phase. This is done inside the entity-lifecycle reducer as events are processed. Note: all entity-lifecycle events must be handled by the reducer, including `plan-shape-approved`, `slice-plan-committed`, and `slice-implementation-started`, even if not explicitly listed in the phase detection table -- they may update phase or other state fields.

**Multi-scope replay** (`replay-all-scopes.ts`):

This is a pragmatic I/O shell around the pure `computeDerivedState` reducer. `computeDerivedState` remains pure (no I/O). `replayAllScopes` is the thin orchestration layer that does filesystem discovery and file reads, then delegates to the pure reducer.

1. Read project-scope events from `.goodplan/events.jsonl`
2. Scan `.goodplan/epics/*/events.jsonl` for each epic (guard with `existsSync` -- directory may not exist after fresh init; return empty array)
3. Scan `.goodplan/side-quests/*/events.jsonl` for each side-quest (guard with `existsSync` -- directory may not exist after fresh init; return empty array)
4. Call `computeDerivedState` per scope
5. Merge epic/side-quest states into the project's `DerivedStateData`

Use `replayEvents` from `src/engine/events/` for each file. Use `fs.readdirSync` for filesystem discovery (consistent with `append.ts` pattern -- no `Bun.file` equivalents).

**Accessor functions** (`accessors.ts`):

Implement as standalone pure functions operating on `DerivedStateData`:
- `currentPhase(state, scopeRef)` -- look up epic/slice/side-quest by scopeRef, return phase
- `suggestedNextSteps(state)` -- scan all active entities, generate `NextStep[]` with command suggestions and priorities
- `blockers(state, scopeRef)` -- check invariant preconditions (e.g., "plan not yet committed")
- `validTransitions(state, scopeRef)` -- which commands are valid given current phase

The `suggestedNextSteps` function is critical for `gp status` output and skill guidance. It should produce the same kind of recommendations as the v1 `generateRecommendations` function but derived from event state rather than mutable JSON.

**Serialization** (`serialize.ts`):

Convert `Map<string, T>` fields to `Record<string, T>` for JSON output. This is used by commands when `--json` is specified. Conversion must be recursive: `DerivedStateData.epics` contains `EpicState` values with nested `slices: Map<string, SliceState>`, and `SliceState` has `chunks: Map<string, ChunkState>`.

The recursive Map-to-Record walker uses these type-narrowing rules:
1. `instanceof Map` -- convert via `Object.fromEntries()`, recursing into each value
2. `Array.isArray(x)` -- recurse element-wise
3. Plain objects (`Object.getPrototypeOf(x) === Object.prototype`) -- recursive descent into each property value
4. Everything else (primitives, Dates, class instances) -- pass through unchanged

Validate the serialized output with `z.record()` schemas for the serialized form.

### Expected Behavior

**Before:**
- No `src/engine/derived-state/` directory exists
- No way to compute current project state from events

**After:**
- `computeDerivedState([...events])` returns a typed `DerivedStateData` value
- Empty event array returns an empty/default state (project not initialized)
- A `project-initialized` event produces a state with `project.initialized === true` and `project.name` set
- Phase detection works: feeding epic-lifecycle events in order produces the correct phase progression
- `replayAllScopes(projectDir)` reads all scope logs and produces a merged state
- `serializeDerivedState(state)` produces a JSON-serializable object with Records instead of Maps
- All accessor functions return correct values for test event sequences

### Verification

1. `bun run test tests/engine/derived-state/` -- all unit tests pass
2. `bun run check` -- no lint/type errors
3. Verify test coverage: empty state, single project-initialized, epic lifecycle through P12, multi-epic merge, unknown event type skipping, serialization round-trip

---

## Phase 2: `gp init` (v2)

### Objective

Replace the v1 `gp init` command with a v2 version that creates the `.goodplan/` directory structure and appends a `project-initialized` event to the event log. This is the first command that writes to the event log.

### Files

| File | Action | Purpose |
|---|---|---|
| `src/schemas/events/project.ts` | Create | Zod schema for `project-initialized` event payload: `{ name: string }`. Named by entity (not domain) per architecture convention in `engine.md`. |
| `src/commands/global/init.ts` | Replace | v2 init command: create dir, append `project-initialized` event via event engine |
| `src/util/git-info.ts` | Create | Git branch/commit resolution utility (used by init and all future mutating commands) |
| `tests/engine/derived-state/init-integration.test.ts` | Create | Integration test: `gp init` in temp dir, verify event log and derived state |
| `tests/unit/commands/init.test.ts` | Replace | v2 unit tests for init command (delete v1 tests) |

### Implementation Details

**Event payload schema** (`src/schemas/events/project.ts`):

```typescript
import { z } from "zod";

export const projectInitializedPayloadSchema = z.object({
  name: z.string().min(1),
});

export type ProjectInitializedPayload = z.infer<typeof projectInitializedPayloadSchema>;
```

This is the first file in `src/schemas/events/`. Establish the directory and naming convention: one file per entity (e.g., `project.ts`, `epic.ts`, `slice.ts`), matching the architecture doc's (`engine.md`) schema organization section.

**v1/v2 event schema coexistence**: The v2 `src/schemas/events/` directory coexists with the v1 `src/schemas/state-events.ts` file. v1 state events are used by existing commands not yet migrated. Both will coexist until all commands are migrated, at which point v1 state-events.ts can be removed.

**`gp init` event set**: The architecture spec (`commands.md`) says `gp init` emits 4 events: `project-initialized`, `architecture-committed`, `conventions-committed`, and `subsystem-registered` (per subsystem). For this slice, init only emits `project-initialized`. The other 3 events are deferred to spine commands (slice 07) because they require spine subsystem infrastructure (`ContentRef` for architecture/conventions files, subsystem registration logic) that is not yet built. This is intentional -- `gp init` in this slice bootstraps the project; spine population happens when the user runs spine commands.

**v2 init command** (`src/commands/global/init.ts`):

Replace the v1 init entirely. The new command:

1. Check if `.goodplan/` exists -- fail with `ALREADY_EXISTS` error code (v2 error codes per `commands.md`)
2. Create `.goodplan/` directory
3. Resolve git branch and commitHint for the event envelope
4. Call `appendEvent` from `src/engine/events/` with:
   - `eventsPath`: `.goodplan/events.jsonl`
   - `scope`: `"project"`
   - `scopeRef`: `null`
   - `actor`: `{ kind: "cli", id: "gp:init" }`
   - `domain`: `"entity-lifecycle"`
   - `type`: `"project-initialized"`
   - `payload`: `{ name: projectName }`
   - `beforeAppend`: wire up the invariant engine's `createBeforeAppendHook` (the `project.exists` invariant should allow `project-initialized` as the first event)
5. Output result per `MutatingCommandOutput` contract: `{ ok: true, event: eventId, entity: "project" }`
6. Human-readable mode: `Initialized project "name" in .goodplan/`

**Git branch/commit resolution**: Create a small utility function (e.g., `src/util/git-info.ts`) that runs `git rev-parse --abbrev-ref HEAD` and `git rev-parse HEAD` to populate `branch` and `commitHint`. Use `Bun.spawnSync` or `child_process.execSync`. Return defaults if not in a git repo (`branch: "unknown"`, `commitHint: null`).

**Idempotency**: The command should fail gracefully if `.goodplan/` already exists, matching v1 behavior. Use the v2 error code `ALREADY_EXISTS` instead of v1's `STATE_ALREADY_INITIALIZED`.

**Delete v1 dependencies**: The v1 init command imports from `core/data/project.ts` and `core/rpc/init.ts`. The v2 version should import from `engine/events/` and `engine/derived-state/` instead. Keep the citty command structure (`defineCommand`).

**v1 test replacement**: Delete `tests/unit/commands/init.test.ts` content and rewrite with v2 tests. The v2 tests should:
- Verify event log creation with correct first event
- Verify `project-initialized` event has correct payload
- Verify idempotency (second init fails with ALREADY_EXISTS)
- Verify `--json` output matches `MutatingCommandOutput`
- Verify `--name` flag sets project name

### Expected Behavior

**Before:**
- `gp init` creates `.goodplan/` via v1 state machine (writes `project.json`, `state.json`, etc.)
- No event log exists after init

**After:**
- `gp init --name my-project` creates `.goodplan/` and appends `project-initialized` event to `.goodplan/events.jsonl`
- `gp init --json` returns `{ ok: true, event: "<uuid>", entity: "project" }`
- Running `gp init` again in same directory returns error with code `ALREADY_EXISTS`
- `computeDerivedState(replayEvents(".goodplan/events.jsonl"))` returns state with `project.name === "my-project"` and `project.initialized === true`

### Verification

1. `bun run test tests/unit/commands/init.test.ts` -- v2 tests pass
2. `bun run test tests/engine/derived-state/init-integration.test.ts` -- integration test passes
3. `bun run check` -- no lint/type errors
4. Manual smoke: run `./gp init --name test-proj --json` in a temp dir, verify JSON output and event log contents

---

## Phase 3: `gp status` (v2)

### Objective

Replace the v1 `gp status` command with a v2 version that computes project state from the event log via the derived state computer. The `--json` output must remain compatible with what skills expect (specifically the `StatusResult` shape from `src/schemas/commands/status.ts`).

### Files

| File | Action | Purpose |
|---|---|---|
| `src/schemas/commands/status.ts` | Modify | Update schema to reflect v2 output shape (add `suggestedNextSteps`, `latestBriefing`; maintain backward-compat fields) |
| `src/commands/global/status.ts` | Replace | v2 status command: consume `replayAllScopes` + `serializeDerivedState` |
| `src/commands/global/status/build-result.ts` | Create | Pure `buildStatusResult(state: DerivedStateData): StatusResult` function (command layer, no engine dependency). Sub-package convention: use a subdirectory under `src/commands/global/` when a command has helper modules beyond the citty command definition. Single-file commands remain flat. |
| `tests/unit/commands/status.test.ts` | Replace | v2 unit tests |
| `tests/unit/schemas/status.test.ts` | Update | Update schema tests if shape changes |

### Implementation Details

**Output shape compatibility**: The v2 `gp status --json` output must include the fields that skills currently depend on. Based on the v1 `StatusResult` schema:

```typescript
{
  project: { name, version },
  activeEpic: { name, status } | null,
  activeSlice: { name, status } | null,
  activeQuest: { name, status } | null,  // v2: may map to side-quest
  artifacts: { architecture, research, brainstorm, prototypes, decisions, learnings, ... },
  recommendations: string[],
  warnings: string[],
}
```

The v2 architecture adds `suggestedNextSteps: NextStep[]` and `latestBriefing: BriefingSummary | null`. Add these as new fields. Keep `recommendations` for backward compatibility -- populate it from `suggestedNextSteps[].description` so existing skills continue to work.

**v2 status command** (`src/commands/global/status.ts`):

1. Resolve project directory (walk up from cwd to find `.goodplan/`)
2. Call `replayAllScopes(projectDir)` to get `DerivedStateData`
3. Call `buildStatusResult(state)` from `src/commands/global/status/build-result.ts`
4. Serialize and output

**v2 `buildStatusResult` function** (`src/commands/global/status/build-result.ts`):

Pure function taking `DerivedStateData` as input (not reading from filesystem directly like v1). This makes it testable without filesystem setup. Builds `StatusResult` from derived state:

- `project.name` from `state.project.name`
- `project.version` -- the CLI version (from `package.json` or `version.ts`), not a state version
- `activeEpic` -- find the epic in active phase (P6-P12) on current branch
- `activeSlice` -- find the slice in active phase (P10-P11) within the active epic
- `activeQuest` -- find the active side-quest on current branch (map to the v1 "quest" field for compat). Phase-to-status mapping: S0->"created", S1->"planning", S2->"implementing", S3->"completed", "abandoned"->null (excluded from activeQuest)
- `artifacts` -- see artifact sourcing below
- `recommendations` -- from `suggestedNextSteps(state).map(s => s.description)`
- `warnings` -- stale entity detection using event timestamps

**`MutatingCommandOutput.phase?` note**: The optional `phase` field on `MutatingCommandOutput` requires the conditional spread pattern for `exactOptionalPropertyTypes`: `...(phase !== undefined ? { phase } : {})`.

**Artifact sourcing in v2 (backward-compat)**: Explicitly, each artifact field is populated from:

| Field | Source in this slice |
|---|---|
| `completedSlices` / `totalSlices` | Derived state: count slices by phase from epic events |
| `decisions` | Derived state: count `decision-recorded` events |
| `learnings` | Derived state: count `learning-captured` events |
| `openTasks` / `totalTasks` | Derived state: count `finding-captured` / `finding-triaged` events |
| `architecture` | Filesystem scanning fallback: `.goodplan/architecture/*.md` + `.goodplan/epics/*/architecture/*.md` |
| `research` | Filesystem scanning fallback: `.goodplan/research/*.md` + `.goodplan/epics/*/research/*.md` |
| `brainstorm` | Filesystem scanning fallback: `.goodplan/brainstorm/*.md` + `.goodplan/epics/*/brainstorm/*.md` |
| `prototypes` | Filesystem scanning fallback: `.goodplan/prototypes/*/` + `.goodplan/epics/*/prototypes/*/` |

Port these glob patterns from v1 `buildStatusResult` in `src/commands/global/status.ts`. This hybrid approach maintains backward compatibility. As artifact-tracking events are added in later slices, the filesystem fallback can be removed field by field.

**Human-readable output**: Rewrite `formatStatusHuman` to use derived state fields. Keep the same visual structure (project name, active work, progress, artifacts, recommendations, warnings) but source data from `DerivedStateData`.

**`resolveProjectDir` utility**: The v1 version walks up the directory tree. Keep this behavior for v2 -- create a standalone utility if the v1 one has too many dependencies, or reuse it. This utility is just filesystem traversal (looking for `.goodplan/` directory), no state machine dependency.

### Expected Behavior

**Before:**
- `gp status` reads `.goodplan/project.json` and other JSON files via v1 data layer
- `gp status --json` returns `StatusResult` with `activeEpic`, `activeSlice`, etc.

**After:**
- `gp status` replays event logs and computes state via derived state computer
- `gp status --json` returns a `StatusResult`-compatible shape with the same field names
- `gp status --json --query '.project.name'` continues to work
- New fields: `suggestedNextSteps` array, `latestBriefing` (null until briefing events exist)
- Human-readable output shows the same sections with correct data
- After `gp init --name test`, `gp status --json` shows `project.name === "test"` and `activeEpic === null`

### Verification

1. `bun run test tests/unit/commands/status.test.ts` -- v2 tests pass
2. `bun run check` -- no lint/type errors
3. Manual smoke: in a temp dir, run `./gp init --name foo && ./gp status --json`, verify output shape
4. Verify `--query` works: `./gp status --json --query '.project.name'` returns `"foo"`

---

## Phase 4: `gp schema` (v2) + Smoke Script

### Objective

Replace the v1 `gp schema` command with a v2 version that reflects the v2 command tree and event schemas. Build a CLI smoke script that exercises the full init-status-schema flow end-to-end.

### Files

| File | Action | Purpose |
|---|---|---|
| `src/commands/global/schema.ts` | Replace | v2 schema command with v2 command registry and event schema support |
| `tests/unit/commands/schema.test.ts` | Replace | v2 unit tests |
| `tests/fitness/schema-output-accuracy.test.ts` | Update | Update fitness test to verify v2 command registry |
| `tests/commands/smoke.test.ts` | Create | CLI integration smoke test: temp dir, init, status, schema, verify outputs |

### Implementation Details

**v2 schema command** (`src/commands/global/schema.ts`):

The v2 schema command extends the v1 command registry pattern with two additions:
1. `--events` flag: outputs the event type catalog with payload Zod schemas as JSON Schema
2. `--output <cmd>` flag: outputs JSON Schema for a specific command's `--json` output

For this slice, implement:
- `gp schema` (no flags) -- full command tree (same as v1 but with v2 command names)
- `gp schema --command <cmd>` -- per-command detail with args, events emitted, output shape
- `gp schema --events` -- event type catalog (start with `project-initialized` and any other events defined so far)

Defer `--agent-return` and `--output` to later slices when more commands/schemas exist.

**Command registry update**: The v1 `commandRegistry` in `schema.ts` is a parallel map populated by `registerCommand()` calls. For v2, update the registry entries to reflect v2 command names and signatures. Commands not yet implemented in v2 can be listed as "planned" or omitted. The registry should include at minimum: `init`, `status`, `schema`, `migrate` (implemented in this slice), and `verify` (planned).

**Event schema output**: For `--events`, iterate over all defined event payload schemas in `src/schemas/events/` and use `z.toJSONSchema()` to produce JSON Schema output. This establishes the pattern for future slices to add their event schemas.

**Smoke test** (`tests/commands/smoke.test.ts`):

End-to-end test using a temp directory:

```
1. Create temp dir
2. Run ./gp init --name smoke-test --json
3. Verify: output has { ok: true, event: <uuid>, entity: "project" }
4. Verify: .goodplan/events.jsonl exists with exactly 1 line
5. Parse the event line, verify type === "project-initialized"
6. Run ./gp status --json
7. Verify: output has project.name === "smoke-test"
8. Verify: activeEpic === null, activeSlice === null
9. Verify: suggestedNextSteps is an array
10. Run ./gp status --json --query '.project.name'
11. Verify: output === "smoke-test"
12. Run ./gp schema --json
13. Verify: output has commands array with init, status, schema entries
14. Run ./gp schema --command init --json
15. Verify: output has name, description, args fields
16. Run ./gp init --name dupe --json (should fail)
17. Verify: error output with ALREADY_EXISTS code
18. Clean up temp dir
```

Use `Bun.spawnSync` to run `./gp` commands, capturing stdout and stderr.

**v1 test cleanup**: Delete v1 `tests/unit/commands/schema.test.ts` content and rewrite. Update `tests/fitness/schema-output-accuracy.test.ts` to check against v2 command names.

### Expected Behavior

**Before:**
- `gp schema` lists v1 commands (~60 commands with v1 names like `submit-plan`, `start-implementation`)
- `gp schema --command status` shows v1 status command args
- No event schema output capability

**After:**
- `gp schema --json` lists v2 commands (at least `init`, `status`, `schema`)
- `gp schema --command init --json` shows v2 init args including `--name`
- `gp schema --events --json` lists `project-initialized` with JSON Schema payload
- Smoke test passes: init -> status -> schema flow works end-to-end

### Verification

1. `bun run test tests/unit/commands/schema.test.ts` -- v2 tests pass
2. `bun run test tests/commands/smoke.test.ts` -- smoke test passes
3. `bun run test tests/fitness/schema-output-accuracy.test.ts` -- fitness test passes
4. `bun run check` -- no lint/type errors
5. `bun run test` -- full test suite passes (no regressions from v1 test replacements)

---

## Phase 5: `gp migrate` Skeleton

### Objective

Create a minimal `gp migrate` command that detects v1 projects and reports their status. This is not the full migration (slice 12) -- it only checks for v1 indicators and tells the user what would need to happen.

### Files

| File | Action | Purpose |
|---|---|---|
| `src/commands/global/migrate.ts` | Replace | v2 migration: replaces existing v1->v2 migration command with event-based v2 state creation. Keeps v1 detection logic but uses event engine for v2 state. |
| `tests/unit/commands/migrate.test.ts` | Create | Unit tests for v1 detection logic |

### Implementation Details

**v1 detection** (`src/commands/global/migrate.ts`):

1. Check for v1 indicators in `.goodplan/`:
   - `.state-cache.json` (primary v1 indicator)
   - `project.json` (v1 project state)
   - `state.json` (v1 state machine)
   - Absence of `events.jsonl` (no v2 event log)
2. Report status:
   - If v1 indicators found and no `events.jsonl`: "v1 project detected. Full migration available in a future release."
   - If both v1 and v2 indicators found: "Partially migrated project detected."
   - If `events.jsonl` exists and no v1 indicators: "Already a v2 project."
   - If no `.goodplan/` at all: "No project found. Run `gp init` to create one."
3. `--json` output: `{ version: "v1" | "v2" | "partial" | "none"; indicators: string[]; message: string }`

**Command registration**: Register in the citty command tree alongside `init`, `status`, `schema`. This is a read-only command -- no events emitted.

### Expected Behavior

**Before:**
- `gp migrate` exists (`src/commands/global/migrate.ts`) with v1-to-v2 migration logic (detects v1 indicators, but creates v2 state via direct file writes rather than events)

**After:**
- `gp migrate` in a v1 project reports "v1 project detected" with list of found indicators
- `gp migrate` in a v2 project reports "Already a v2 project"
- `gp migrate --json` returns structured detection result
- `gp migrate` outside a project reports "No project found"

### Verification

1. `bun run test tests/unit/commands/migrate.test.ts` -- unit tests pass
2. `bun run check` -- no lint/type errors
3. Manual smoke: create temp dir with a fake `.goodplan/project.json`, run `./gp migrate --json`, verify v1 detection
4. Verify the Phase 4 smoke script (`tests/commands/smoke.test.ts`) includes `gp migrate --json` in its v2 project detection step (step 7 of the smoke script)

---

## Risks

### 1. v1 command replacement breakage

Replacing v1 commands may break existing tests that depend on v1 output shapes or v1 internal APIs (e.g., `core/data/`, `core/rpc/`). Mitigation: delete v1 tests as v2 replacements are written (per Q&A decision). Run full test suite after each phase to catch regressions early.

### 2. Status output shape backward compatibility

Skills (especially `/gp:status`) depend on specific `gp status --json` output fields. The v2 shape must include all fields skills currently read. Mitigation: keep the `StatusResult` schema fields identical. Add new v2 fields (`suggestedNextSteps`, `latestBriefing`) additively. Populate `recommendations` from `suggestedNextSteps` for backward compat.

### 3. Derived state completeness

The derived state computer in this slice only handles a subset of ~80 event types (those needed for init/status/schema). Future slices add more. Mitigation: the reducer silently skips unknown event types. Document which event types are handled in this slice vs deferred.

### 4. Event log bootstrapping edge cases

`gp init` is the first command that creates the event log. Edge cases: empty file, missing directory, partially written line. Mitigation: the event engine (slice 01) already handles these cases -- `replayEvents` returns empty for missing files, `appendEvent` creates directories.

### 5. citty integration

v2 commands must plug into the existing `main.ts` citty command tree. The structure is already established (v1 commands use `defineCommand`). Risk is low but verify that swapping command implementations doesn't break the subcommand routing.

---

## Smoke Script

The smoke test in Phase 4 (`tests/commands/smoke.test.ts`) serves as the end-to-end verification. It exercises:

1. `gp init --name <name> --json` -- project bootstrap
2. `gp status --json` -- derived state query
3. `gp status --json --query '<expr>'` -- jq filtering
4. `gp schema --json` -- command tree
5. `gp schema --command <cmd> --json` -- per-command detail
6. `gp init` (duplicate) -- error handling
7. `gp migrate --json` -- v2 project detection (should report "Already a v2 project")

Run with: `bun run test tests/commands/smoke.test.ts`

This smoke test uses the local `./gp` binary via `Bun.spawnSync` in a temp directory, making it a true CLI integration test without requiring the installed plugin.
