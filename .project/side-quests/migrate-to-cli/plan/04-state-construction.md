# Phase 4: State Construction & Artifact Copy

When the confirmation round is approved, construct all CLI state from validated migration answers. Rename `.project/` → `.project-old/`, create fresh `.project/` via the state machine, and copy markdown artifacts from old paths using `sourcePath` mappings.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r "MIGRATE_PROJECT" src/core/state/` → no matches (event doesn't exist)
- [ ] After confirming migration, the CLI returns `status: complete` but no state files are actually created

**After implementation** (should pass / show presence):
- [ ] After confirmed migration: `.project-old/` exists (renamed from original), fresh `.project/` exists with:
  - `project.json` with correct name, activeEpic/activeSlice/activeQuest (all null for fully archived projects)
  - `epics/overview.json` listing all epics with correct statuses
  - `epics/<name>/epic.json` for each epic with correct status, goal, sliceSequence
  - `slices/overview.json` listing all slices
  - `slices/<name>/slice.json` for each slice with correct status, epic reference, goal
  - `quests/overview.json` listing all quests
  - `quests/<name>/quest.json` for each quest with correct status, goal
  - `activity-log.jsonl` with a migration entry
- [ ] Markdown artifacts from `.project-old/` are present in `.project/`:
  - `idea.md`, `conventions.md`, `learnings.md` (project-level)
  - `architecture/` directory with all contents
  - Per-epic: `architecture/`, `research/`, `brainstorm/` (if they existed)
  - `research/`, `brainstorm/`, `prototypes/` (project-level, if they existed)
  - `decisions/` directory with all markdown decision files
- [ ] `.migration-in-progress.json` is removed after successful migration
- [ ] `goodplan status --json` returns valid project state (no `DATA_NO_PROJECT` error)

### Tasks

- [ ] Add `MIGRATE_PROJECT` event to the state machine:
  - New event type in `src/core/state/` event union:
    ```typescript
    { type: 'MIGRATE_PROJECT', ts: string, payload: MigratePayload }
    ```
  - `MigratePayload` contains the full validated migration data: project info, epic list with details, slice list, quest list — everything needed to construct the complete state tree
  - Transition handler constructs the full `ProjectState` tree in one operation:
    - `project.json` with version, name, timestamps, null active pointers (or inferred from state)
    - `epics/overview.json` + per-epic `epic.json` files
    - `slices/overview.json` + per-slice `slice.json` files (with empty `deferred`, null `refinement`)
    - `quests/overview.json` + per-quest `quest.json` files
    - `activity-log.jsonl` with single migration entry
    - `decisions.jsonl` and `learnings.jsonl` (empty — markdown versions preserved separately)
    - Collection directories: `epics/`, `slices/`, `quests/`
    - Per-entity directories with empty content directories (research/, brainstorm/, etc.)
  - Guard: project.json must not exist in state (zero state)
  - Add to transition tables in `src/core/state/transitions/`
- [ ] Update `src/schemas/` — add `MIGRATE_PROJECT` to the `StateEvent` discriminated union
- [ ] Implement `.project/` → `.project-old/` rename in the migrate command:
  - After confirmation is approved, before state construction
  - Use `fs.renameSync` — fast, atomic on same filesystem
  - If `.project-old/` already exists → error: `MIGRATION_BACKUP_EXISTS` (previous migration attempt left debris)
- [ ] Implement markdown artifact copy:
  - After `commitState()` creates the fresh `.project/`:
  - **Project-level:** Copy `idea.md`, `conventions.md`, `learnings.md`, `project-health.md` (if exists), `architecture/` (recursive), `research/` (recursive), `brainstorm/` (recursive), `prototypes/` (recursive), `decisions/` (all `.md` files, skip `.jsonl`)
  - **Per-epic:** For each epic, copy from `.project-old/<sourcePath>/` to `.project/epics/<cleanName>/`: `architecture/`, `research/`, `brainstorm/`, `prototypes/`, any `goal.md` or other markdown
  - **Per-slice:** For each slice, copy from `.project-old/<epicSourcePath>/slices/<sliceSourcePath>/` to `.project/slices/<cleanName>/`: `goal.md`, `plan.md`, `plan-refined.md`, `completion/` (if exists), any other markdown artifacts
  - **Per-quest:** For each quest, copy from `.project-old/side-quests/<sourcePath>/` to `.project/quests/<cleanName>/`: `goal.md`, `plan.md`, `completion/` (if exists), any markdown
  - Use recursive copy for directories, skip JSON/JSONL files (CLI owns those now)
  - Preserve file timestamps where possible
- [ ] Clean up `.migration-in-progress.json` after successful state construction
- [ ] Return `MigrationResult` with `status: 'complete'` and summary (entity counts, path to `.project-old/`)

### Verification

- After migration, run `goodplan status --json` — should return valid project state
- `goodplan epic:list --json` — lists all migrated epics with correct statuses
- `goodplan slice:list --json` — lists all migrated slices
- `goodplan quest:list --json` — lists all migrated quests
- Verify markdown content in `.project/` matches `.project-old/` (diff a sample of files)
- `bun run check` passes
- Existing unit tests still pass (MIGRATE_PROJECT event added without breaking existing transitions)
