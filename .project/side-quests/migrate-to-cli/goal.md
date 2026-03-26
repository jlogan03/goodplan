# Side Quest: Migrate Pre-CLI .project/ to CLI Format

## What We're Building

A `goodplan migrate` CLI command (and optionally a `/migrate` skill) that takes an existing `.project/` directory — created by the old skill-managed workflow — and upgrades it to the CLI-managed format. After migration, all CLI commands (`goodplan status`, `epic:show`, `slice:list`, etc.) work on the repo, and the new CLI-integrated skills can be installed and used.

## Why

The goodplan repo itself (and any other repo that used the old skills) has a `.project/` with epics, slices, architecture, learnings, and decisions — but no `project.json`, no `overview.json` files, and entities aren't registered in the CLI's state format. Running any CLI command returns `DATA_NO_PROJECT`. We need a migration path so these repos can adopt the new CLI+skills without losing existing work.

## Behavior

1. Detect the existing `.project/` structure — what entities exist (epics, slices, quests), what state they're in, what artifacts are present
2. Create `project.json` with the project name (inferred from directory name or `idea.md`)
3. Create `epics/overview.json` from existing epic directories (handle `__active__` and `~~archived~~` prefixed dirs)
4. Create `slices/overview.json` from existing slice directories
5. Create `quests/overview.json` from existing quest/side-quest directories
6. For each entity, create the appropriate `.json` state file (`epic.json`, `slice.json`, `quest.json`) with status inferred from existing artifacts:
   - Has `completion/learnings.md` → `completed`
   - Has `abandoned.md` → `abandoned`
   - Has `implementation/` → `implementing` or `implementation-complete`
   - Has `plan-refined.md` → `plan-refined`
   - Has `plan.md` → `plan-created`
   - Has `goal.md` only → `created`
   - etc. (use the artifact-to-status mapping from the state machine)
7. Strip `__active__` prefix from epic directories (rename to bare name)
8. Preserve all existing markdown artifacts (architecture, research, brainstorm, plans, goals, learnings, decisions)
9. After migration, `goodplan status --json` should return valid output reflecting the actual project state

## Success Criteria

- [ ] `goodplan migrate --json` on a repo with old `.project/` creates all required JSON state files
- [ ] `goodplan status --json` works after migration and shows correct project state
- [ ] `goodplan epic:list --json` shows all epics with correct statuses
- [ ] `goodplan slice:list --json` shows all slices with correct statuses
- [ ] All existing markdown artifacts are preserved (no data loss)
- [ ] `__active__` prefixed directories are renamed to bare names
- [ ] `~~archived~~` prefixed directories are handled (either renamed or status set to completed)
- [ ] Running on the goodplan repo itself produces a working CLI-managed `.project/`
- [ ] After migration, new CLI-integrated skills can be installed at `~/.claude/skills/` and used

## Scope Boundaries

**In scope:** CLI `migrate` command, artifact-to-status inference, overview.json creation, directory rename normalization, `project.json` creation

**Out of scope:** Onboarding repos with no `.project/` (separate quest), migrating `state.md` content (eliminated), migrating `activity-log.jsonl` entries (preserved as-is, CLI will append new entries)
