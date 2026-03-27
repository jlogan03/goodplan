# goodplan

## Project Context

Read these before doing any significant work in this repo:

- `.project/idea.md` — project goal, scope, constraints
- `.project/conventions.md` — tech stack, repo structure, coding style
- `.project/learnings.md` — accumulated learnings across completed slices
- `.project/architecture/_overview.md` — system architecture (4-layer stack, subsystem maturity)
- `.project/architecture/conventions.md` — architectural patterns
- `.project/architecture/data-model.md` — entities, JSON/JSONL, unified state object
- `.project/architecture/flows.md` — key workflows and state transition patterns
- `.project/architecture/state-machine-api.md` — pure reducer API
- `.project/architecture/data-layer-api.md` — filesystem I/O API
- `.project/architecture/rpc-layer-api.md` — workflow orchestration API
- `.project/architecture/commands-api.md` — CLI command surface
- `.project/architecture/invariants.md` — system-wide constraints (INV-001 through INV-007)
- `.project/architecture/transition-tables.md` — complete state transition spec (source of truth)

Also check if relevant to your task:
- `.project/epics/entity-restructuring/slices/sequencing.md` — slice ordering and dependencies for active epic
- `.project/epics/entity-restructuring/architecture/` — epic target architecture (nested slice paths, consolidated overview, affected APIs)
- `.project/research/` — tech stack and library research
- `.project/brainstorm/` — architecture brainstorming output
- `.project/decisions/` — active architectural decisions
- `docs/superpowers/specs/2026-03-20-goodplan-cli-and-skill-consolidation-design.md` — original design spec

## Skills

The `skills/` directory in this repo is the **source of truth** for all goodplan skills. These are installed to `~/.claude/skills/` via `bun run install:skills`. When modifying skills, ALWAYS edit files under `skills/` in this repo — NEVER edit the installed copies at `~/.claude/skills/`.

## Installed vs Repo: Two Separate Worlds

The **installed** CLI (`goodplan` on PATH) and skills (`~/.claude/skills/`) are a different version than what's in this repo. The `.project/` directory is managed by the installed CLI and must stay compatible with it.

**Rules:**
- **Always use the installed CLI** (`goodplan` on PATH) to interact with `.project/` state — never the locally-built `./goodplan` binary
- **Never manually edit** `.project/` state files (slice.json, overview.json, project.json, activity-log.jsonl) — always go through the installed CLI
- The locally-built `./goodplan` binary is for **testing on fixture repos only** (unit tests, integration tests, copies of this repo) — never run it against this repo's `.project/`
- Upgrading the installed CLI/skills and migrating this repo's `.project/` is a separate user-initiated process, not part of development work
