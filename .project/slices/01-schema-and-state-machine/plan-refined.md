# Plan: Schema and State Machine

## Overview

Transform the type system and state machine to use nested slice paths (`epics/<epic>/slices/<name>/`). Two phases: first establish the new schemas, types, and registry patterns, then update all transition handlers and helpers to use them. This is the foundation slice — all other slices depend on these types compiling.

Key changes: `epicOverviewSchema` with embedded slices replaces separate `slices/overview.json`, `Target` gains `epic` field on slices, all 9 slice events gain `epic`, `sliceSequence` removed from `epicSchema`, `DeferredItem` gains optional `targetEpic`, and the schema registry maps new nested path patterns.

### Scope Boundary

**In scope (this slice):** Schema definitions, type changes, schema registry, state machine transition handlers, transition helpers, transition tests, fitness tests.

**Out of scope (deferred to later slices):** `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/paths.ts`, `src/core/context/priorities.ts`, `src/commands/` files, `skills/` files (slice 02). `src/core/rpc/migrate.ts` (slice 05 — writes flat paths and uses `sliceSequence`; must be updated when migration support lands). During Phase 1, `@ts-expect-error` annotations are added to out-of-scope RPC path functions (`resolveEntityDir`, `entityDir`) so the build compiles while those remain stale.

**In-scope exception:** `src/core/rpc/types.ts` is in-scope for Phase 1 because `resolveEntityJsonPath` and `resolveEntityName` are pure type-level helpers co-located with `Target`, not workflow orchestration. `resolveEntityJsonPath` is updated directly (its exhaustive switch over `Target` must reflect the new slice case path). `resolveEntityName` needs no change — it returns `target.name`, which is correct as-is. All other `src/core/rpc/` files remain slice 02 only.

### Ordering Constraint

Schema registry update to `epicOverviewSchema` **must** land before any handler that writes epic overview data with `slices` arrays. Without this, `getJson` calls strip unrecognized `slices` fields via Zod parsing, causing silent data loss (INV-005). Concretely: the schema registry task and the `addEpicToOverview`/`updateOverviewStatus` type changes are atomic — do them in the same commit.

## Phase 1: Schemas, Types & Registry

Establish all type-level changes and foundational helper signatures so the compiler enforces the new structure. No handler runtime logic changes — those are Phase 2. Helper *signatures* change here (adding `epic` param) but helper *implementations* that depend on handler flow stay in Phase 2.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "slices:" src/schemas/entities/overview.ts` → no matches (no embedded slices on overview items)
- [ ] `grep "epic:" src/core/rpc/types.ts | grep slice` → no matches (Target slice variant has no epic field)
- [ ] `grep -c "epic:" src/schemas/state-events.ts` with manual inspection of slice event types — only `CREATE_SLICE` has `epic` currently; the other 8 slice events do not. (Raw grep count will be higher due to epic lifecycle events sharing the `epic` field name.)

**After implementation** (should pass / show presence):
- [ ] `grep "slices:" src/schemas/entities/overview.ts` → `slices` field on epic overview item schema
- [ ] `grep "epic:" src/core/rpc/types.ts | grep slice` → Target slice variant has `epic: string`
- [ ] `grep "epic:" src/schemas/state-events.ts | grep -c ""` → 9+ matches (all slice events have epic)
- [ ] `tsc --noEmit` → type check passes. Adding `epic` to events and `Target` will break exhaustive switches in RPC path functions and context code. Strategy: `resolveEntityJsonPath` is updated directly in Phase 1 (same file as `Target`). Function overloads on `getSlice`/`setSliceJson`/`setSliceStatus` let existing handler call sites compile via old signatures. `@ts-expect-error` annotations only on out-of-scope sites: `resolveEntityDir` (slice 02) and `entityDir` (slice 02). These are removed in slice 02 as each site is updated.

### Tasks

- [ ] Create `epicOverviewItemSchema` in `src/schemas/entities/overview.ts`:
  - Extends `overviewItemSchema` with `slices: z.array(sliceOverviewItemSchema)`
  - Create `sliceOverviewItemSchema` as `overviewItemSchema.omit({ epic: true, title: true })` — derives `{ name, status, created, completed }` (no `epic` field — path encodes it). Using `.omit()` prevents drift when `overviewItemSchema` evolves.
  - Create `epicOverviewSchema`: `{ items: z.array(epicOverviewItemSchema) }`
  - Export all schemas and `z.infer` types
  - Keep existing `overviewSchema` unchanged (still used by quests/tasks)
- [ ] Update `Target` slice variant in `src/core/rpc/types.ts`:
  - Change from `{ type: "slice"; name: string }` to `{ type: "slice"; name: string; epic: string }`
  - **Cascade:** `resolveEntityJsonPath()` (line 226) in the same file has an exhaustive switch over `Target` — update its slice case to return `epics/${target.epic}/slices/${target.name}/slice.json`. `resolveEntityName()` (line 206) needs no change — it returns `target.name`, which is correct as-is regardless of the new `epic` field.
  - **Out-of-scope cascade (slice 02):** `resolveEntityDir()` in `src/core/rpc/paths.ts` (line 145) returns `slices/${target.name}` — add `// @ts-expect-error — updated in slice 02` until RPC layer slice. Same for `entityDir()` in `src/core/context/priorities.ts` (line 14).
