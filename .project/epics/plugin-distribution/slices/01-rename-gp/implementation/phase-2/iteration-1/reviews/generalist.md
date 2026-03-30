# Generalist Review: Phase 2 (Skills and Documentation)

**Score: 8/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Phase 2 is well-executed overall. ~76 files updated with consistent rename of CLI invocations (`goodplan` to `gp`) and path references (`.project/` to `.goodplan/`). The "Three Separate Things" section of CLAUDE.md is correctly preserved. The install script properly handles old binary cleanup. The `.gitignore` correctly adds `.goodplan/` entries alongside existing `.project/` entries. Tests pass, lint is clean (pre-existing only).

## Important (1)

### IMP-1: Migrate skill over-replaced legacy `.project/` references

**Files:** `skills/migrate/SKILL.md`, `skills/migrate/references/migration-heuristics.md`

The migrate skill's primary use case is converting **legacy `.project/` directories** to CLI-managed state. The blanket replacement of `.project/` to `.goodplan/` in these files is semantically wrong for first-migration scenarios:

- `migration-heuristics.md` line 3: "pre-CLI `.goodplan/` filesystem artifacts" -- pre-CLI projects use `.project/`, not `.goodplan/`
- `migration-heuristics.md` lines 28, 32: `Scan .goodplan/epics/` and `Scan .goodplan/side-quests/` -- these describe legacy directory scanning and should reference `.project/`
- `SKILL.md` line 4-5: "import existing .goodplan/" -- the import target for first migration is `.project/`
- `SKILL.md` lines 42-62: Pre-flight checks reference `.goodplan/` exclusively, but for a first-time migration the user has `.project/`, not `.goodplan/`
- `SKILL.md` lines 90-157: Filesystem discovery commands (`ls -d .goodplan/epics/*/`, etc.) should use `.project/` for first migration

The CLI's `migrate.ts` command layer does dual-path resolution (`.goodplan/` first, then `.project/` fallback). The skill should mirror this: describe `.project/` as the legacy input and `.goodplan/` as the re-migration input. The current state would cause the migrate skill to issue `ls -d .goodplan/epics/*/` when helping a user migrate a legacy `.project/` directory, finding nothing.

**Fix:** Restore `.project/` references in migration-heuristics.md. In SKILL.md, update filesystem commands and pre-flight checks to scan both paths (`.goodplan/` for re-migration, `.project/` for legacy migration), matching the dual-path resolution in the command layer.

## Minor (2)

### MIN-1: `.gitignore` has specific `.goodplan/epics/goodplan-cli/prototypes/` entries

Lines 7-8 add `.goodplan/epics/goodplan-cli/prototypes/jqjs-spike/jqjs-spike` and `node_modules/` entries. These mirror the `.project/` equivalents but are extremely specific to a historical prototype. When the state directory actually moves to `.goodplan/`, these paths may not exist. Not wrong, just unnecessary clutter. Low priority.

### MIN-2: Plan file was modified

The `plan-refined.md` file was updated to mark Phase 2 tasks as `[x]` and add the lint note. This is fine for tracking but was not called out in the plan's task list as an expected change. Cosmetic only.
