# Architecture Updates: entity-restructuring (epic)

## Reconciliation Summary

Compared epic target architecture (`epics/entity-restructuring/architecture/`) against current project-level architecture (`.project/architecture/`). Three divergences found, all classified as (c) evolved understanding — partial doc updates from individual slice completions that were not fully reconciled.

## Changes Made

### 1. `data-model.md` — Corrected slice overview location
The doc said slices are "embedded within `epic.json`" when they are actually embedded in `epics/overview.json` (using `epicOverviewSchema`). Updated to reflect reality.

### 2. `state-machine-api.md` — Added `epic` field to all slice event types
The code has `epic: string` on all 9 slice events (`CREATE_SLICE`, `BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, `COMPLETE_REFINEMENT_ROUND`, `BEGIN_IMPLEMENTATION`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE`). The doc only had it on `CREATE_SLICE`. Updated all 8 remaining events.

### 3. `state-machine-api.md` — Added `targetEpic` to DeferredItem
The code has `targetEpic: z.string().min(1).optional()` on the deferred item schema. The doc was missing it. Added as optional field with comment explaining default behavior.

## No Divergences Found

- Nested slice paths: fully reflected in all 5 architecture docs
- Consolidated overview in `epics/overview.json`: correctly documented
- `sliceSequence` removal: no stale references remain
- Learnings source of truth (`learnings.jsonl` only): correctly documented
- `Target` type with `epic` field: correctly shown in `rpc-layer-api.md`
- Schema registry patterns: correctly shown in `data-model.md`
- Migration re-run support: correctly documented in `commands-api.md`

## Incomplete Work

None. All items from the epic goal have been implemented and documented.

## Intentional Scope Reductions

None. All items in the original goal were delivered.