- [ ] Add `epic: string` to all 8 slice events missing it in `src/schemas/state-events.ts`:
  - `BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, `COMPLETE_REFINEMENT_ROUND`, `BEGIN_IMPLEMENTATION`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE` (CREATE_SLICE already has `epic`)
- [ ] Remove `sliceSequence` from `epicSchema` in `src/schemas/entities/epic.ts`:
  - Delete `sliceSequence: z.array(z.string())`
- [ ] Add `targetEpic: z.string().min(1).optional()` to `deferredItemSchema` in `src/schemas/entities/slice.ts` (lines 18-22). Optional — defaults to completing slice's epic at runtime. This matches the architecture decision in `data-model-changes.md`.
- [ ] Update schema registry in `src/core/data/schema-registry.ts` (**must land atomically with helper type changes below**):
  - Change `{ pattern: /^epics\/overview\.json$/, schema: overviewSchema }` to `schema: epicOverviewSchema`
  - Change `{ pattern: /^slices\/[^/]+\/slice\.json$/ }` to `{ pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/ }`
  - Remove `{ pattern: /^slices\/overview\.json$/, schema: overviewSchema }` (file eliminated)
  - **Ordering note:** Ensure nested slice pattern does not conflict with existing epic pattern due to first-match semantics. The epic pattern matches `epics/<name>/epic.json`; the nested slice pattern matches `epics/<name>/slices/<name>/slice.json` — no overlap. JSONL wildcard patterns already match nested paths, so no new JSONL patterns are needed.
- [ ] Update `addEpicToOverview` in `src/core/state/transitions/helpers.ts` (**atomic with registry change**):
  - Include `slices: []` in the overview item shape
  - Use `epicOverviewSchema`/`EpicOverview` type for the overview (not shared `Overview`)
  - Change `getJson<Overview>(...)` to `getJson<EpicOverview>(...)` for `epics/overview.json`
- [ ] Update `updateOverviewStatus` for epics to use `EpicOverview` type (**atomic with registry change**):
  - Must preserve `slices` array when spreading/updating an epic overview item
  - Change `getJson<Overview>(...)` to `getJson<EpicOverview>(...)` for `epics/overview.json`
  - **Known gap (pre-existing):** `updateOverviewStatus` never sets `completed` timestamp on terminal transitions — same bug exists on quest/task overviews (task overview already has a fix via `updateTaskOverviewStatus`). The new `updateSliceOverviewStatus` must not propagate this gap. Document as a follow-up task but do not block this slice on fixing it for epics.
- [ ] Verify `updateSliceOverviewStatus` sets `completed: ts` when `newStatus` is `"completed"` or `"abandoned"` (matching the pattern in `updateTaskOverviewStatus`). Add a verification check in Phase 2 tests that asserts `completed` is non-null after a terminal transition.
- [ ] Create `addSliceToOverview(state, epicName, sliceItem: SliceOverviewItem)` in helpers.ts:
  - Reads `epics/overview.json` as `EpicOverview`, finds epic by name, appends to its `slices` array
  - Returns updated state
  - `sliceItem` parameter typed as `SliceOverviewItem` (Zod-inferred from `sliceOverviewItemSchema`)
