# Phase 4: State Construction & Artifact Copy

When the confirmation round is approved, construct all CLI state directly from validated migration answers (no state machine event). Rename `.project/` → `.project-old/`, build `ProjectState` in `rpcMigrate()`, call `commitState()`, then copy markdown artifacts from old paths using `sourcePath` mappings.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `rpcMigrate()` does not yet call `commitState()` — `grep -r "commitState" src/core/rpc/migrate.ts` → no matches
- [ ] No `.project-old/` rename logic exists — `grep -r "project-old" src/core/rpc/migrate.ts` → no matches
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
  - `activity-log.jsonl` with a migration entry recording that migration occurred
- [ ] Markdown artifacts from `.project-old/` are present in `.project/`:
  - `idea.md`, `conventions.md`, `learnings.md` (project-level)
  - `architecture/` directory with all contents
  - Per-epic: `architecture/`, `research/`, `brainstorm/` (if they existed)
  - `research/`, `brainstorm/`, `prototypes/` (project-level, if they existed)
  - `decisions/` directory with all markdown decision files
- [ ] `<cwd>/.migration-in-progress.json` is removed after successful migration
- [ ] `goodplan status --json` returns valid project state (no `DATA_NO_PROJECT` error)
- [ ] No changes to `StateEvent` union, `reduce.ts`, or transition tables — migration bypasses the state machine entirely

### Tasks

- [x] Extract `buildMigrationState(validatedData): ProjectState` as a named export from `src/core/rpc/migrate.ts` with `@internal` JSDoc annotation. It remains internal to the `rpc/` module but tests can import it directly (Phase 6 includes unit tests for `buildMigrationState()`). This matches existing patterns (e.g., `rpcInit` exports from `src/core/rpc/init.ts`).
- [x] Implement direct `ProjectState` construction in `buildMigrationState()`:
  - Build `ProjectState` directly from validated migration answers — no `MIGRATE_PROJECT` event, no `reduce()` call. Migration is a data import, not a state transition.
  - Construct the full state tree:
    - `project.json` with version, name, timestamps, null active pointers (or inferred from state)
    - `epics/overview.json` + per-epic `epic.json` files
    - `slices/overview.json` + per-slice `slice.json` files (with empty `deferred`, null `refinement`)
    - `quests/overview.json` + per-quest `quest.json` files
    - `activity-log.jsonl` with a migration entry following the existing `activityEntrySchema` shape (defined in `src/schemas/records/activity-log.ts`): `{ ts: <timestamp>, phase: "migration", scope: "project", status: "complete", summary: "Migrated from pre-CLI .project/ format", detail: "<entity counts>" }`
    - `decisions.jsonl` and `learnings.jsonl` (empty — markdown versions preserved separately)
    - Collection directories: `epics/`, `slices/`, `quests/`
    - Per-entity directories with empty content directories (research/, brainstorm/, etc.)
  - Entities at intermediate/terminal statuses need all required fields populated. Source timestamps from migration answers or use migration timestamp as fallback. Non-obvious required fields per status:
    - Epic `activated`: non-null `activated` timestamp AND `sliceSequence` array
    - Epic `completed`/`abandoned`: `activated` timestamp + completion/abandonment timestamp
    - Slice `plan-created`: non-null `planCreatedAt`
    - Slice `completed`: `planCreatedAt` + `completedAt`
    - Quest: similar pattern to slices for intermediate statuses
  - All `Record<string, T>` lookups return `T | undefined` under `noUncheckedIndexedAccess` — add explicit narrowing checks.
  - Call `commitState(projectDir, ZERO_STATE, newState)` — pass `ZERO_STATE` (from `src/core/tree.ts`) as `oldState`. This mirrors the `init` flow where `.project/` doesn't exist yet: the diff treats everything as new writes and skips concurrent modification checks. Do NOT call `loadState()` on the renamed directory or pass an incorrect old state.
  - Guard: `project.json` must not exist (zero state).
- [x] Implement `.project/` → `.project-old/` rename in `rpcMigrate()`:
  - After confirmation is approved, before state construction
  - Use `fs.renameSync` — fast, atomic on same filesystem
  - Wrap in try/catch: on `EXDEV` error (cross-filesystem rename, e.g., symlinked `.project/`), either fall back to recursive copy + remove, or throw a clear error explaining the symlink/mount issue
  - If `.project-old/` already exists → error: `DATA_MIGRATION_BACKUP_EXISTS` (previous migration attempt left debris)
- [x] Implement markdown artifact copy as a post-`commitState()` step (separate from state construction):
  - This logic belongs in the RPC layer or a dedicated migration module, not the state machine
  - **Project-level:** Copy `idea.md`, `conventions.md`, `learnings.md`, `project-health.md` (if exists), `architecture/` (recursive), `research/` (recursive), `brainstorm/` (recursive), `prototypes/` (recursive), `decisions/` (all `.md` files, skip `.jsonl`)
  - **Per-epic:** For each epic, copy from `.project-old/<sourcePath>/` to `.project/epics/<cleanName>/`: `architecture/`, `research/`, `brainstorm/`, `prototypes/`, any `goal.md` or other markdown
  - **Per-slice:** For each slice, copy from `.project-old/<epicSourcePath>/slices/<sliceSourcePath>/` to `.project/slices/<cleanName>/`: `goal.md`, `plan.md`, `plan-refined.md`, `completion/` (if exists), any other markdown artifacts
  - **Per-quest:** For each quest, copy from `.project-old/side-quests/<sourcePath>/` to `.project/quests/<cleanName>/`: `goal.md`, `plan.md`, `completion/` (if exists), any markdown
  - Use an allowlist of known markdown artifact patterns rather than "copy everything except JSON/JSONL": `*.md` files plus specific directories (`architecture/`, `research/`, `brainstorm/`, `prototypes/`, `decisions/`, `completion/`). This prevents accidentally copying unknown non-markdown files that could cause issues.
  - Do NOT attempt to preserve file timestamps — `fs.copyFileSync()` does not preserve mtime/atime, and git tracks content not filesystem timestamps. Drop this requirement.
- [x] **Failure handling:** If `commitState()` fails after `.project/` has been renamed to `.project-old/`, preserve `.migration-in-progress.json` so user can retry. The error message must instruct the user to rename `.project-old/` back to `.project/` manually. Do NOT attempt automatic rollback.
- [x] Clean up `<cwd>/.migration-in-progress.json` after successful state construction only
- [x] Return `MigrationResult` with `status: 'complete'` and summary (entity counts, path to `.project-old/`)
- [x] **Add known exception to INV-001 in `.project/architecture/invariants.md`:** Direct state construction in migration bypasses the state machine (`reduce()`). Document this as a formal exception alongside the existing version stamp exception. Justification: migration is a data import, not a state transition.
- [x] Update architecture docs: add `migrate` command to `.project/architecture/commands-api.md`. Update `.project/architecture/data-layer-api.md` if migration touches data layer conventions.

### Verification

- After migration, run `goodplan status --json` — should return valid project state
- `goodplan epic:list --json` — lists all migrated epics with correct statuses
- `goodplan slice:list --json` — lists all migrated slices
- `goodplan quest:list --json` — lists all migrated quests
- Verify markdown content in `.project/` matches `.project-old/` (diff a sample of files)
- `bun run check` passes
- Existing unit tests still pass — no state machine changes, so no exhaustiveness or transition table impacts
- Verify fitness functions pass without modification (no `StateEvent` union changes)
