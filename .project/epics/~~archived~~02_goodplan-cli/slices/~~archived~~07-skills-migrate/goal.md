# Skills Migration

## What We're Building
Copy the existing workflow skills from `~/.claude/skills/` into the repo's `skills/` directory and build the `scripts/install-skills.sh` installer. This makes skills version-controlled alongside the CLI — skill prompts contain concrete `goodplan` CLI commands, so they must stay in sync with the CLI's command surface.

## Behavior
1. `skills/` directory contains all goodplan workflow skills, organized by name (matching current `~/.claude/skills/` structure).
2. `scripts/install-skills.sh` copies skills from repo to `~/.claude/skills/`, preserving directory structure.
3. `bun run install:skills` runs the install script (package.json script already has a placeholder from tracer bullet).
4. Skills reference concrete CLI commands (e.g., `goodplan epic:create`, `goodplan slice:plan`) — verify these match the implemented command surface.

## Success Criteria
- [ ] `ls skills/` — contains all goodplan workflow skill directories (create-epic, explore, create-architecture, etc.)
- [ ] `scripts/install-skills.sh` exists and is executable
- [ ] `bun run install:skills` copies skills to `~/.claude/skills/` — verify by checking timestamps
- [ ] Command reference audit: grep for `goodplan ` in skill files, produce a list of referenced commands and whether each exists in the CLI. This is an audit — skill content is not modified in this slice (skills are markdown prompts, not executable scripts, so end-to-end exercise isn't possible here)
- [ ] Binary: `bun run build` still succeeds (skills don't affect compilation)

## Verification
1. Run `bun run install:skills` — verify skills appear in `~/.claude/skills/`.
2. Grep all skill files for `goodplan ` command references — produce an audit report mapping each reference to an implemented command (or flagging missing commands for future work).
3. Compile binary — verify skills directory doesn't interfere with build.

## Scope Boundaries
**In scope:** Copy skills to repo, install script, package.json script wiring, command reference audit.
**Out of scope:** Modifying skill content to use the new CLI commands (that happens when skills are updated to call the CLI — skills are markdown prompts, not executable scripts). Distribution mechanisms beyond local install (deferred to future epic).
