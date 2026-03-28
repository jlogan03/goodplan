# Plan: Update Architecture Docs for Tasks and Paths

## Overview

Update architecture documentation to reflect current codebase reality. Three categories of drift were identified by `/audit-docs` (2026-03-27): (1) the Task entity is fully implemented but nearly absent from architecture docs, (2) schema registry examples use pre-restructuring flat slice paths, and (3) various per-API doc corrections (fitness function status, event type names, missing fields).

All changes are pure documentation edits — no code changes. The source of truth for each correction is the actual codebase (grep exports, read source files, check test paths).

## Phase 1: Task Entity Documentation

Add the Task entity to all architecture docs that currently omit it.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'Task namespace' .project/architecture/commands-api.md` returns 0 — no Task section
- [ ] `grep -c 'CREATE_TASK' .project/architecture/state-machine-api.md` returns 0 — no task events

**After implementation** (should pass / show presence):
- [ ] `grep -c 'Task namespace' .project/architecture/commands-api.md` returns >= 1
- [ ] `grep -c 'CREATE_TASK' .project/architecture/state-machine-api.md` returns >= 1
- [ ] `grep -c 'create-task' .project/architecture/rpc-layer-api.md` returns >= 1
- [ ] `grep -c 'task\.json' .project/architecture/data-model.md` returns >= 2 (schema registry + entity section)

### Tasks

- [ ] **Add Task namespace to `commands-api.md`**: Read `src/commands/task/*.ts` to extract exact command signatures, flags, stdin schemas, and descriptions. Add a "Task namespace" section parallel to the existing Epic/Slice/Quest sections. Include `task:create`, `task:list`, `task:show`, `task:drop`, `task:convert`. Add task commands to the command-to-event mapping table.
- [ ] **Add task events to `state-machine-api.md`**: Read `src/schemas/state-events.ts` for exact `CREATE_TASK`, `DROP_TASK`, `CONVERT_TASK` event type definitions. Add them to the `StateEvent` discriminated union with a "Task lifecycle" comment section. Cross-reference `transition-tables.md` which already documents these transitions.
- [ ] **Add task phases to `rpc-layer-api.md`**: Read `src/core/rpc/begin.ts` for the task-related cases. Add `'create-task' | 'drop-task' | 'convert-task'` to the `BeginPhase` type and add the corresponding event mappings.
- [ ] **Add task patterns to `data-model.md` schema registry**: Read `src/core/data/schema-registry.ts` for the `tasks/overview.json` and `tasks/<name>/task.json` patterns. Add them to the schema registry example. Verify the existing task entity section in data-model.md is complete (it documents `task.json` but check for `task:drop` coverage).

### Verification

- All 4 architecture docs now mention the Task entity
- Task event types match `src/schemas/state-events.ts` exactly
- Task command signatures match `src/commands/task/*.ts` exactly

## Phase 2: Per-API Doc Corrections

Fix schema registry paths, event type names, fitness function status, and missing fields.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep 'slices\/\[' .project/architecture/data-layer-api.md` matches flat paths (no `epics/` prefix)
- [ ] `grep 'candidate' .project/architecture/state-machine-api.md` returns matches for fitness functions

**After implementation** (should pass / show presence):
- [ ] `grep 'epics.*slices' .project/architecture/data-layer-api.md` matches nested paths
- [ ] `grep -c 'candidate' .project/architecture/state-machine-api.md` returns 0 — all fitness functions reference actual test files
- [ ] `grep 'goal: string' .project/architecture/state-machine-api.md` appears in `CREATE_QUEST` event

### Tasks

- [ ] **Fix schema registry paths in `data-layer-api.md`**: Replace flat `slices/overview.json` and `slices/[^/]+/slice.json` patterns with the actual nested paths from `src/core/data/schema-registry.ts` (`epics/[^/]+/slices/[^/]+/slice.json`, etc.). Also add any missing patterns (tasks).
- [ ] **Fix schema registry paths in `data-model.md`**: Same correction — replace flat slice patterns with nested epic-scoped paths. Add task patterns.
- [ ] **Add `goal` field to `CREATE_QUEST` event in `state-machine-api.md`**: Read `src/schemas/state-events.ts` line ~81 for the exact type. Change from `{ type: 'CREATE_QUEST'; name: string; ts: string }` to include `goal: string`.
- [ ] **Fix `COMPLETE_QUEST`/`COMPLETE_SLICE` event type names in `state-machine-api.md`**: Replace `Learning[]` with `LearningEventEntry[]` and `ArchitectureDelta[]` with `ArchitectureDeltaInput[]` to match `src/schemas/state-events.ts`.
- [ ] **Update fitness function status in `state-machine-api.md`**: Replace all "candidate — not yet written" entries with actual test file paths from `tests/fitness/`. Cross-reference `_overview.md` which already has the correct paths.
- [ ] **Update fitness function status in `data-layer-api.md`**: Same — replace "candidate" with actual test paths.
- [ ] **Update fitness function status in `commands-api.md`**: Same.
- [ ] **Update fitness function status in `rpc-layer-api.md`**: Same.

### Verification

- No "candidate — not yet written" remains in any per-API doc's fitness function section
- Schema registry examples in `data-layer-api.md` and `data-model.md` match `src/core/data/schema-registry.ts`
- `CREATE_QUEST` event has `goal: string` field
- `COMPLETE` event types use `LearningEventEntry[]` and `ArchitectureDeltaInput[]`

## Phase 3: Primer and Conventions Cleanup

Update user-facing docs and repo-level conventions.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep 'slices/01-auth' docs/primer.md` matches flat slice path in directory structure
- [ ] `grep 'workflow/' .project/conventions.md` matches nonexistent directory

**After implementation** (should pass / show presence):
- [ ] `grep 'epics/' docs/primer.md` appears in the directory structure section
- [ ] `grep -c 'workflow/' .project/conventions.md` returns 0
- [ ] `grep 'audit-docs' .project/conventions.md` matches in the skills listing

### Tasks

- [ ] **Rewrite `docs/primer.md` directory structure**: Replace the "Shape of a Project" section with the current reality from `data-model.md`. Key fixes: (a) slices nested under `epics/<name>/slices/`, (b) goals are string fields in entity JSON (not separate `goal.md` files), (c) `learnings/` directory with per-learning `.md` files (not flat `learnings.md`), (d) per-task directories with `task.json` (not `tasks/task.jsonl`), (e) add `activity-log.jsonl`, `project.json` with version. Preserve the primer's explanatory prose around the structure — just fix the directory tree itself.
- [ ] **Remove stale entries from `conventions.md` repo structure**: Remove `src/core/workflow/` (doesn't exist) and `src/commands/activity/` (not implemented). If `activity:list` is still planned, add a comment; if not, remove.
- [ ] **Add missing skills to `conventions.md`**: Add `audit-docs/`, `audit-tests/`, `capture/` to the skills listing (alphabetical order).
- [ ] **Remove stale "tracer bullet" note from `flows.md`**: Delete the development note at line ~34 about the tracer bullet init implementation — this is historical commentary about completed development work.

### Verification

- `docs/primer.md` directory structure matches `data-model.md` canonical layout
- `conventions.md` skills listing count matches actual `ls skills/ | wc -l`
- `conventions.md` repo structure has no references to nonexistent directories
- `flows.md` has no "tracer bullet" references
