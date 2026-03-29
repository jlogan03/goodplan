# goodplan

## Project Context

Read these before doing any significant work in this repo:

- `.project/idea.md` — project goal, scope, constraints
- `.project/conventions.md` — tech stack, repo structure, coding style
- `.project/learnings/` — per-learning `.md` files (CLI-managed; query via `goodplan learning:list --json`)
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
- `.project/epics/entity-restructuring/architecture/` — epic target architecture (nested slice paths, consolidated overview, affected APIs)
- `.project/research/` — tech stack and library research
- `.project/brainstorm/` — architecture brainstorming output
- `.project/decisions/` — active architectural decisions
- `docs/superpowers/specs/2026-03-20-goodplan-cli-and-skill-consolidation-design.md` — original design spec

## Workflow Evolution Program

We are implementing a set of improvements to the goodplan workflow itself. These span multiple epics and quests. Always read these before starting work on any workflow improvement:

- `Target Workflow Vision.md` — north star document describing the target state for all workflow systems. Check implementations against this to prevent drift.
- `Workflow Improvements - Work Items.md` — prioritized work items (2 epics, 16 quests) with dependency graph, status tracking, and execution order. Update status and capture learnings after completing each item.
- `Development Workflow.md` — exploration scratchpad from the design session (reference, not authoritative — the Target Workflow Vision supersedes this where they differ)

**After completing any workflow improvement epic or quest:**
1. Update the Work Items doc — mark done, note scope changes or surprises
2. Check the dependency graph — what's unblocked?
3. Re-read the relevant section of Target Workflow Vision — does what we built align?
4. Adjust remaining items — update scope, reorder, add/drop items based on what we learned
5. Pick the next highest-priority unblocked item

## Skills

The `skills/` directory in this repo is the **source of truth** for all goodplan skills. These are installed to `~/.claude/skills/` via `bun run install:skills`. When modifying skills, ALWAYS edit files under `skills/` in this repo — NEVER edit the installed copies at `~/.claude/skills/`.

## Installed vs Repo: Two Separate Worlds

The **installed** CLI (`goodplan` on PATH) and skills (`~/.claude/skills/`) are a different version than what's in this repo. The `.project/` directory is managed by the installed CLI and must stay compatible with it.

**Rules:**
- **Always use the installed CLI** (`goodplan` on PATH) to interact with `.project/` state — never the locally-built `./goodplan` binary
- **Never manually edit** `.project/` state files (slice.json, overview.json, project.json, activity-log.jsonl) — always go through the installed CLI
- The locally-built `./goodplan` binary is for **testing on fixture repos only** (unit tests, integration tests, copies of this repo) — never run it against this repo's `.project/`
- Upgrading the installed CLI/skills and migrating this repo's `.project/` is a separate user-initiated process, not part of development work
