# Plan: RPC and Commands

## Overview

Clear all 22 @ts-expect-error/TODO annotations from slice 01, update RPC path resolution and event-building functions for nested paths, update all slice commands to pass `epic` in Target, update `status` to read from embedded overview, and fix all downstream tests. Single phase — changes are mechanical and interdependent.

This slice builds on slice 01's type foundation (epicOverviewSchema, Target.epic, event epic fields). The schema registry and state machine already use nested paths — this slice wires the RPC orchestration and CLI commands to match.

## Phase 1: RPC, Commands & Tests

Clear @ts-expect-error annotations, update path resolution, update commands, fix tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rc "@ts-expect-error.*slice" src/ | awk -F: '{s+=$2}END{print s}'` → 20 (annotations from slice 01)
- [ ] `grep -rc "TODO(slice-02)" src/ | awk -F: '{s+=$2}END{print s}'` → 2

**After implementation** (should pass / show presence):
- [ ] `grep -rc "@ts-expect-error.*slice" src/ | awk -F: '{s+=$2}END{print s}'` → 0
- [ ] `grep -rc "TODO(slice-02)" src/ | awk -F: '{s+=$2}END{print s}'` → 0
- [ ] `bun test tests/unit/` → all pass (864+)
- [ ] `bun run build && goodplan slice:list --json` → shows slices under active epic

### Tasks

**RPC Layer** (clear @ts-expect-error, update logic):

- [ ] `src/core/rpc/paths.ts` (1 TODO):
  - `resolveEntityDir()`: update slice case to `epics/${target.epic}/slices/${target.name}`
  - `resolveForBeginPhase()`: update any slice-specific path references
  - `mapToBeginPhase()`: update if slice paths are referenced
- [ ] `src/core/rpc/begin.ts` (4 @ts-expect-error):
  - `buildAbandonEvent()`: add `epic: target.epic` to ABANDON_SLICE event
  - `buildPlanPhaseEvent()`: add `epic: target.epic` to BEGIN_PLAN event
  - `buildRefinePlanEvent()`: add `epic: target.epic` to BEGIN_REFINEMENT event
  - `buildImplementEvent()`: add `epic: target.epic` to BEGIN_IMPLEMENTATION event
- [ ] `src/core/rpc/complete.ts` (1 @ts-expect-error):
  - `buildCompleteEvent()`: add `epic: target.epic` to COMPLETE_SLICE event
  - `buildSliceCompleteResult()`: update all 6 path references to use nested paths, read sibling slices from `epics/overview.json` embedded array instead of `slices/overview.json`
- [ ] `src/core/rpc/submit.ts` (3 @ts-expect-error):
  - `buildSubmitEvent()`: add `epic: target.epic` to COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION events

**Context Layer** (1 TODO — note: context unit tests are slice 03, but the path fix belongs here since it's in the RPC-adjacent paths.ts):

- [ ] `src/core/context/priorities.ts` (1 TODO):
  - `entityDir()`: update slice path to `epics/${target.epic}/slices/${target.name}`

**Commands** (12 @ts-expect-error — each needs `epic` in Target):

- [ ] `src/commands/slice/create.ts`: construct Target with `epic` from `--epic` flag or `project.json.activeEpic`
- [ ] `src/commands/slice/plan.ts`: same — derive `epic` from active epic
- [ ] `src/commands/slice/refine-plan.ts`: same
- [ ] `src/commands/slice/implement.ts`: same
- [ ] `src/commands/slice/complete.ts`: same
- [ ] `src/commands/slice/abandon.ts`: same
- [ ] `src/commands/slice/list.ts`: read `epics/overview.json`, find epic entry, return its `slices` array. Add `--epic` flag (defaults to active epic). Add `--all` flag for cross-epic listing.
- [ ] `src/commands/slice/show.ts`: derive `epic` for path resolution (from `--epic` or active epic)
- [ ] `src/commands/subagent/start-plan.ts`: add `epic` to slice Target
- [ ] `src/commands/subagent/start-refinement.ts`: same
- [ ] `src/commands/subagent/start-implementation.ts`: same
- [ ] `src/commands/subagent/submit-plan.ts`: add `epic` to slice Target
- [ ] `src/commands/subagent/submit-refinement.ts`: same
- [ ] `src/commands/subagent/submit-implementation.ts`: same

**Status**:

- [ ] `src/commands/global/status.ts`: `countArtifacts()` — read `completedSlices`/`totalSlices` from `epics/overview.json` embedded slices arrays (aggregate across all epics) instead of `slices/overview.json`

**Tests**:

- [ ] Update `tests/unit/rpc/begin.test.ts`: add `epic` to all slice Target and event fixtures
- [ ] Update `tests/unit/rpc/complete.test.ts`: add `epic`, update path assertions for nested paths
- [ ] Update `tests/unit/rpc/paths.test.ts`: update resolveEntityDir assertions for slice variant
- [ ] Update `tests/unit/commands/status.test.ts`: update overview fixture to use `epicOverviewSchema` with embedded slices
- [ ] Update `tests/unit/commands/schema.test.ts`: if any slice command schemas changed
- [ ] Update any other unit test files that construct slice Targets or events without `epic`

### Verification

- `tsc --noEmit` — type check passes (0 @ts-expect-error remaining)
- `bun test tests/unit/` — all unit tests pass
- `bun run build` — binary compiles
- Full CLI test with `--json`: `epic:create` → `slice:create` → `slice:list --json` → `slice:show --json` → verify nested paths
- `goodplan status --json` → `completedSlices`/`totalSlices` aggregate correctly
- `goodplan schema --json` → shows all slice commands
- `grep -rc "@ts-expect-error.*slice" src/` → 0
- `grep -rc "TODO(slice-02)" src/` → 0
