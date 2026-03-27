# Plan: RPC and Commands

Status: COMPLETE
Completed: 2026-03-27

## Overview

Clear all 22 @ts-expect-error/TODO annotations from slice 01, update RPC path resolution and event-building functions for nested paths, update all slice commands to pass `epic` in Target, update `status` to read from embedded overview, and fix all downstream tests. Single phase — changes are mechanical and interdependent.

This slice builds on slice 01's type foundation (epicOverviewSchema, Target.epic, event epic fields). The schema registry and state machine already use nested paths — this slice wires the RPC orchestration and CLI commands to match.

## Phase 1: RPC, Commands & Tests

Clear @ts-expect-error annotations, update path resolution, update commands, fix tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -rc "@ts-expect-error.*slice.02" src/ | awk -F: '{s+=$2}END{print s}'` → 20 (annotations from slice 01; note: `.` matches any char but all annotations use literal `slice.02`)
- [x] `grep -rc "TODO(slice-02)" src/ | awk -F: '{s+=$2}END{print s}'` → 2

**After implementation** (should pass / show presence):
- [x] `grep -rc "@ts-expect-error.*slice.02" src/ | awk -F: '{s+=$2}END{print s}'` → 0
- [x] `grep -rc "TODO(slice-02)" src/ | awk -F: '{s+=$2}END{print s}'` → 0
- [x] `bun test tests/unit/` → all pass (864+)
- [x] `bun run build && goodplan slice:list --json` → shows slices under active epic

### Tasks

**RPC Layer** (clear @ts-expect-error, update logic):

- [x] `src/core/rpc/paths.ts` (1 TODO):
  - `resolveEntityDir()`: update slice case to `epics/${target.epic}/slices/${target.name}`
  - `resolveForBeginPhase()`: update any slice-specific path references
  - `mapToBeginPhase()`: update if slice paths are referenced
- [x] `src/core/rpc/begin.ts` (4 @ts-expect-error):
  - `buildAbandonEvent()`: add `epic: target.epic` to ABANDON_SLICE event
  - `buildPlanPhaseEvent()`: add `epic: target.epic` to BEGIN_PLAN event
  - `buildRefinePlanEvent()`: add `epic: target.epic` to BEGIN_REFINEMENT event
  - `buildImplementEvent()`: add `epic: target.epic` to BEGIN_IMPLEMENTATION event
- [x] `src/core/rpc/complete.ts` (1 @ts-expect-error):
  - `buildCompleteEvent()`: add `epic: target.epic` to COMPLETE_SLICE event
  - `buildSliceCompleteResult()` (line 170): add `epicName: string` as the second parameter — signature becomes `buildSliceCompleteResult(sliceName: string, epicName: string, entity: string, ...)`. Update call site (line 157) to pass `target.epic`. Update 5 path references in the main complete/deferred logic (lines 176-177, 188, 208-209) from `slices/${sliceName}/...` to `epics/${epicName}/slices/${sliceName}/...`
  - **Separately**: line 259 (`getJsonl(newState, \`slices/${sliceName}/architecture-deltas.jsonl\`)`) — this is 80+ lines away in the architecture path derivation section and is a JSONL file (structurally different from the other 5 JSON path refs). Update to `epics/${epicName}/slices/${sliceName}/architecture-deltas.jsonl`. Easy to miss — verify explicitly.
  - Deferred routing loop (lines 206-219): restructure iteration — the flattened slice list from `overview.items` loses epic association (since `sliceOverviewItemSchema` has no `epic` field). Must preserve per-item epic name during flattening — e.g., map to `{ epicName, ...sliceItem }` tuples, or iterate nested (for each epic entry, for each slice in that epic). Each deferred target needs its own epic for path construction: `slices/${item.name}/slice.json` (line 208) becomes `epics/${epicName}/slices/${item.name}/slice.json` where `epicName` is the per-item epic name from the tuple. NOT the single top-level `epicName` parameter. `DeferredItem.targetEpic` is `string | undefined` (defaults to same epic but can target different epics). The `epicComplete` check (line 190) correctly filters to same-epic only — that scoping is intentional and should be preserved.
  - Overview filter (line 190): replace `overview.items.filter(...)` with: load `epics/overview.json`, flatten all epics' embedded `slices` arrays into `{ epicName, ...sliceItem }` tuples for the deferred routing iteration (structural change, not just path swap)
