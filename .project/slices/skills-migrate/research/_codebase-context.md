# Codebase Context: Skills Migration

## Current State

### Skills at `~/.claude/skills/`

14 goodplan workflow skills exist (each with `skill.md`):
`_shared`, `audit-architecture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`

3 non-goodplan skills also present (to be left untouched):
`skill-creator`, `open-markdown` (standalone), plus 2 symlinks: `vercel-react-best-practices`, `web-design-guidelines`

`_shared/references/` contains 12 reference docs (README.md, codebase-context-discovery.md, decisions-format.md, dependency-research.md, epic-conventions.md, expertise-tracking.md, iteration-loop.md, maturity-conventions.md, project-health-format.md, reviewers-cross-cutting.md, state-and-activity-formats.md, team-defaults.md).

### Repo `skills/` Directory

Does **not** exist yet. This is the primary deliverable of Phase 1.

### Repo `scripts/` Directory

Does **not** exist yet. Must be created for `install-skills.sh`.

### `package.json` Install Script

`install:skills` is registered as a placeholder:
```json
"install:skills": "echo 'TODO: install skills'"
```
Needs updating to point to `scripts/install-skills.sh`.

### CLI Command Surface (`src/commands/main.ts`)

56 imports, registering these subcommands for the audit:

**Global:** `init`, `schema`, `status`

**Entity commands (colon-namespaced):**
- `decision:` — create, list, show, update (4)
- `epic:` — create, list, show, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, complete, abandon, add-verification, update-verification (13)
- `learning:` — list, rollup (2)
- `quest:` — create, list, show, plan, refine-plan, implement, complete, abandon (8)
- `slice:` — create, list, show, plan, refine-plan, implement, complete, abandon (8)

**Subagent commands (flat):**
- `start-*` — plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices (8)
- `submit-*` — plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices (8)

**Total: 54 subcommands**

## Key Decisions

### Skills Versioned in Repo (2026-03-20, active)

File: `.project/decisions/2026-03-20-skills-versioned-in-repo.md`

- All goodplan workflow skills live in `skills/` as source of truth
- Installed to `~/.claude/skills/` via `bun run install:skills` (runs `scripts/install-skills.sh`)
- Skills never edited directly in `~/.claude/skills/`
- Non-goodplan skills left untouched at destination
- Developers must run `bun run install:skills` after pulling skill changes

### Architecture Overview (deployment model)

File: `.project/epics/__active__goodplan-cli/architecture/_overview.md`

Confirms: "Skills are versioned in the repo (`skills/`) and installed to `~/.claude/skills/` via `bun run install:skills`."

### Conventions

File: `.project/conventions.md`

Lists `skills/` in repo structure with all 14 directories including `migrate/`. Also lists `scripts/install-skills.sh`.

## Flags and Conflicts

### `migrate/` skill listed in conventions but does not exist

`conventions.md` lists `skills/migrate/` in the repo structure, but no `migrate/` directory exists at `~/.claude/skills/`. This skill has not been created yet. The plan copies skills from `~/.claude/skills/` — since `migrate/` doesn't exist there, it won't be copied. Either:
1. The `migrate/` skill needs to be created as part of this slice or a future slice, or
2. `conventions.md` should be updated to remove `migrate/` until it exists.

The plan currently lists 14 directories to copy — this count matches the existing goodplan skills at `~/.claude/skills/` and does **not** include `migrate/`. This is consistent, but `conventions.md` will be out of sync with reality after this slice unless addressed.

### `init.ts` has unstaged modifications

`src/commands/global/init.ts` shows as modified in git status. Contents look fine (standard init command) — likely a whitespace or formatting change from a previous slice. Not related to this slice's work but should be committed or stashed before starting.

## Recent Activity

Last 10 commits are all from the `decisions-learnings` and `sub-agent-commands` slices (slices 05 and 06). No recent changes to skills, scripts, or the areas this slice affects.

## Summary for Plan Refinement

- **Phase 1 is straightforward**: copy 14 skill directories, create `scripts/` and `install-skills.sh`, update `package.json` placeholder.
- **Phase 2 has clear inputs**: 54 registered CLI commands to cross-reference against `goodplan ` patterns in skill markdown files.
- **One conflict to resolve**: `conventions.md` lists `migrate/` skill but it doesn't exist anywhere. Plan should either exclude it from the expected directory count or note it as a known gap.
- **No blocking dependencies**: all source skills exist and are stable (last modified Mar 19).
