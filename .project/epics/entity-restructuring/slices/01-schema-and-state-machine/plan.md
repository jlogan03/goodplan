# Plan: Schema and State Machine

## Overview

Transform the type system and state machine to use nested slice paths (`epics/<epic>/slices/<name>/`). Two phases: first establish the new schemas, types, and registry patterns, then update all transition handlers and helpers to use them. This is the foundation slice — all other slices depend on these types compiling.

Key changes: `epicOverviewSchema` with embedded slices replaces separate `slices/overview.json`, `Target` gains `epic` field on slices, all 9 slice events gain `epic`, `sliceSequence` removed from `epicSchema`, `DeferredItem` gains required `targetEpic`, and the schema registry maps new nested path patterns.

## Phase 1: Schemas, Types & Registry

Establish all type-level changes so the compiler enforces the new structure.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "slices:" src/schemas/entities/overview.ts` → no matches (no embedded slices on overview items)
- [ ] `grep "epic:" src/core/rpc/types.ts | grep slice` → no matches (Target slice variant has no epic field)
- [ ] `grep "epic:" src/schemas/state-events.ts | grep -c ""` → only 1 match (CREATE_SLICE has epic; 8 others don't)

**After implementation** (should pass / show presence):
- [ ] `grep "slices:" src/schemas/entities/overview.ts` → `slices` field on epic overview item schema
- [ ] `grep "epic:" src/core/rpc/types.ts | grep slice` → Target slice variant has `epic: string`
- [ ] `grep "epic:" src/schemas/state-events.ts | grep -c ""` → 9+ matches (all slice events have epic)
- [ ] `tsc --noEmit` → type check passes (exhaustive switches will error until Phase 2 updates handlers — use `// @ts-expect-error` or update simultaneously)

### Tasks

- [ ] Create `epicOverviewItemSchema` in `src/schemas/entities/overview.ts`:
  - Extends `overviewItemSchema` with `slices: z.array(sliceOverviewItemSchema)`
  - Create `sliceOverviewItemSchema`: `{ name, status, created, completed }` (no `epic` field — path encodes it)
  - Create `epicOverviewSchema`: `{ items: z.array(epicOverviewItemSchema) }`
  - Export all schemas and `z.infer` types
  - Keep existing `overviewSchema` unchanged (still used by quests/tasks)
- [ ] Update `Target` slice variant in `src/core/rpc/types.ts`:
  - Change from `{ type: "slice"; name: string }` to `{ type: "slice"; name: string; epic: string }`
- [ ] Add `epic: string` to all 8 slice events missing it in `src/schemas/state-events.ts`:
  - `BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, `COMPLETE_REFINEMENT_ROUND`, `BEGIN_IMPLEMENTATION`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE` (CREATE_SLICE already has `epic`)
- [ ] Remove `sliceSequence` from `epicSchema` in `src/schemas/entities/epic.ts`:
  - Delete `sliceSequence: z.array(z.string())`
  - Update `buildInitialEpicJson` in `src/core/state/transitions/helpers.ts` to not include `sliceSequence`
- [ ] Add `targetEpic: string` to `DeferredItem` type in `src/schemas/commands/submit.ts` (or wherever `DeferredItem`/`deferredItemSchema` is defined)
- [ ] Update schema registry in `src/core/data/schema-registry.ts`:
  - Change `{ pattern: /^epics\/overview\.json$/, schema: overviewSchema }` to `schema: epicOverviewSchema`
  - Change `{ pattern: /^slices\/[^/]+\/slice\.json$/ }` to `{ pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/ }`
  - Remove `{ pattern: /^slices\/overview\.json$/, schema: overviewSchema }` (file eliminated)
