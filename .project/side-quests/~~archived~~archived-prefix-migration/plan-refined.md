# Plan: Archived Prefix Migration

## Overview

Replace the `__done__` directory prefix convention with `~~archived~~` across the goodplan project. This covers 13 existing directories (7 vertical slices, 6 side quests) and 3 skill files that reference the prefix pattern. The `~~archived~~` prefix sorts after unprefixed items in file explorers (tilde > lowercase letters in ASCII), making active/pending work appear first.

`workflow.md` has already been updated — this plan handles the remaining migration.

## Phase 1: Rename Directories

Rename all `__done__`-prefixed directories under `.project/` to use `~~archived~~`.

### Tasks

- [x] Rename all 7 directories in `.project/vertical-slices/` from `__done__<name>` to `~~archived~~<name>`
- [x] Rename all 6 directories in `.project/side-quests/` from `__done__<name>` to `~~archived~~<name>`
- [x] Verify no `__done__` prefixed directories remain under `.project/` (recursive search)
- [x] Verify all renamed directories are intact (spot-check a few for expected contents)

### Verification

```bash
# Confirm ~~ characters work in glob patterns and shell expansion
ls '.project/vertical-slices/~~archived~~'*/  # Should list contents without errors

# No __done__ directories remain
find .project/ -type d -name '__done__*' | wc -l  # Should be 0

# All ~~archived~~ directories exist
ls .project/vertical-slices/ | grep '~~archived~~' | wc -l  # Should be 7
ls .project/side-quests/ | grep '~~archived~~' | wc -l  # Should be 6

# Spot-check contents preserved
ls .project/vertical-slices/~~archived~~01-start-project/
```

## Phase 2: Update Skill File References

Update all skill files that reference the `__done__` prefix pattern to use `~~archived~~`. When replacing, review surrounding context — update descriptive text (e.g., "done" → "archived") where it refers to the convention, not just the literal prefix string.

### Tasks

- [x] Update `~/.claude/skills/complete-slice/SKILL.md` — 5 occurrences: auto-detect skip logic, directory rename commands, and convention description
- [x] Update `~/.claude/skills/complete-slice/references/guidance.md` — 4 occurrences: glob matching, scope derivation, prefix stripping (including flow-log scope correlation logic at lines ~95 and ~111 that strips prefixes before matching), convention description
- [x] Update `~/.claude/skills/project-status/references/status-logic.md` — 5 occurrences: skip logic, counting logic, display guidance
- [x] Grep the full `~/.claude/skills/` directory for any remaining `__done__` references missed by initial scan
- [x] Grep the goodplan repo for any remaining `__done__` references (excluding the design spec file and this quest's own directory, which intentionally reference the old convention). Note: `flow-log.jsonl` contains historical scope entries recorded at time of event — these are intentionally preserved and excluded from this check via `--include='*.md'`

- [x] Commit all changes (directory renames + skill file updates) with a descriptive message

### Verification

```bash
# No remaining __done__ in skill files
grep -r '__done__' ~/.claude/skills/ | wc -l  # Should be 0

# No remaining __done__ in repo markdown files (excluding design spec and this quest's directory which both intentionally reference the old convention)
grep -r '__done__' . --include='*.md' | grep -v 'docs/superpowers/specs/2026-03-18' | grep -v '.project/side-quests/archived-prefix-migration/' | wc -l  # Should be 0
```
