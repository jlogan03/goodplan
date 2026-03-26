# Affected API Surfaces

## RPC Layer (`src/core/rpc/`)

### types.ts
- `Target` union: add `epic: string` to slice variant
- `resolveEntityName()`: unchanged (returns `name`)
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

### complete.ts
- Epic completion scan: reads `epics/overview.json` → embedded slices instead of filtering `slices/overview.json` by epic field. Simpler.

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

### helpers.ts
- `getSlice(state, name)` → `getSlice(state, epic, name)` — traverses `epics/<epic>/slices/<name>/slice.json`
- `setSliceJson(state, name, json)` → `setSliceJson(state, epic, name, json)` — same path change
- `setSliceStatus(state, name, ...)` → `setSliceStatus(state, epic, name, ...)`
- `updateSliceOverviewStatus(state, name, ...)` → updates embedded slice in `epics/overview.json` epic item
- `addSliceToOverview()` → adds to the epic's `slices` array in `epics/overview.json`

### init.ts
- Remove `slices/overview.json` creation
- `epics/overview.json` items already have empty `slices: []` by default

## Commands (`src/commands/`)

### slice/list.ts
- Read `epics/overview.json`, find active epic's entry, return its `slices` array
- Add `--epic <name>` flag (defaults to `project.json.activeEpic`)
- Add `--all` flag to show slices across all epics

### slice/show.ts
- Resolve path via `epics/<epic>/slices/<name>/slice.json`
- Epic from `--epic` flag or `project.json.activeEpic`

### slice/create.ts, and all mutation commands
- Construct `Target` with `epic` field from `--epic` flag or active epic
- Error if no epic specified and no active epic

### global/status.ts
- `countArtifacts()`: read slices from `epics/overview.json` embedded arrays instead of `slices/overview.json`
- `completedSlices`/`totalSlices`: aggregate across all epics

## Schema Registry (`src/core/data/schema-registry.ts`)

```typescript
// Current
{ pattern: /^slices\/overview\.json$/, schema: overviewSchema }
{ pattern: /^slices\/[^/]+\/slice\.json$/, schema: sliceSchema }

// Target: remove slices/ patterns, update epic overview schema
{ pattern: /^epics\/overview\.json$/, schema: epicOverviewSchema }  // changed schema
{ pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/, schema: sliceSchema }
```

Note: `assembleState()` is recursive — it will naturally discover slice.json files under the new nested paths. The schema registry just needs the pattern to match for validation.

## Context Layer (`src/core/context/`)

- `resolveScope()`: `slices/<name>` → `epics/<epic>/slices/<name>`
- Priority tables and learnings paths update accordingly

## Skills (~15 files)

All skills referencing `.project/slices/` update to `.project/epics/<epic>/slices/<name>/`. Key skills:
- `/complete` — also removes direct `learnings.md` writes
- `/create-plan` — scope resolution
- `/create-slices` — writes to epic's slices directory
- `/project-status` — reads from consolidated overview
- `/explore` — scope path mapping
- `/refine-slices` — operates on epic's slices
