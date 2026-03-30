# Decision: Skills Versioned in Repo, Installed via Script

**Status**: active
**Date**: 2026-03-20
**Domain**: infrastructure
**Context**: create-architecture for epics/goodplan-cli — conventions phase discussion

## Decision

All goodplan workflow skills live in a `skills/` directory at the repo root as the source of truth. They are installed to `~/.claude/skills/` via `bun run install:skills` (which runs `scripts/install-skills.sh`). Skills are never edited directly in `~/.claude/skills/`. Existing skills are copied into the repo at their current names and transformed in place as consolidation progresses.

## Rationale

Without version control on skills, there's no way to review a skill diff before it goes live, no way to roll back a broken skill, and no audit trail of changes. Copying skills into the repo and installing via script fixes all three. Git tracks the full evolution from old skill structure to new consolidated skills.

Alternatives considered:
- **Edit skills in place at ~/.claude/skills/** — current approach. No version control, no review process, no rollback.
- **Symlinks from ~/.claude/skills/ to repo** — considered but rejected because it makes every repo checkout immediately affect the running Claude environment with no control over when changes go live.

## Consequences

- `skills/` contains only goodplan workflow skills — personal/third-party skills stay in ~/.claude/skills/ untouched
- The install script maps old and new skill names to correct install locations during the transition period
- Sets up well for the future distribution epic where `goodplan install` does the same thing for end users
- Developers must run `bun run install:skills` after pulling skill changes — changes don't take effect automatically
