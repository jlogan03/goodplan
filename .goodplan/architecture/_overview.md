# Architecture Overview

## System Summary

goodplan is a Claude Code plugin plus a compiled CLI (`gp`) that together implement a structured, multi-phase software development workflow. The **plugin** (skills, agents, hooks) runs inside a Claude Code session and orchestrates the user-facing flow: explore → architect → plan → implement → review → complete. The **CLI** is the only blessed mutator of project state — it owns a deterministic state machine, schema-validated reads/writes, atomic file operations, and HMAC-signed activity logging in `.goodplan/`. Skills never write `.goodplan/` directly; they call the CLI via subagent RPC, which is enforced at runtime by a bash `protect-state.sh` hook.

The codebase has two top-level surfaces. `src/` is a TypeScript CLI compiled with Bun and structured into clean layers: `commands/` (citty-defined entity-namespaced commands), `core/` (state machine, data layer, RPC, context bundling, artifacts), and `schemas/` (Zod entity, command, and record schemas). `plugin/` contains the user-facing artifacts that are bundled into the marketplace plugin: 12 namespaced `/gp:*` skills, ~15 phase agents, ~17 reviewer agents, and pure-bash hooks. A separate `tools/dogfood/` surface drives end-to-end validation through the `@anthropic-ai/claude-agent-sdk` against isolated fixture repos.

A defining design property is the **layered separation**: skills are presentation/orchestration only, agents are stateless workers, the CLI owns all state, and the data layer hides filesystem details. This makes the system testable in pieces (unit, integration, fitness, dogfood) and lets state mutations stay deterministic even across concurrent Claude Code sessions on different branches.

## Subsystems

### `src/commands` — CLI command surface
Entity-namespaced citty commands (`epic/`, `slice/`, `quest/`, `task/`, `decision/`, `learning/`, `subagent/`, `global/`). Public entry: `main.ts`. Calls into `core/` and `schemas/`. This is the user-and-skill facing API of the CLI.

### `src/core/state` — State machine
Deterministic state machine that owns valid phase transitions for epics, slices, and side-quests. Rejects invalid transitions; emits typed state events.

### `src/core/data` — Data layer
Filesystem-backed records under `.goodplan/`. Atomic writes, HMAC signing, schema validation on read. Hides directory structure from callers.

### `src/core/rpc` — Skill ↔ CLI RPC
Subagent RPC layer (`src/commands/subagent/`) — the protocol that lets skills/phase agents request structured operations from the CLI without direct file access.

### `src/core/context` — Context bundling
Assembles per-phase context bundles (architecture docs, decisions, conventions, learnings) so skills receive the right inputs without manual paste.

### `src/schemas` — Zod schemas
Single source of truth for entity (`entities/`), command argument (`commands/`), record (`records/`), and event (`state-events.ts`) shapes. Used by CLI, RPC, and tests.

### `plugin/skills` — User-facing skills (12)
`init`, `upgrade`, `status`, `task`, `create-epic`, `start-epic`, `explore`, `plan-slice`, `implement`, `complete-epic`, `create-side-quest`, `audit`, plus always-on `workflow-guide`. Each is a `SKILL.md` orchestrator. Skills only call the CLI; they do not mutate state.

### `plugin/agents` — Phase + reviewer agents
~15 phase agents (`onboard-phase`, `explore-phase`, `architecture-phase`, `slices-phase`, `plan-phase`, `implement-phase`, `audit-*-phase`, `completion-*`, `synthesis`, `editor`) and ~17 reviewer agents (`reviewer-typescript`, `reviewer-software-architecture`, `reviewer-frontend`, etc.). Stateless workers invoked by skills.

### `plugin/hooks` — Bash safety hooks
`protect-state.sh` blocks direct writes into `.goodplan/`. `warn-bash-state.sh` warns about bash commands that touch state. Pure bash, no python/node runtime.

### `tools/dogfood` — Agent SDK harnesses
End-to-end validators (`test-init.ts`, `test-plan-slice.ts`, `test-create-epic.ts`, `validate.ts`, `validate-consolidated.ts`) that run real Claude Code sessions against isolated fixture repos using `createTestEnv()` from `harness.ts`/`utils.ts`.

### `tests` — Multi-tier test suite
`unit/`, `integration/`, `fitness/` (architectural invariants), `fixtures/` (sample `.goodplan/` repos).

### `scripts` — Build & fixtures
`build-plugin.sh` (assembles the marketplace plugin) and `generate-onboard-fixture.sh`.

## Subsystem Dependency Graph

```
plugin/skills ──> plugin/agents ──> src/commands (via subagent RPC)
                                         │
                                         ▼
                                    src/core/rpc
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                    src/core/state  src/core/data  src/core/context
                          │              │              │
                          └──────────────┴──────────────┘
                                         │
                                         ▼
                                   src/schemas

plugin/hooks ──guards──> .goodplan/ (filesystem)
tools/dogfood ──drives──> plugin (via Agent SDK + isolated env)
tests ──exercise──> src/* and fixtures
```

