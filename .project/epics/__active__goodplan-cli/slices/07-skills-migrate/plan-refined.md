# Plan: Skills Migration

## Overview

Copy goodplan workflow skills from `~/.claude/skills/` into the repo's `skills/` directory and build `scripts/install-skills.sh`. This makes skills version-controlled alongside the CLI — skill prompts contain concrete `goodplan` CLI commands, so they must stay in sync with the CLI's command surface.

Approach: Phase 1 copies the 15 goodplan skill directories (including `_shared/` and a stub `migrate/`) and creates the selective install script. Phase 2 greps skill files for `goodplan ` command references and produces an audit report cross-referenced against the implemented CLI surface.

Key decisions:
- Only goodplan skills are copied (not skill-creator, open-markdown, vercel-react-best-practices, web-design-guidelines)
- Install script is selective — copies only goodplan skills, preserving non-goodplan skills at `~/.claude/skills/`
- Skill content is NOT modified in this slice (consolidation is a future epic)
- `migrate/` does not exist at `~/.claude/skills/` yet — a stub directory with a placeholder `SKILL.md` is created directly in the repo

## Phase 1: Copy Skills & Install Script

Copy goodplan workflow skills into `skills/` and create the install script.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `test -d skills/` — directory does not exist (exit 1)
- [x] `cat scripts/install-skills.sh` — file does not exist

**After implementation** (should pass / show presence):
- [x] `ls skills/` — contains 15 directories: `_shared`, `audit-architecture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `migrate`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`
- [x] `scripts/install-skills.sh` exists and is executable (`test -x scripts/install-skills.sh`)
- [x] `bun run install:skills` copies skills to `~/.claude/skills/` — verify with `diff skills/start-epic/SKILL.md ~/.claude/skills/start-epic/SKILL.md` returning no differences, and `diff -r skills/_shared/references/ ~/.claude/skills/_shared/references/` returning no differences (confirms recursive copy and clean-install semantics)
- [x] No `.DS_Store` files tracked in `skills/` (`git ls-files 'skills/**/.DS_Store'` returns empty)

### Tasks

- [x] Create `skills/` directory structure by copying from `~/.claude/skills/`. Use `rsync -a --exclude='.DS_Store'` to copy these 14 directories preserving internal structure: `_shared`, `audit-architecture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`. Skip non-goodplan skills (`skill-creator`, `open-markdown`, `vercel-react-best-practices`, `web-design-guidelines`). Also skip symlinks.
- [x] Create stub `skills/migrate/` directory with a placeholder `SKILL.md` containing a brief note that this skill is not yet implemented and will be built in a future slice.
- [x] Add `skills/**/.DS_Store` to `.gitignore` as a safety net against future manual copies.
- [x] Create `scripts/install-skills.sh` with clean-install semantics: (a) shebang `#!/usr/bin/env bash` and `set -e` for error handling, (b) determine repo root via `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` to produce an absolute path when invoked from any working directory, (c) `mkdir -p ~/.claude/skills/` for first-time install, (d) hardcode the list of 15 goodplan skill directory names — for each: `rm -rf` the target dir (note: this overwrites any manually-symlinked destination) then `rsync -a --exclude='.DS_Store'` from repo to `~/.claude/skills/`, printing each skill name as it's copied, (e) report summary on completion ("Installed N skills to ~/.claude/skills/"). The script copies only goodplan skill directories, preserving non-goodplan skills at the destination.
- [x] Verify `package.json` `install:skills` script is `"bash scripts/install-skills.sh"` (not `"./scripts/install-skills.sh"` — avoids dependence on execute bit in some clone environments). Update if the tracer bullet placeholder doesn't match.
- [x] Update `conventions.md` to include `start-epic` in the `skills/` directory listing.
- [x] Run `bun run install:skills` and verify it works — run `diff skills/start-epic/SKILL.md ~/.claude/skills/start-epic/SKILL.md` to confirm content matches.

## Phase 2: Command Reference Audit

Grep skill files for `goodplan ` command references and produce an ephemeral audit report (a one-time snapshot for this slice, archived with the epic — not a living document).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `cat .project/epics/__active__goodplan-cli/slices/07-skills-migrate/command-audit.md` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `cat .project/epics/__active__goodplan-cli/slices/07-skills-migrate/command-audit.md` — contains a table mapping each `goodplan <command>` reference to whether it's implemented
- [ ] `bun run build` — binary compiles successfully (skills/ doesn't interfere)

### Tasks

- [ ] Grep all `.md` files under `skills/` for `goodplan ` patterns. Use a pattern that handles backtick-wrapped references: `` grep -roEh '`?goodplan [a-z:_-]+`?' skills/ | tr -d '`' `` to extract and strip backticks from results. Extract unique command names.
- [ ] Cross-reference against the registered commands in `src/commands/main.ts` (the `subCommands` object keys, plus `init` and `status` from global commands).
- [ ] Write `command-audit.md` in the slice directory with: (a) table of all referenced commands, which skill files reference them, and whether each is implemented, (b) summary counts: N commands referenced, M implemented, K missing, (c) list of missing commands (flagged for future work — either skill consolidation epic or individual fixes).
- [ ] Run `bun run build` to verify the `skills/` directory doesn't interfere with binary compilation.
- [ ] Note: no developer setup docs (contributing guide, etc.) exist yet. Documenting `bun run install:skills` as a post-clone step is deferred until such docs are created.
