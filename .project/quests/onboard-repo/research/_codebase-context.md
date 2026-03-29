# Codebase Context — onboard-repo Plan

## Fresh Documentation

- `.project/architecture/_overview.md` — Four-layer architecture, subsystem maturity table, key deps. Updated 2026-03-28.
- `.project/architecture/conventions.md` — Reducer pattern, command routing, schema-driven validation. Updated 2026-03-27.
- `.project/conventions.md` — Tech stack, repo structure, coding style. Updated 2026-03-27.
- `.project/idea.md` — Full workflow skill suite description. Updated 2026-03-19.
- `skills/_shared/references/expertise-tracking.md` — Two-layer expertise system (CLAUDE.md summary + auto memory files per domain).
- `skills/_shared/references/cli-interaction.md` — CLI interaction conventions for skills.

## Recent Development Activity

**Last 2 months in skills/ (38 commits):** Output template consolidation, new audit skills, maturity context threading, learnings directory updates, /capture skill, /migrate re-migration support.

**Architecture docs**: Actively maintained via drift-fix quests. Fresh and reliable.

## Key Findings

### Skill Structure Patterns

All 17 skills follow consistent SKILL.md format:
- YAML frontmatter: `name`, `description`, `requires: goodplan >= 1.0.0`
- Step 0/1: Version check via `goodplan --version --json`, load references
- CLI-first: All state mutations through CLI commands. Skills never write state files directly.
- References: Per-skill `references/` + shared `_shared/references/`. Loaded via relative paths.
- Error handling: Exit 1=internal, 2=validation, 3=state machine. Structured JSON errors.
- Most interactive skills have an expertise check step at the end.
- Done summary uses shared template from output-templates.md.

### CLI Interfaces

- `goodplan init`: Takes optional `--name` flag. Creates `.project/`. Errors exit 3 if `.project/` exists.
- `goodplan quest:create`: Stdin JSON `{name, goal}`. Creates quest in `created` status.
- `goodplan epic:create`: Stdin JSON `{name, goal}`. Creates epic.
- `goodplan status --json`: Detect project state.
- 60+ commands across namespaces.

### Expertise Tracking

Two-layer system:
1. `~/.claude/CLAUDE.md` `## Expertise` section: Brief summary
2. Auto memory files: `~/.claude/projects/<project>/memory/expertise_<domain>.md` with dated observations

The `/create-epic` skill has Step 3b for initial expertise calibration. All interactive skills have end-of-run expertise check. The onboard-repo skill should seed this from git commits + PR comments.

### .project/ Structure to Produce

- `.project/idea.md` — project goal, scope, constraints
- `.project/conventions.md` — tech stack, repo structure, coding style
- `.project/architecture/_overview.md` — system architecture with subsystem maturity
- `.project/architecture/*.md` — domain-specific files
- `CLAUDE.md` `## Project Context` section referencing key files

### Important: `goodplan init` Guard

The command guards against re-initialization (exit 3 if `.project/` exists). Skill must check for existing `.project/` first and handle gracefully.

## Areas of Active Churn vs Stability

**Active churn:** `skills/_shared/references/` (templates, audit conventions), new audit skills, maturity threading.

**Stable:** Core skill structure, CLI command surface, `.project/idea.md`, expertise tracking protocol, data ownership split (CLI owns JSON/state, LLM owns markdown).
