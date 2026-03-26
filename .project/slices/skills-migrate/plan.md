# Plan: Skills Migration

## Overview

Copy goodplan workflow skills from `~/.claude/skills/` into the repo's `skills/` directory and build `scripts/install-skills.sh`. This makes skills version-controlled alongside the CLI — skill prompts contain concrete `goodplan` CLI commands, so they must stay in sync with the CLI's command surface.

Approach: Phase 1 copies the 14 goodplan skill directories (including `_shared/`) and creates the selective install script. Phase 2 greps skill files for `goodplan ` command references and produces an audit report cross-referenced against the implemented CLI surface.

Key decisions:
- Only goodplan skills are copied (not skill-creator, open-markdown, vercel-react-best-practices, web-design-guidelines)
- Install script is selective — copies only goodplan skills, preserving non-goodplan skills at `~/.claude/skills/`
- Skill content is NOT modified in this slice (consolidation is a future epic)

## Phase 1: Copy Skills & Install Script

Copy goodplan workflow skills into `skills/` and create the install script.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/` — directory does not exist (exit 1)
- [ ] `cat scripts/install-skills.sh` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/` — contains 14 directories: `_shared`, `audit-architecture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`
- [ ] `scripts/install-skills.sh` exists and is executable (`test -x scripts/install-skills.sh`)
- [ ] `bun run install:skills` copies skills to `~/.claude/skills/` — verify by comparing file contents between `skills/` and `~/.claude/skills/` for a sample skill

### Tasks

- [ ] Create `skills/` directory structure by copying from `~/.claude/skills/`. Copy these 14 directories preserving internal structure: `_shared`, `audit-architecture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`. Skip non-goodplan skills (`skill-creator`, `open-markdown`, `vercel-react-best-practices`, `web-design-guidelines`). Also skip `.DS_Store` files and any symlinks.
- [ ] Create `scripts/install-skills.sh`: selective copy script that copies each goodplan skill directory from `skills/` to `~/.claude/skills/` using `cp -R`. The script should: (a) determine its own repo root via `dirname` of the script path, (b) list only the goodplan skill directories (hardcoded list or by reading `skills/` contents — either works since only goodplan skills are in the repo), (c) copy each with `cp -R`, overwriting existing, (d) preserve non-goodplan skills at the destination. Make executable with `chmod +x`.
- [ ] Verify `package.json` `install:skills` script points to `scripts/install-skills.sh`. Update if the tracer bullet placeholder doesn't match.
- [ ] Run `bun run install:skills` and verify it works — compare a sample skill file between repo and `~/.claude/skills/` to confirm content matches.

### Verification
`ls skills/ | wc -l` returns 14. `scripts/install-skills.sh` is executable. `bun run install:skills` completes without error. Sample skill file at destination matches source.

## Phase 2: Command Reference Audit

Grep skill files for `goodplan ` command references and produce an audit report.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `cat .project/epics/__active__goodplan-cli/slices/07-skills-migrate/command-audit.md` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `cat .project/epics/__active__goodplan-cli/slices/07-skills-migrate/command-audit.md` — contains a table mapping each `goodplan <command>` reference to whether it's implemented
- [ ] `bun run build` — binary compiles successfully (skills/ doesn't interfere)

### Tasks

- [ ] Grep all `.md` files under `skills/` for `goodplan ` patterns (e.g., `grep -roh 'goodplan [a-z:_-]*' skills/`). Extract unique command names.
- [ ] Cross-reference against the registered commands in `src/commands/main.ts` (the `subCommands` object keys, plus `init` and `status` from global commands).
- [ ] Write `command-audit.md` in the slice directory with: (a) table of all referenced commands, which skill files reference them, and whether each is implemented, (b) summary counts: N commands referenced, M implemented, K missing, (c) list of missing commands (flagged for future work — either skill consolidation epic or individual fixes).
- [ ] Run `bun run build` to verify the `skills/` directory doesn't interfere with binary compilation.

### Verification
Audit report is complete and accurate. Binary builds successfully. All referenced commands are either implemented or explicitly flagged as missing.