- [ ] Update `init.ts` in `src/core/state/transitions/init.ts`:
  - Remove `slices/overview.json` creation
  - Ensure `epics/overview.json` creation includes `slices: []` on items (check if `addEpicToOverview` is called during init or if it's a fresh creation — if fresh, the empty overview `{ items: [] }` is fine; slices are added later via `addSliceToOverview`)
- [ ] Update `addEpicToOverview` in `src/core/state/transitions/helpers.ts`:
  - Include `slices: []` in the overview item shape
  - Use `epicOverviewSchema`/`EpicOverview` type for the overview (not shared `Overview`)
- [ ] Create `addSliceToOverview(state, epicName, sliceItem)` in helpers.ts:
  - Reads `epics/overview.json`, finds epic by name, appends to its `slices` array
  - Returns updated state
- [ ] Update `updateOverviewStatus` for epics to use `EpicOverview` type:
  - Must preserve `slices` array when spreading/updating an epic overview item
- [ ] Update unit tests in `tests/unit/schemas/`:
  - `entities.test.ts`: test new `epicOverviewItemSchema` and `epicOverviewSchema`
  - `schema-registry.test.ts`: update path assertions (remove `slices/overview.json`, add nested slice pattern, change epic overview schema)
  - `state-events.test.ts`: verify all 9 slice events have `epic` field

### Verification

- `tsc --noEmit` — type check passes
- `bun test tests/unit/schemas/` — schema tests pass
- Schema registry resolves `epics/overview.json` to `epicOverviewSchema` (not `overviewSchema`)
- Schema registry resolves `epics/my-epic/slices/01-auth/slice.json` to `sliceSchema`

## Phase 2: Handlers, Helpers & Tests

Update all transition handlers to use nested paths, update helper signatures, and fix all test fixtures.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r '"slices/' src/core/state/transitions/` → many matches (flat path references in handlers)
- [ ] `grep -r "slices/overview.json" src/core/state/` → matches (handlers reference flat overview)

**After implementation** (should pass / show presence):
- [ ] `grep -r '"slices/' src/core/state/transitions/` → zero matches (all converted to nested)
- [ ] `grep -r "slices/overview.json" src/core/state/` → zero matches (eliminated)
- [ ] `bun test` → full test suite passes

### Tasks

- [ ] Update helper signatures in `src/core/state/transitions/helpers.ts`:
  - `getSlice(state, name)` → `getSlice(state, epic, name)` — path: `epics/${epic}/slices/${name}/slice.json`
  - `setSliceJson(state, name, content)` → `setSliceJson(state, epic, name, content)` — same path change
  - `setSliceStatus(state, name, slice, newStatus, ts)` → `setSliceStatus(state, epic, name, slice, newStatus, ts)` — cascades to `updateSliceOverviewStatus`
  - `updateSliceOverviewStatus(state, sliceName, newStatus)` → `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)` — finds epic in `epics/overview.json`, updates slice in its `slices` array
- [ ] Update `src/core/state/transitions/slice-create.ts`:
  - Use `epics/${event.epic}/slices/${event.name}` paths
  - Call `addSliceToOverview` instead of adding to `slices/overview.json`
  - Activity log scope: `epics/${event.epic}/slices/${event.name}`
- [ ] Update `src/core/state/transitions/slice-plan.ts`:
  - All path references use `epics/${event.epic}/slices/${event.slice}`
  - Sequential enforcement: read from epic's embedded `slices` array in `epics/overview.json` instead of `epic.sliceSequence`
  - Activity log scope strings use nested format
- [ ] Update `src/core/state/transitions/slice-implement.ts`:
  - All path references use nested format
  - Activity log scope strings
- [ ] Update `src/core/state/transitions/slice-submit.ts` (5 flat path refs):
  - All path references use nested format
  - Refinement score paths, plan submission paths
  - Activity log scope strings
- [ ] Update `src/core/state/transitions/slice-complete.ts` (~10 flat path refs):
  - `learnings.jsonl` read/write paths
  - `architecture-deltas.jsonl` read/write paths
  - Deferred routing: `getSlice`/`setSliceJson` with epic param
  - Sibling slice detection via `epics/overview.json` embedded `slices` array
  - Activity log scope strings
  - `DeferredItem` creation: populate `targetEpic` from `event.epic`
- [ ] Update `src/core/state/transitions/slice-abandon.ts`:
  - Path references use nested format
  - Activity log scope strings
- [ ] Update `src/core/state/transitions/epic-create.ts`:
  - Verify `addEpicToOverview` includes `slices: []` (may already be updated in Phase 1)
- [ ] Update `src/core/state/transitions/rollup-learnings.ts`:
  - Resolve scope paths using nested format
- [ ] Update test fixtures in `tests/fixtures/`:
  - Remove `sliceSequence` from 4 `epic.json` fixtures
  - Move slice entries from `slices/` to `epics/<epic>/slices/` in fixture state trees
  - Update `slices/overview.json` references to embedded slices in `epics/overview.json`
- [ ] Update fitness tests in `tests/fitness/`:
  - `transition-completeness.test.ts`: update minimal events with `epic` field on all slice events
  - `schema-validation.test.ts`: update path assertions for nested patterns
  - `state-machine-purity.test.ts`: update any fixture data
- [ ] Update unit tests in `tests/unit/state/`:
  - All `slice-*.test.ts` files: update state tree construction to use nested paths, add `epic` to events
  - `epic-create.test.ts`: verify `slices: []` in overview, no `sliceSequence` in epic JSON
  - `reduce.test.ts`: update any slice-related test data
  - `task.test.ts`: if `CONVERT_TASK` tests reference slice paths, update
  - `rollup-learnings.test.ts`: update scope paths

### Verification

- `tsc --noEmit` — type check passes
- `bun test tests/unit/state/` — all state machine tests pass
- `bun test tests/fitness/` — all fitness tests pass
- `bun test` — full test suite passes (864+ tests)
- `grep -r '"slices/' src/core/state/transitions/` → zero matches
- `grep -r "slices/overview.json" src/core/state/` → zero matches
- `grep "sliceSequence" src/schemas/entities/` → zero matches
- Verify `reduce()` produces state with slices under `epics/<epic>/slices/` — inspect a test output
