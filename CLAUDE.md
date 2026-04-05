# goodplan

## Three Separate Things — Do Not Confuse

This repo builds the goodplan workflow system. It contains the source code for both the CLI and skills, AND it uses the installed version of those same tools to manage its own `.goodplan/` state. These are three distinct things:

### 1. Repo source code (`skills/`, `src/`)
This is what we are actively developing. **"Update a skill" always means editing files here.** The `skills/` directory is the **source of truth** for all goodplan skills. The `src/` directory is the source for the CLI. These are NOT installed or active anywhere until explicitly built/installed.

### 2. Installed tools (plugin distribution, `gp` on PATH)
These are installed from the repo via `bun run build:plugin`. They are what `/gp:status`, `/gp:plan-slice`, `/gp:implement`, and all other slash commands actually use. They may have **different capabilities** from what's in the repo — we are actively improving the repo versions. **Never edit installed plugin files directly** — those files get overwritten by `bun run build:plugin`.

### 3. This repo's `.goodplan/` directory
This is managed by the **installed** CLI and skills (#2 above), not the repo source code (#1). It must stay compatible with the installed version. It tracks this repo's own epics, quests, learnings, and architecture.

### Rules

| Action | Correct | Wrong |
|---|---|---|
| Edit a skill | Edit `skills/<name>/SKILL.md` in the repo | Edit `~/.claude/skills/<name>/SKILL.md` |
| Run a workflow command | `gp status --json` (installed CLI) | `./gp status --json` (local build) |
| Mutate `.goodplan/` state | `gp quest:complete ...` (installed CLI) | Directly edit `.goodplan/quests/*/quest.json` |
| Test CLI changes | Run `./gp` against a **fixture repo** in `/tmp` | Run `./gp` against this repo's `.goodplan/` |
| Test skills/plugins | Use Agent SDK harness in `tools/dogfood/` | Ask user to run manual Claude Code sessions |
| Build plugin | `bun run build:plugin` (explicit, user-initiated) | Auto-build during development |

## Test Harness Isolation

Test harnesses (`tools/dogfood/`) must be fully isolated from the user's installed environment:

- **Env whitelist**: Only `PATH` (filtered to remove `~/.claude/plugins/` entries), `HOME`, and `USER` are forwarded. Use `createTestEnv(PLUGIN_DIR)` from `utils.ts`.
- **Settings**: `settingSources: []` — no user config leakage
- **Plugins**: `plugins: [{ type: "local", path: PLUGIN_DIR }]` — local plugin build only
- **Never** touch `~/.claude/plugins/cache/` — if the local plugin path doesn't work, that's a bug to fix in the harness

## Project Context

Use the `gp` CLI to discover project state and architecture:

- `gp status --json` — project state, architecture file paths, epic/slice progress
- `gp --help` — discover available commands
- `gp status --json --query '.artifacts.architecture'` — architecture file paths to read
- `gp learning:list --json` — per-learning `.md` files (CLI-managed)
- `.goodplan/idea.md` — project goal, scope, constraints (not yet CLI-discoverable)
- `.goodplan/conventions.md` — tech stack, repo structure, coding style (not yet CLI-discoverable)

Also check if relevant to your task:
- `gp status --json --query '.artifacts.research'` — research file paths
- `gp status --json --query '.artifacts.brainstorm'` — brainstorm file paths
- `gp status --json --query '.artifacts.decisions'` — active decisions count
- `gp decision:list --json` — decision details
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

## Agent SDK Test Harness

When you need to test skills or plugins in a live Claude Code session, use the Agent SDK harness at `tools/dogfood/`. **Do not ask the user to run manual tests** — write a test script instead.

| Harness | Purpose | Usage |
|---|---|---|
| `test-plugin-skills.ts` | Plugin skill loading, namespacing, execution | `bun tools/dogfood/test-plugin-skills.ts` |
| `test-init.ts` | `/gp:init` skill end-to-end | `bun tools/dogfood/test-init.ts` |
| `test-renames.ts` | `/gp:upgrade` skill discoverability | `bun tools/dogfood/test-renames.ts` |
| `test-plan-slice.ts` | `/gp:plan-slice` orchestrator end-to-end | `bun tools/dogfood/test-plan-slice.ts [--model <model>] [--max-iterations <n>]` |
| `test-create-epic.ts` | `/gp:create-epic` orchestrator end-to-end | `bun tools/dogfood/test-create-epic.ts [--model <model>] [--max-iterations <n>]` |
| `validate.ts` | Full workflow (2 epics + 2 quests) | `bun tools/dogfood/validate.ts` |
| `validate-consolidated.ts` | Full 7-skill pipeline + quality metrics | `bun tools/dogfood/validate-consolidated.ts [--model <model>] [--max-iterations <n>]` |
| `harness.ts` | Multi-phase dogfooding | `bun tools/dogfood/harness.ts [phase] [step]` |

Pattern: `query()` from `@anthropic-ai/claude-agent-sdk` with `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)` for fully isolated plugin testing.