No circular dependencies between top-level subsystems detected. `src/util/` and `src/types/` are leaf shared modules.

## Key Dependencies

| Package | Role |
|---|---|
| `citty` | CLI command framework (commands/) |
| `zod` (v4) | Schema validation across entities, commands, records, state events |
| `@michaelhomer/jqjs` | jq query support for `gp status --json --query` |
| `picocolors` | Terminal coloring |
| `@anthropic-ai/claude-agent-sdk` (dev) | End-to-end harnesses in `tools/dogfood/` |
| `@biomejs/biome` (dev) | Lint + format |
| `vitest` (dev) | Unit / integration / fitness tests |
| `bun-types` (dev) | Bun runtime types |

## Deployment Model

- **Distribution:** Claude Code plugin via the `ian97531/goodplan` marketplace repo. Users run `claude plugin marketplace add` then `claude plugin install goodplan`.
- **Build:** `bash scripts/build-plugin.sh` (invoked via `bun run build`) assembles `plugin/` plus the compiled CLI binary into a release artifact.
- **Versioning:** semver in `package.json` (currently `1.0.6`); commit messages bump version inline (e.g. `Bump version to 1.0.4`).
- **No CI workflows** in `.github/workflows/`; quality is gated locally by `bun run check`, `bun run test`, and the dogfood harnesses.
- **Releases:** documented in `docs/releasing.md`.
- **Self-hosted:** the project uses its own installed plugin to manage `.goodplan/` (dogfooding). Three-worlds discipline is mandatory.

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Justification |
|---|---|---|---|
| `src/schemas` | Foundational | All of `src/`, tests | Single source of truth; high churn on `state-events.ts` (17 commits) but interface is stable and depended on everywhere. |
| `src/core/state` | Maturing | RPC, commands | State machine is settled; transitions are documented in fitness tests. |
| `src/core/data` | Maturing | RPC, commands | Atomic writes + HMAC settled; APIs stable. |
| `src/core/rpc` | Maturing | All skills/agents indirectly | High churn on `types.ts` and `complete.ts` (16 commits each) reflects active surface tuning, but contract is stabilizing. |
| `src/commands` | Maturing | Skills, users | Entity-namespaced surface is stable; `main.ts` saw 16 commits as commands were added. |
| `src/core/context` | Developing | Skills via RPC | Context bundling logic still evolving as skills change shape. |
| `plugin/skills` | Developing | End users | 12 skills exist but the workflow-evolution program (2 epics / 23 quests) is actively reshaping them. |
| `plugin/agents` | Developing | Skills | Reviewer agents are mostly thin wrappers; phase agents iterate frequently. |
| `plugin/hooks` | Maturing | Plugin runtime | Recently rewritten in pure bash (1.0.5 → 1.0.6); shape is settled. |
| `tools/dogfood` | Developing | Local validation | High churn on `harness.ts` (23) and `validate-consolidated.ts` (19) — actively used to drive design. |
| `tests/fitness` | Developing | Quality gate | Architectural invariants growing alongside layered design. |
| `scripts/build-plugin.sh` | Maturing | Release process | Stable enough to ship marketplace releases. |

## Notable Hot Spots (top by 6-month churn)

These files see the most churn. Most are state/log files that are expected to mutate (filtered out below); the source-code hot spots are:

| File | Churn | Subsystem |
|---|---|---|
| `tools/dogfood/harness.ts` | 23 | tools/dogfood |
| `tools/dogfood/validate-consolidated.ts` | 19 | tools/dogfood |
| `src/schemas/state-events.ts` | 17 | src/schemas |
| `src/core/rpc/types.ts` | 16 | src/core/rpc |
| `src/core/rpc/complete.ts` | 16 | src/core/rpc |
| `src/commands/main.ts` | 16 | src/commands |
| `package.json` | 20 | repo root |
| `CLAUDE.md` | 30 | repo root |

The concentration in `tools/dogfood/`, `src/core/rpc/`, and `src/schemas/state-events.ts` indicates that the **skill ↔ CLI contract** and the **end-to-end validation harness** are where active design work is happening.

## Migrations / Tech Debt Signals

- **Hooks language migration (recently completed):** python3 → pure bash. Commits `eb5168f` (1.0.5 quoting fix) and `e265aed` (1.0.6 full rewrite). No residual python in `plugin/hooks/`.
- **Workflow evolution program (in flight):** 2 epics / 23 quests reshaping skills, state protection, context retrieval, tech debt, telemetry. Tracked in `docs/Workflow Improvements - Work Items.md`.
- **TODO scan:** not exhaustively run during onboarding; recommend a follow-up audit via `/gp:audit`.
- **No CI workflows committed** — quality currently depends on local discipline; potential debt item if contributor count grows beyond one.
- **Single-contributor bus factor:** all commits authored by Ian White.