- [ ] Update `buildInitialEpicJson` in `src/core/state/transitions/helpers.ts` to not include `sliceSequence`. Also fix pre-existing type bug: `verifications: [] as string[]` should be `[] as Verification[]` per `epicSchema`. This requires adding `import type { Verification } from "../../../schemas/entities/epic.js"` to `helpers.ts` (currently not imported).
- [ ] Update `init.ts` in `src/core/state/transitions/init.ts`:
  - Remove `slices/overview.json` creation
  - Ensure `epics/overview.json` creation includes `slices: []` on items (check if `addEpicToOverview` is called during init or if it's a fresh creation — if fresh, the empty overview `{ items: [] }` is fine; slices are added later via `addSliceToOverview`)
- [ ] Confirm `handleConvertTask` in `src/core/state/transitions/task-lifecycle.ts` (line 74) calls `buildInitialEpicJson` — verify it has no additional `sliceSequence` or `slices/overview.json` references beyond what `buildInitialEpicJson` handles. (Codebase check: it does not — only calls `buildInitialEpicJson` and `addEpicToOverview`, both updated above.)
- [ ] Update helper *signatures* in `src/core/state/transitions/helpers.ts` using **function overloads** (implementations updated in Phase 2):
  - `getSlice`: add overload `(state, epic, name)` returning new path. Keep old overload `(state, name)` with `@deprecated` JSDoc. Implementation uses optional parameter pattern: `function getSlice(state: ProjectState, epicOrName: string, name?: string)` — when `name` is defined, `epicOrName` is the epic; when undefined, `epicOrName` is the slice name (legacy path). Do NOT use `arguments.length`.
  - `setSliceJson`: same optional-parameter pattern — `(state, epicOrName, nameOrContent, content?)`.
  - `setSliceStatus`: same pattern — `(state, epicOrName, nameOrSlice, sliceOrNewStatus, newStatusOrTs?, ts?)`.
  - `updateSliceOverviewStatus(state, sliceName, newStatus)` → `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)` — finds epic in `epics/overview.json`, updates slice in its `slices` array. (No overload needed — only called from `setSliceStatus`, updated in the same commit.)
  - **(Low priority)** Update `guardSliceStatus` to accept `epicName` parameter and include it in error messages (e.g., `Slice "foo" not found in epic "bar"`). After restructuring, `sliceName` alone is ambiguous across epics. Consistent with `getSlice` which already takes `epic` after this update.
  - **Cross-phase dependency:** `getSlice` signature change means `handleBeginPlan` (which calls `getSlice(state, event.slice)`) will need `event.epic` — available because Phase 1 adds `epic` to all slice events. Handler call sites are updated in Phase 2.
  - **Why overloads instead of `@ts-expect-error`:** There are ~18 handler call sites across 5 files. `@ts-expect-error` silently swallows ALL errors on the annotated line (not just arity mismatches), masking real bugs. Overloads let existing call sites compile via the old signature while new call sites use the new signature. Phase 2 removes the deprecated overloads and updates all call sites.
- [ ] Update unit tests in `tests/unit/schemas/`:
  - `entities.test.ts`: test new `epicOverviewItemSchema` and `epicOverviewSchema`
  - `schema-registry.test.ts`: update path assertions (remove `slices/overview.json`, add nested slice pattern, change epic overview schema)
  - `state-events.test.ts`: verify all 9 slice events have `epic` field

### Verification

- `tsc --noEmit` — type check passes. Function overloads on `getSlice`/`setSliceJson`/`setSliceStatus` let existing handler call sites compile via old signatures. `@ts-expect-error` annotations are only needed on out-of-scope RPC path functions (`resolveEntityDir` in `paths.ts`, `entityDir` in `priorities.ts`) returning stale flat paths — each annotation references slice 02.
- `bun test tests/unit/schemas/` — schema tests pass
- Schema registry resolves `epics/overview.json` to `epicOverviewSchema` (not `overviewSchema`)
- Schema registry resolves `epics/my-epic/slices/01-auth/slice.json` to `sliceSchema`

## Phase 2: Handlers, Helpers & Tests

Update all transition handler implementations to use nested paths, wire helper call sites to new signatures (from Phase 1), remove deprecated function overloads, and fix all test fixtures.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r '"slices/' src/core/state/transitions/` → many matches (flat path references in handlers)
- [ ] `grep -r "slices/overview.json" src/core/state/` → matches (handlers reference flat overview)

**After implementation** (should pass / show presence):
- [ ] `grep -r '"slices/' src/core/state/transitions/` → zero matches (all converted to nested)
- [ ] `grep -r "slices/overview.json" src/core/state/` → zero matches (eliminated)
- [ ] `bun test` → full test suite passes

### Tasks

**Note:** Helper signatures were updated in Phase 1 with function overloads (old + new arities). This phase updates helper *implementations* to use only the new signatures, updates all handler call sites to pass `epic`, and removes the deprecated overloads.

**Out of scope (slice 02 — RPC & Commands):** `src/core/rpc/begin.ts` (7 event builder functions needing `epic` from `Target`), `src/core/rpc/complete.ts` (`buildSliceCompleteResult` with 6 flat path refs, `buildCompleteEvent`), `src/core/rpc/paths.ts` (`resolveEntityDir`), `src/core/context/priorities.ts` (`entityDir`, `slices/overview.json` ref). These consume types changed here but their `@ts-expect-error` annotations remain until slice 02.

- [ ] Update helper implementations in `src/core/state/transitions/helpers.ts`:
  - `getSlice(state, epic, name)` — implementation: path `epics/${epic}/slices/${name}/slice.json`
  - `setSliceJson(state, epic, name, content)` — same path change
  - `setSliceStatus(state, epic, name, slice, newStatus, ts)` — passes epicName to `updateSliceOverviewStatus`
  - `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)` — finds epic in `epics/overview.json` as `EpicOverview`, updates slice in its `slices` array
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
  - `DeferredItem` creation: populate `targetEpic` from `event.epic` when routing cross-epic; omit for same-epic (optional field defaults to completing slice's epic)
- [ ] Update `src/core/state/transitions/slice-abandon.ts`:
  - Path references use nested format
  - Activity log scope strings
- [ ] Update `src/core/state/transitions/epic-lifecycle.ts` — `handleCompleteEpic`:
  - `COMPLETE_EPIC` reads embedded slices from `epics/overview.json` (as `EpicOverview`) instead of filtering `slices/overview.json`. The current handler (line 78) doesn't reference `slices/overview.json` directly, but verify no sibling-slice logic was added that assumes the flat overview. If none, this task is a no-op verification.
- [ ] Update `src/core/state/transitions/epic-create.ts`:
  - Verify `addEpicToOverview` includes `slices: []` (already updated in Phase 1 — confirm it works end-to-end)
- [ ] Verify `src/core/state/transitions/rollup-learnings.ts` needs no code changes (verification-only):
  - The handler uses `event.from` as a caller-supplied scope string (e.g., `"slices/01-auth"`) — this value is constructed in the RPC layer (`src/core/rpc/complete.ts`), which is slice 02. The handler itself does not hardcode flat paths; it builds `${event.from}/learnings.jsonl` dynamically. Once the RPC layer passes nested paths like `"epics/my-epic/slices/01-auth"`, the handler works unchanged.
  - **Verify:** grep `rollup-learnings.ts` for any hardcoded `slices/` path references. If none found, mark complete with no changes.
- [ ] Update test fixtures in `tests/fixtures/`:
  - Remove `sliceSequence` from 4 `epic.json` fixtures: `slice-refining-max-rounds`, `slice-in-progress`, `epic-activated`, `epic-created`
  - Move slice entries from `slices/` to `epics/<epic>/slices/` in fixture state trees (affects same 4 fixture directories plus any integration test fixtures)
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
  - **Note (`noUncheckedIndexedAccess`):** Tests accessing overview items by index (`overview.items[0]`) will return `T | undefined` — add undefined-narrowing (`!` assertion or guard) where test code accesses array elements after shape changes.

### Verification

- `tsc --noEmit` — type check passes
- `bun test tests/unit/state/` — all state machine tests pass
- `bun test tests/fitness/` — all fitness tests pass
- `bun test` — full test suite passes (864+ tests)
- `grep -r '"slices/' src/core/state/transitions/` → zero matches
- `grep -r "slices/overview.json" src/core/state/` → zero matches
- `grep "sliceSequence" src/schemas/entities/` → zero matches
- Verify `reduce()` produces state with slices under `epics/<epic>/slices/` — inspect a test output
- Remove all deprecated function overloads from `getSlice`/`setSliceJson`/`setSliceStatus` in helpers.ts (RPC `@ts-expect-error` annotations remain for slice 02)
- Verify `updateSliceOverviewStatus` sets `completed` timestamp on terminal transitions (`completed`/`abandoned`) — assert in at least one test that `completed` is non-null after `COMPLETE_SLICE` or `ABANDON_SLICE`
- **Documentation updates** deferred to a later slice — architecture docs (`data-model.md`, `state-machine-api.md`, etc.) will be updated after the full entity restructuring epic lands.
