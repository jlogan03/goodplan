# Goal: Archived Prefix Migration

## What

Replace the `__done__` directory prefix with `~~archived~~` across the entire codebase — skill files, workflow.md references, existing `.project/` directories, and any other code that reads or writes these prefixes.

## Why

The `~~archived~~` prefix:
- Better captures the range of reasons an item is no longer active (completed, abandoned, superseded) — not just "done"
- Sorts after unprefixed items in file explorers (tilde `~` = ASCII 126, after `z` = 122), so active/pending work appears first
- Part of the broader initiative/maturity workflow redesign (see `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md`)

## Success Criteria

1. All existing `__done__` directories under `.project/` are renamed to `~~archived~~`
2. All skill files that reference `__done__` are updated to `~~archived~~`
3. All shared reference files that mention `__done__` are updated
4. `workflow.md` — already updated (done during design session)
5. No remaining references to `__done__` in the codebase (verified by grep)
6. Existing skills still function correctly after the rename (no broken path references)

## Scope

- `.project/vertical-slices/` — rename `__done__` prefixed directories
- `.project/side-quests/` — rename `__done__` prefixed directories
- Skill files under `~/.claude/skills/` — update string references
- Shared reference files under `~/.claude/skills/_shared/references/` — update string references
- Any other files in this repo that reference `__done__`

## Out of Scope

- The `__active__` prefix for initiatives (separate quest)
- Initiative directory structure (separate quest)
- Maturity tracking (separate quest)