- [x] `src/core/rpc/submit.ts` (3 @ts-expect-error):
  - `buildSubmitEvent()`: add `epic: target.epic` to COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION events

**Context Layer** (1 TODO + 1 path fix — note: context unit tests are slice 03, but path fixes belong here since they're RPC-adjacent):

- [x] `src/core/context/index.ts`:
  - `resolveScope()` (line 101): update `slices/${target.name}` to `epics/${target.epic}/slices/${target.name}` for slice scope resolution (`target.epic` is available on Target)
- [x] `src/core/context/priorities.ts` (1 TODO):
  - `entityDir()`: update slice path to `epics/${target.epic}/slices/${target.name}`
  - `completeSources` (line 67): update `{ key: "slices-overview", path: "slices/overview.json" }` to `{ key: "slices-overview", path: "epics/overview.json" }`
  - `refineSlicesSources` (line 111): update `{ key: "slice-definitions", path: "slices", sourceType: "directory" }` to `{ key: "slice-definitions", path: "epics/${target.epic}/slices", sourceType: "directory" }` — the bare `slices` path would silently resolve to nothing after migration

**Shared Helper** (new):

- [x] Create `src/commands/slice/utils.ts` with `requireActiveEpic(projectDir: string): string` — uses `loadState(projectDir)` + `getJson<Project>(state, "project.json")` (not direct `fs` reads, per INV-005), returns `activeEpic`, throws `GoodplanError` with a namespaced code (e.g., `"NO_ACTIVE_EPIC"`) per INV-007 if `activeEpic` is null/undefined. Used by `plan.ts`, `refine-plan.ts`, `implement.ts`, `complete.ts`, `abandon.ts`, and the 6 subagent commands. NOT used by `create.ts` (which has a required `--epic` flag).

**Commands** (12 @ts-expect-error — each needs `epic` in Target):

- [x] `src/commands/slice/create.ts`: construct Target with `epic` from `input.epic` (use the validated schema value, same as line 47's `begin()` payload, not the raw `args.epic`). Does NOT use `requireActiveEpic` — the `--epic` flag is required.
- [x] `src/commands/slice/plan.ts`: import `requireActiveEpic`, derive `epic` via `requireActiveEpic(projectDir)`
- [x] `src/commands/slice/refine-plan.ts`: same — `requireActiveEpic(projectDir)`
- [x] `src/commands/slice/implement.ts`: same — `requireActiveEpic(projectDir)`
- [x] `src/commands/slice/complete.ts`: same — `requireActiveEpic(projectDir)`
- [x] `src/commands/slice/abandon.ts`: same — `requireActiveEpic(projectDir)`
- [x] `src/commands/slice/list.ts`: change import from `Overview`/`overviewSchema` to `EpicOverview`/`epicOverviewSchema`. Read `epics/overview.json`. Add `--all` flag to the args definition (currently only `--epic` exists). For default/`--epic`: find epic entry, return its `slices` array. For `--all`: flatten all epics' slice arrays. Adjust output format since `SliceOverviewItem` omits `epic` and `title` fields — human-readable output must remove `epicStr` referencing `item.epic` (currently line 53), and when `--all` is used, group output by epic with epic name as a section header.
- [x] `src/commands/slice/show.ts`: add `--epic` flag to args definition (defaults to active epic via `requireActiveEpic` when omitted; throw a clean error if neither `--epic` nor `activeEpic` is set). Update `getJson` (line 36) and `getDir` (line 42) from `slices/${args.slice}/...` to `epics/${epic}/slices/${args.slice}/...` — these are direct path references, not via `resolveEntityDir`
- [x] `src/commands/subagent/start-plan.ts`: import `requireActiveEpic`, add `epic` to slice Target
- [x] `src/commands/subagent/start-refinement.ts`: same
- [x] `src/commands/subagent/start-implementation.ts`: same
- [x] `src/commands/subagent/submit-plan.ts`: import `requireActiveEpic`, add `epic` to slice Target
- [x] `src/commands/subagent/submit-refinement.ts`: same
- [x] `src/commands/subagent/submit-implementation.ts`: same

**Status**:

- [x] `src/commands/global/status.ts`:
  - `countArtifacts()` — read `completedSlices`/`totalSlices` from `epics/overview.json` embedded slices arrays (aggregate across all epics) instead of `slices/overview.json`
  - `resolveActiveSlice()` (line 83): update `slices/${project.activeSlice}/slice.json` to `epics/${project.activeEpic}/slices/${project.activeSlice}/slice.json`. Add null guard — if `project.activeEpic` is null, return early (same as existing `activeSlice` null check) to avoid `epics/null/slices/...` paths.
  - `checkStale()` (line 247): update scope prefix from `slices/${project.activeSlice}` to `epics/${project.activeEpic}/slices/${project.activeSlice}`. Add null guard for `project.activeEpic` before path interpolation.

**Tests**:

- [x] Update `tests/unit/rpc/begin.test.ts`: add `epic` to all slice Target and event fixtures. Note: `begin.ts` result builders already use `resolveEntityJsonPath` (updated in slice 01) — no path string updates needed in the result builders themselves, only the `epic` field additions.
- [x] Update `tests/unit/rpc/complete.test.ts`: add `epic`, update path assertions for nested paths
- [x] Update `tests/unit/rpc/paths.test.ts`: update resolveEntityDir assertions for slice variant
- [x] Update `tests/unit/rpc/submit.test.ts`: add `epic` to all slice Target fixtures (line 141 constructs `{ type: "slice", name: "s1" }` without `epic`). Note: `submit.ts` result builders already use `resolveEntityJsonPath` (updated in slice 01) — no path string updates needed in the result builders themselves, only the `epic` field additions.
- [x] Update `tests/unit/commands/status.test.ts`: update overview fixture to use `epicOverviewSchema` with embedded slices
- [x] Update `tests/unit/commands/schema.test.ts`: if any slice command schemas changed
- [x] Update `tests/unit/context/startContext.test.ts`: 9 instances of `{ type: "slice", name: "..." }` need `epic` field added. Without it, `resolveScope()` and `entityDir()` will produce `epics/undefined/slices/...` paths. These tests are excluded from `tsconfig.json` so `tsc --noEmit` won't catch this, but `bun test` will fail. **Update these in the same pass as `resolveScope`/`entityDir` changes** (Context Layer above) to avoid broken intermediate state.
- [x] Update `tests/unit/commands/slice/slice-commands.test.ts`: 32 instances of slice Targets without `epic` — bulk of remaining test work
- [x] Update `tests/unit/commands/learning/learning-commands.test.ts`: 7 instances of slice Targets without `epic`
- [x] Update `tests/unit/commands/subagent/start-commands.test.ts`: 4 instances of slice Targets without `epic`
- [x] Update `tests/unit/context/collect.test.ts`: 1 instance of slice Target without `epic`
- [x] Update `tests/unit/data/tree.test.ts` and `tests/unit/data/state.test.ts`: fixture paths write to `slices/overview.json` — update to `epics/overview.json` if the data layer now expects the nested location.
- [x] Update any other unit test files that construct slice Targets or events without `epic`

**Documentation**:

- [x] Update `.project/architecture/rpc-layer-api.md`: update Target type examples to include `epic` field (currently stale — shows old Target without `epic`)

### Verification

- `tsc --noEmit` — type check passes (0 @ts-expect-error remaining)
- `bun test tests/unit/` — all unit tests pass
- `bun run build` — binary compiles
- Full CLI test with `--json`: `epic:create` → `slice:create` → `slice:list --json` → `slice:show --epic <name> --json` → verify nested paths and correct data returned
- `goodplan slice:list --all --json` → returns slices from multiple epics, correctly aggregated
- `goodplan slice:show <name>` → defaults to `activeEpic`, errors cleanly when neither `--epic` nor `activeEpic` is set
- `goodplan status --json` → `completedSlices`/`totalSlices` aggregate correctly
- `goodplan schema --json` → shows all slice commands
- `grep -rc "@ts-expect-error.*slice.02" src/` → 0
- `grep -rc "TODO(slice-02)" src/` → 0 (exact count verification)
