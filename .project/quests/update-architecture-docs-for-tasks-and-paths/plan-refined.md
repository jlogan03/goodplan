# Plan: Update Architecture Docs for Tasks and Paths

## Overview

Update architecture documentation to reflect current codebase reality. Four categories of drift were identified by `/audit-docs` (2026-03-27): (1) the Task entity is fully implemented but nearly absent from architecture docs, (2) schema registry examples use pre-restructuring flat slice paths, (3) various per-API doc corrections (fitness function status, event type names, missing fields), and (4) the Context module has no dedicated architecture doc (deferred — see Phase 2 notes).

All changes are pure documentation edits — no code changes. The source of truth for each correction is the actual codebase (grep exports, read source files, check test paths).

## Phase 1: Task Entity Documentation

Add the Task entity to all architecture docs that currently omit it.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -c 'Task namespace' .project/architecture/commands-api.md` returns 0 — no Task section
- [x] `grep -c 'CREATE_TASK' .project/architecture/state-machine-api.md` returns 0 — no task events

**After implementation** (should pass / show presence):
- [x] `grep -c 'Task namespace' .project/architecture/commands-api.md` returns >= 1
- [x] `grep -c 'CREATE_TASK' .project/architecture/state-machine-api.md` returns >= 1
- [x] `grep -c 'create-task' .project/architecture/rpc-layer-api.md` returns >= 1
- [x] `grep -c 'task\.json' .project/architecture/data-model.md` returns >= 2 (schema registry + entity section)

### Tasks

- [x] **Add Task namespace to `commands-api.md`**: Read `src/commands/task/*.ts` to extract exact command signatures, flags, stdin schemas, and descriptions. Add a "Task namespace" section parallel to the existing Epic/Slice/Quest sections. Include `task:create`, `task:list`, `task:show`, `task:drop`, `task:convert`. Add task commands to the command-to-event mapping table.
- [x] **Add task events to `state-machine-api.md`**: Read `src/schemas/state-events.ts` for exact `CREATE_TASK`, `DROP_TASK`, `CONVERT_TASK` event type definitions. Add them to the `StateEvent` discriminated union with a "Task lifecycle" comment section. Cross-reference `transition-tables.md` which already documents these transitions.
- [x] **Add task phases to `rpc-layer-api.md`**: Read `src/core/rpc/begin.ts` for the task-related cases. Add `'create-task' | 'drop-task' | 'convert-task'` to the `BeginPhase` type and add the corresponding event mappings.
- [x] **Add task patterns to `data-model.md` schema registry**: Read `src/core/data/schema-registry.ts` for the `tasks/overview.json` and `tasks/<name>/task.json` patterns. Add them to the schema registry example. Verify the existing task entity section in data-model.md is complete (it documents `task.json` but check for `task:drop` coverage).

### Verification

- All 4 architecture docs now mention the Task entity
- Task event types match `src/schemas/state-events.ts` exactly
- Task command signatures match `src/commands/task/*.ts` exactly

## Phase 2: Per-API Doc Corrections

Fix schema registry paths, event type names, fitness function status, and missing fields.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep 'slices/overview' .project/architecture/data-layer-api.md` matches flat `slices/overview.json` entry (no `epics/` prefix)
- [x] `grep 'candidate — not yet written' .project/architecture/state-machine-api.md` returns matches for fitness functions

**After implementation** (should pass / show presence):
- [x] `grep 'epics.*slices' .project/architecture/data-layer-api.md` matches nested paths
- [x] `grep -c 'candidate — not yet written' .project/architecture/state-machine-api.md` returns 0 — all 3 resolved
- [x] `grep -c 'candidate — not yet written' .project/architecture/data-layer-api.md` returns 0 — all 5 resolved
- [x] `grep -c 'candidate — not yet written' .project/architecture/commands-api.md` returns 1 — "structured JSON" candidate remains (no test)
- [x] `grep -c 'candidate — not yet written' .project/architecture/rpc-layer-api.md` returns 2 — both remain (no tests)
- [x] `grep 'goal: string' .project/architecture/state-machine-api.md` appears in `CREATE_QUEST` event

### Tasks

- [x] **Fix schema registry paths in `data-layer-api.md`**: Remove stale flat entries (`slices/overview.json`, `slices/[^/]+/slice.json`) entirely — there is no replacement pattern for slice overviews in the schema registry. Add the actual nested paths from `src/core/data/schema-registry.ts` (`epics/[^/]+/slices/[^/]+/slice.json`, etc.). Also add any missing patterns (tasks). Fix `overviewSchema` to `epicOverviewSchema` for `epics/overview.json` to match actual code.
- [x] **Fix schema registry paths in `data-model.md`**: Same correction — remove stale flat slice entries entirely, add nested epic-scoped paths, add task patterns. Fix `overviewSchema` to `epicOverviewSchema` for `epics/overview.json`.
- [x] **Add `goal` field to `CREATE_QUEST` event in `state-machine-api.md`**: Read `src/schemas/state-events.ts` line ~81 for the exact type. Change from `{ type: 'CREATE_QUEST'; name: string; ts: string }` to include `goal: string`.
- [x] **Fix `COMPLETE_QUEST`/`COMPLETE_SLICE` event type names in `state-machine-api.md`**: In `COMPLETE_SLICE`, replace `LearningInput[]` with `LearningEventEntry[]`. In `COMPLETE_QUEST`, replace `Learning[]` with `LearningEventEntry[]` and `ArchitectureDelta[]` with `ArchitectureDeltaInput[]`. Verify exact before/after type names against `src/schemas/state-events.ts`.
- [x] **Update fitness function status in `state-machine-api.md`**: All 3 candidates have matching tests — replace all "candidate — not yet written" with actual test file paths from `tests/fitness/`. Cross-reference `_overview.md` which already has the correct paths.
- [x] **Update fitness function status in `data-layer-api.md`**: All 5 candidates have matching tests — replace all "candidate" with actual test paths.
- [x] **Update fitness function status in `commands-api.md`**: 2 candidates — map "Read-only commands are read-only" to `tests/fitness/stateless-commands.test.ts` (covers related INV-004 invariant). Leave "Every error produces structured JSON and correct exit code" as candidate (no matching test exists — tracked in side quest `improve-test-coverage-and-quality`).
- [x] **Update fitness function status in `rpc-layer-api.md`**: 2 candidates — both "Context budget is respected" and "All mutation operations call reduce() before commitState()" remain candidates (no matching tests exist). Leave as "candidate — not yet written".

### Verification

- **Deferred**: Finding 12 (Context module has no dedicated architecture doc, e.g. `context-api.md`) is out of scope for this quest — the context module is internal and does not yet have a stable public API surface. Capture as a future task if/when the context module stabilizes.
- `state-machine-api.md` and `data-layer-api.md`: zero "candidate — not yet written" entries remain (all have matching tests)
- `commands-api.md`: 1 of 2 candidates resolved (1 remains — no matching test, tracked in `improve-test-coverage-and-quality`)
- `rpc-layer-api.md`: both candidates remain (no matching tests exist)
- Schema registry examples in `data-layer-api.md` and `data-model.md` match `src/core/data/schema-registry.ts`
- `CREATE_QUEST` event has `goal: string` field
- `COMPLETE_SLICE` uses `LearningEventEntry[]` (not `LearningInput[]`) and `COMPLETE_QUEST` uses `LearningEventEntry[]` (not `Learning[]`) and `ArchitectureDeltaInput[]` (not `ArchitectureDelta[]`)

## Phase 3: Primer and Conventions Cleanup

Update user-facing docs and repo-level conventions.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep 'slices/' docs/primer.md` matches flat slice path in directory structure
- [x] `grep 'workflow/' .project/conventions.md` matches nonexistent directory

**After implementation** (should pass / show presence):
- [x] `grep 'epics/' docs/primer.md` appears in the directory structure section
- [x] `grep -c 'workflow/' .project/conventions.md` returns 0
- [x] `grep 'audit-docs' .project/conventions.md` matches in the skills listing

### Tasks

- [x] **Rewrite `docs/primer.md` directory structure**: Replace the "Shape of a Project" section with the current reality from `data-model.md`. Key fixes: (a) slices nested under `epics/<name>/slices/`, (b) goals are string fields in entity JSON (not separate `goal.md` files), (c) `learnings/` directory with per-learning `.md` files (not flat `learnings.md`), (d) per-task directories with `task.json` (not `tasks/task.jsonl`), (e) add `activity-log.jsonl`, `project.json` with version. Preserve the primer's explanatory prose around the structure — just fix the directory tree itself.
- [x] **Update `conventions.md` repo structure**: Remove `src/core/workflow/` (doesn't exist) and `src/commands/activity/` (not implemented). Add `src/commands/task/` (exists with 5 command files: create, list, show, drop, convert). Add `task-create` and `task-lifecycle` to the transition handler listing. Add `task` to the entity schemas list, and `task.ts` and `artifacts.ts` to the command schemas list. If `activity:list` is still planned, add a comment; if not, remove.
- [x] **Add missing skills to `conventions.md`**: Add `audit-docs/`, `audit-tests/`, `capture/` to the skills listing (alphabetical order).
- [x] **Remove stale "tracer bullet" note from `flows.md`**: Delete the development note at line ~34 about the tracer bullet init implementation — this is historical commentary about completed development work.

### Verification

- `docs/primer.md` directory structure matches `data-model.md` canonical layout
- `conventions.md` skills listing count matches actual `ls skills/ | grep -v _shared | wc -l` (excluding `_shared/`)
- `conventions.md` repo structure has no references to nonexistent directories
- `flows.md` has no "tracer bullet" references
