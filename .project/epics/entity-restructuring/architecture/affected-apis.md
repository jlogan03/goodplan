# Affected API Surfaces

## RPC Layer (`src/core/rpc/`)

### types.ts
- `Target` union: add `epic: string` to slice variant
- `resolveEntityName()`: unchanged (returns `name`). Note: callers needing disambiguation may use `${epic}/${name}` but this is a display concern, not a contract change.
- `resolveEntityJsonPath()`: `slices/${name}/slice.json` → `epics/${epic}/slices/${name}/slice.json`
- `BeginPayloadMap`: no changes (payloads don't encode paths)

### paths.ts
- `resolveEntityDir()`: `slices/${name}` → `epics/${epic}/slices/${name}`
- `resolveForBeginPhase()`: path references update to nested
- `mapToBeginPhase()`: no structural changes

### begin.ts
- `buildBeginEvent()`: all slice event construction includes `epic` from target
- `buildBeginResult()`: no structural changes (paths derived from `resolveEntityDir`)
- `buildCreateEvent()`: slice creation includes `epic`
- `buildAbandonEvent()`: slice branch must include `epic` from target (`{ type: "ABANDON_SLICE", epic: target.epic, slice: target.name, ts, reason }`)
- `buildPlanPhaseEvent()`: slice branch must include `epic` from target (`{ type: "BEGIN_PLAN", epic: target.epic, slice: target.name, ts }`)
- `buildRefinePlanEvent()`: slice branch must include `epic` from target (`{ type: "BEGIN_REFINEMENT", epic: target.epic, slice: target.name, ts }`)
- `buildImplementEvent()`: slice branch must include `epic` from target (`{ type: "BEGIN_IMPLEMENTATION", epic: target.epic, slice: target.name, ts }`)

### complete.ts

#### `buildSliceCompleteResult` (lines ~169–267) — 6 flat path references:
- `getJson<Slice>(oldState, \`slices/${sliceName}/slice.json\`)` (x2, old and new state) → `epics/${epic}/slices/${sliceName}/slice.json`
- `getJson<Overview>(newState, "slices/overview.json")` — eliminated; sibling-slice detection must switch to the embedded `slices` array in `epics/overview.json` for the relevant epic
- `getJson<Slice>(oldState/newState, \`slices/${item.name}/slice.json\`)` (x2, for deferred routing detection) → `epics/${epic}/slices/${item.name}/slice.json`
- `getJsonl<unknown>(newState, \`slices/${sliceName}/architecture-deltas.jsonl\`)` → `epics/${epic}/slices/${sliceName}/architecture-deltas.jsonl`

All are string literals — TypeScript will not catch them.

#### `buildCompleteEvent` (line ~104)
- Builds `COMPLETE_SLICE` event: must include `epic` from target (`{ type: "COMPLETE_SLICE", epic: target.epic, slice: target.name, ts, ... }`), matching `buildBeginEvent` and `buildAbandonEvent`.

#### Epic completion scan (COMPLETE_EPIC)
- Reads `epics/overview.json` → embedded slices instead of filtering `slices/overview.json` by epic field. Simpler.

## State Machine Transitions (`src/core/state/transitions/`)

All slice handlers change from:
```typescript
const slicePath = `slices/${event.slice}`;
const overviewPath = `slices/overview.json`;
```
To:
```typescript
const slicePath = `epics/${event.epic}/slices/${event.slice}`;
const overviewPath = `epics/overview.json`;
```

### Guard path changes

All `hasChild` guards must use epic-scoped paths:

| Guard | Current | Target |
|---|---|---|
| Slice name uniqueness | `hasChild(state, "slices", event.name)` | `hasChild(state, \`epics/${event.epic}/slices\`, event.name)` |
| Plan exists | `hasChild(state, "slices/${event.slice}", "plan.md")` | `hasChild(state, \`epics/${event.epic}/slices/${event.slice}\`, "plan.md")` |
| Refined plan exists | `hasChild(state, "slices/${event.slice}", "plan-refined.md")` | `hasChild(state, \`epics/${event.epic}/slices/${event.slice}\`, "plan-refined.md")` |

**Slice name uniqueness scope**: Per-epic, not global. Two slices with the same name in different epics are allowed — the directory structure prevents collisions. `activeSlice` in `project.json` is unambiguous because it is always scoped to `activeEpic` (see invariant below).

### slice-plan.ts — Sequential enforcement migration

`handleBeginPlan` (lines 43-66) currently reads `epic.sliceSequence` for sequential enforcement via `epic.sliceSequence.indexOf(event.slice)`. After restructuring, this must switch to finding the slice's index in the epic's embedded `slices` array from `epics/overview.json`:

```typescript
// Current: const seqIndex = epic.sliceSequence.indexOf(event.slice);
// Target:
const epicOverview = getJson<EpicOverview>(state, "epics/overview.json");
const epicItem = epicOverview?.items.find(e => e.name === event.epic);
const seqIndex = epicItem?.slices.findIndex(s => s.name === event.slice) ?? -1;
```

The previous-slice lookup also changes from reading `slices/overview.json` to reading the same epic's `slices` array (previous item in the array).

### helpers.ts
- `getSlice(state, name)` → `getSlice(state, epic, name)` — traverses `epics/<epic>/slices/<name>/slice.json`
- `setSliceJson(state, name, json)` → `setSliceJson(state, epic, name, json)` — same path change
- `setSliceStatus(state, name, ...)` → `setSliceStatus(state, epic, name, ...)`
  - Callers: all slice transition `apply` functions. Each already has `event.epic` available.
- `updateSliceOverviewStatus(state, name, newStatus)` → `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)`
  - **New signature**: `(state: ProjectState, epicName: string, sliceName: string, newStatus: string) → ProjectState`
  - **Lookup algorithm**: find epic item in `epics/overview.json.items` by `epicName`, then find slice in `epic.slices` by `sliceName`
  - **Error handling**: if epic or slice not found, return state unchanged (matches current silent-return behavior)
  - **Cascade**: `setSliceStatus` calls `updateSliceOverviewStatus` internally — all callers of `setSliceStatus` must pass `epic` (traced: `slice-create`, `slice-plan`, `slice-refine`, `slice-implement`, `slice-complete`, `slice-abandon`)
- **New**: `addSliceToOverview(state, epicName, sliceItem)` — appends to the target epic's `slices` array in `epics/overview.json`. Called by `CREATE_SLICE` handler. The epic must already exist in overview (guard: `CREATE_SLICE` requires epic in `activated` status). Note: `slice-create.ts` currently does NOT check `epic.status === "activated"` — it only checks uniqueness and existence. This guard is enforced by workflow ordering (slices are only created after activation), not by code. Document this assumption or add the check as part of this epic.
- `updateOverviewStatus(state, epicName, newStatus)` — currently reads `epics/overview.json` as `getJson<Overview>(...)`. After restructuring, must use `EpicOverview` type (not the shared `Overview` type) because epic overview items carry a `slices` array. If `epicOverviewSchema` requires `slices`, schema validation (INV-005) will fail on every write unless the type parameter is updated. Both `updateOverviewStatus` and `addEpicToOverview` must operate on `EpicOverview`.
- `buildInitialEpicJson(name, goal, ts)` — constructs initial `epic.json` content including `sliceSequence: []`. Must remove `sliceSequence` field since sequencing moves to `epics/overview.json` embedded `slices` array order.

### init.ts
- Remove `slices/overview.json` creation
- `epics/overview.json` items already have empty `slices: []` by default

### epic-create.ts / addEpicToOverview
- `addEpicToOverview()` must include `slices: []` on creation. The current implementation already creates `{ name, status, created, completed }` — this must be extended to `{ name, status, created, completed, slices: [] }`. The `epicOverviewItemSchema` requires `slices` to always be present, so omitting it would fail schema validation (INV-005).

## Commands (`src/commands/`)

### slice/list.ts
- Read `epics/overview.json`, find active epic's entry, return its `slices` array
- Add `--epic <name>` flag (defaults to `project.json.activeEpic`)
- Add `--all` flag to show slices across all epics

### slice/show.ts
- Resolve path via `epics/<epic>/slices/<name>/slice.json`
- Epic from `--epic` flag or `project.json.activeEpic`

### Slice mutation commands (all need `epic` in Target)

Each constructs `Target` with `epic` from `--epic` flag or `project.json.activeEpic`. Error if neither is set.

- `slice/create.ts` — `begin("create", { type: "slice", name, epic }, payload)`
- `slice/plan.ts` — `begin("plan", { type: "slice", name, epic }, {})`
- `slice/refine-plan.ts` — `begin("refine-plan", { type: "slice", name, epic }, {})`
- `slice/implement.ts` — `begin("implement", { type: "slice", name, epic }, {})`
- `slice/complete.ts` — `complete({ type: "slice", name, epic }, payload)`
- `slice/abandon.ts` — `begin("abandon", { type: "slice", name, epic }, { reason })`
- `slice/show.ts` — `getDir` call uses `resolveEntityDir(projectDir, { type: "slice", name, epic })`

### global/status.ts
- `countArtifacts()`: read slices from `epics/overview.json` embedded arrays instead of `slices/overview.json`
- `completedSlices`/`totalSlices`: aggregate across all epics

## Schema Registry (`src/core/data/schema-registry.ts`)

```typescript
// Current
{ pattern: /^epics\/overview\.json$/, schema: overviewSchema }
{ pattern: /^slices\/overview\.json$/, schema: overviewSchema }
{ pattern: /^slices\/[^/]+\/slice\.json$/, schema: sliceSchema }

// Target
{ pattern: /^epics\/overview\.json$/, schema: epicOverviewSchema }  // NEW schema (not overviewSchema)
{ pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/, schema: sliceSchema }  // nested path
// REMOVED: slices/overview.json pattern (file eliminated)
// REMOVED: slices/[^/]+/slice.json pattern (moved to nested)

// UNCHANGED (still use overviewSchema):
{ pattern: /^quests\/overview\.json$/, schema: overviewSchema }
{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema }
```

`epicOverviewSchema` is a **new, separate schema** — not a replacement of `overviewSchema`. The shared `overviewSchema` continues to serve `quests/overview.json` and `tasks/overview.json`.

Note: `assembleState()` is recursive — it will naturally discover slice.json files under the new nested paths. The schema registry just needs the pattern to match for validation.

**Load-bearing for reads**: The schema registry path→schema mapping is not just write validation — `getJson` uses the registry to resolve the Zod schema for parsing, which strips unregistered fields. The registry update to `epics/overview.json` → `epicOverviewSchema` **must happen before any data migration**. Without it, `slices` arrays are silently stripped by Zod on every `getJson` call, causing silent data loss on every round-trip.

**Test update**: `schema-registry.test.ts` line 24 asserts `slices/overview.json` resolves to `overviewSchema` (path being removed — delete assertion) and line 20 asserts `epics/overview.json` resolves to `overviewSchema` (must change to `epicOverviewSchema`).

## Activity Log Scope Format

Transition handlers write `scope` in activity log entries. Format changes:
- **Current**: `scope: "slices/${event.slice}"`
- **Target**: `scope: "epics/${event.epic}/slices/${event.slice}"`

This keeps scope paths consistent with the filesystem paths for debugging.

## Context Layer (`src/core/context/`)

- `resolveScope()`: `slices/<name>` → `epics/<epic>/slices/<name>`

### priorities.ts — Silent string literal changes (TypeScript won't catch these)

Three string literals that will NOT cause compile errors but will cause silent context degradation:
- `"slices/overview.json"` (line ~66) — priority table reference. Must become `"epics/overview.json"`
- `"slices/${target.name}"` (line ~42) — scope path construction. Must become `"epics/${target.epic}/slices/${target.name}"`
- `"slices/"` directory check (line ~78) — used for directory-based context selection. Must update to `"epics/"` or nested path

### learnings.ts — Scope path changes
- Scope paths like `slices/01-data-layer/learnings.jsonl` → `epics/<epic>/slices/01-data-layer/learnings.jsonl`

## Skills (11 files)

All skills referencing `.project/slices/` update to `.project/epics/<epic>/slices/<name>/`. Complete enumeration:
- `skills/complete/SKILL.md` — also removes direct `learnings.md` writes
- `skills/complete/references/guidance.md`
- `skills/create-plan/SKILL.md` — scope resolution
- `skills/create-plan/references/guidance.md`
- `skills/create-slices/SKILL.md` — writes to epic's slices directory
- `skills/create-slices/references/guidance.md`
- `skills/project-status/SKILL.md` — reads from consolidated overview
- `skills/explore/SKILL.md` — scope path mapping
- `skills/explore/references/explore-logic.md`
- `skills/refine-slices/SKILL.md` — operates on epic's slices
- `skills/_shared/references/cli-interaction.md` — shared path references

## Test Infrastructure

### Fixture files requiring `sliceSequence` removal
- `tests/fixtures/slice-refining-max-rounds/.project/epics/test-epic/epic.json`
- `tests/fixtures/slice-in-progress/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-activated/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-created/.project/epics/test-epic/epic.json`

### Test files referencing `slices/overview.json` (must update to embedded overview)
- `tests/unit/commands/status.test.ts`
- `tests/unit/commands/state.test.ts`
- `tests/unit/state/slice-complete.test.ts`
- `tests/unit/state/slice-create.test.ts`
- `tests/unit/state/slice-abandon.test.ts`
- `tests/unit/state/reduce.test.ts`
- `tests/unit/schemas/schema-registry.test.ts`
- `tests/unit/data/tree.test.ts`

### Test files referencing `sliceSequence` (must update sequential enforcement)
- `tests/unit/commands/status.test.ts`
- `tests/unit/state/slice-create.test.ts`
- `tests/unit/schemas/entities.test.ts`
- `tests/unit/state/epic-create.test.ts`
- `tests/unit/context/startContext.test.ts`
- `tests/unit/state/task.test.ts`
- `tests/integration/migrate.test.ts`
- `tests/unit/rpc/migrate.test.ts`
- `tests/unit/schemas/migration/schemas.test.ts`
