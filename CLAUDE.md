# goodplan

## Project Context

Read these before doing any significant work in this repo:

- `.goodplan/idea.md` — project goal, scope, constraints
- `.goodplan/conventions.md` — tech stack, repo structure, coding style
- `.goodplan/learnings/` — per-learning `.md` files (CLI-managed; query via `gp learning:list --json`)
- `.goodplan/architecture/_overview.md` — system architecture (4-layer stack, subsystem maturity)
- `.goodplan/architecture/conventions.md` — architectural patterns
- `.goodplan/architecture/data-model.md` — entities, JSON/JSONL, unified state object
- `.goodplan/architecture/flows.md` — key workflows and state transition patterns
- `.goodplan/architecture/state-machine-api.md` — pure reducer API
- `.goodplan/architecture/data-layer-api.md` — filesystem I/O API
- `.goodplan/architecture/rpc-layer-api.md` — workflow orchestration API
- `.goodplan/architecture/commands-api.md` — CLI command surface
- `.goodplan/architecture/invariants.md` — system-wide constraints (INV-001 through INV-007)
- `.goodplan/architecture/transition-tables.md` — complete state transition spec (source of truth)

Also check if relevant to your task:
- `.goodplan/epics/plugin-distribution/architecture/` — plugin distribution epic target architecture (plugin packaging, CLI rename, nextCommands, HMAC signatures)
- `.goodplan/epics/plugin-distribution/slices/sequencing.md` — plugin distribution slice ordering and dependencies
- `.goodplan/epics/entity-restructuring/architecture/` — entity restructuring epic target architecture (nested slice paths, consolidated overview, affected APIs)
- `.goodplan/research/` — tech stack and library research
- `.goodplan/brainstorm/` — architecture brainstorming output
- `.goodplan/decisions/` — active architectural decisions
- `docs/superpowers/specs/2026-03-20-goodplan-cli-and-skill-consolidation-design.md` — original design spec

## Workflow Evolution Program

We are implementing a set of improvements to the goodplan workflow itself. These span multiple epics and quests. Always read these before starting work on any workflow improvement:

- `Target Workflow Vision.md` — north star document describing the target state for all workflow systems. Check implementations against this to prevent drift.
- `Workflow Improvements - Work Items.md` — prioritized work items (2 epics, 23 quests) with dependency graph, status tracking, and execution order. Update status and capture learnings after completing each item.
- `Development Workflow.md` — exploration scratchpad from the design session (reference, not authoritative — the Target Workflow Vision supersedes this where they differ)

**After completing any workflow improvement epic or quest:**
1. Update the Work Items doc — mark done, note scope changes or surprises
2. Check the dependency graph — what's unblocked?
3. Re-read the relevant section of Target Workflow Vision — does what we built align?
4. Adjust remaining items — update scope, reorder, add/drop items based on what we learned
5. Pick the next highest-priority unblocked item

## Three Separate Things — Do Not Confuse

This repo builds the goodplan workflow system. It contains the source code for both the CLI and skills, AND it uses an older installed version of those same tools to manage its own `.project/` state. These are three distinct things:

### 1. Repo source code (`skills/`, `src/`)
This is what we are actively developing. **"Update a skill" always means editing files here.** The `skills/` directory is the **source of truth** for all goodplan skills. The `src/` directory is the source for the CLI. These are NOT installed or active anywhere until explicitly built/installed.

### 2. Installed tools (`~/.claude/skills/`, `goodplan` on PATH)
These are an **older version**, installed from the repo at some earlier point via `bun run install:skills`. They are what `/project-status`, `/create-plan`, `/implement-plan`, and all other slash commands actually use. They may have **different capabilities** from what's in the repo — we are actively improving the repo versions. The installed `goodplan` CLI binary lives at `~/.local/bin/goodplan`. **Never edit `~/.claude/skills/` directly** — those files get overwritten by `bun run install:skills`.

### 3. This repo's `.project/` directory
This is managed by the **installed** CLI and skills (#2 above), not the repo source code (#1). It must stay compatible with the installed version. It tracks this repo's own epics, quests, learnings, and architecture.

### Rules

| Action | Correct | Wrong |
|---|---|---|
| Edit a skill | Edit `skills/<name>/SKILL.md` in the repo | Edit `~/.claude/skills/<name>/SKILL.md` |
| Run a workflow command | `goodplan status --json` (installed CLI) | `./goodplan status --json` (local build) |
| Mutate `.project/` state | `goodplan quest:complete ...` (installed CLI) | Directly edit `.project/quests/*/quest.json` |
| Test CLI changes | Run `./goodplan` against a **fixture repo** in `/tmp` | Run `./goodplan` against this repo's `.project/` |
| Install updated skills | `bun run install:skills` (explicit, user-initiated) | Auto-install during development |
