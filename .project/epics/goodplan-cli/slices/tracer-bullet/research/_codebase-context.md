# Codebase Context: Tracer Bullet Slice

_Generated 2026-03-21. For plan review of slice 01-tracer-bullet._

## Project State

**Greenfield.** No `src/` directory, no `package.json`, no existing code. The entire repo is documentation, decisions, architecture specs, and the existing skill files (unrelated to CLI code). The tracer bullet slice creates the project from scratch.

## Documentation Inventory

### Fresh (all authored 2026-03-20 to 2026-03-21, no code to drift from)

| Path | Purpose | Relevance to Tracer Bullet |
|---|---|---|
| `.project/epics/__active__goodplan-cli/architecture/_overview.md` | 4-layer stack, subsystem summary, deployment model | HIGH — defines the layers this slice touches |
| `.project/epics/__active__goodplan-cli/architecture/conventions.md` | Reducer pattern, command routing, schema validation, output modes | HIGH — command framework patterns |
| `.project/epics/__active__goodplan-cli/architecture/data-model.md` | Entity schemas, JSONL records, unified state object, directory structure | HIGH — project.json schema, directory layout |
| `.project/epics/__active__goodplan-cli/architecture/data-layer-api.md` | Data layer interface: assembleState, readEntity, writeEntity, etc. | MEDIUM — only minimal data layer in this slice |
| `.project/epics/__active__goodplan-cli/architecture/state-machine-api.md` | Reducer API, StateEvent union, entity status enums, transition tables | LOW — no state machine in this slice |
| `.project/epics/__active__goodplan-cli/architecture/rpc-layer-api.md` | RPC layer: begin/complete/submit/status, context bundling | LOW — no RPC in this slice |
| `.project/epics/__active__goodplan-cli/architecture/commands-api.md` | Full command surface, input/output handling, global flags, sub-agent commands | HIGH — init and status commands, --json, stdin infra |
| `.project/epics/__active__goodplan-cli/architecture/flows.md` | State transition flow, sub-agent flow, learnings rollup | LOW — only init/status flows relevant |
| `.project/epics/__active__goodplan-cli/architecture/invariants.md` | 7 system invariants (INV-001 through INV-007) | MEDIUM — INV-002 (deterministic JSON), INV-005 (schema validation), INV-007 (structured errors) apply |
| `.project/epics/__active__goodplan-cli/architecture/transition-tables.md` | Complete state transition spec (source of truth) | LOW — only INIT_PROJECT relevant |
| `.project/conventions.md` | Tech stack, repo structure, code style, testing, error handling | HIGH — defines everything about the project setup |
| `.project/idea.md` | Project goal: multi-session AI workflow management | CONTEXT — background only |
| `.project/learnings.md` | 25 learnings from prior skill work | LOW — mostly about skill authoring, not CLI code |
| `.project/epics/__active__goodplan-cli/goal.md` | Epic goal: CLI as single interface to .project/ state | CONTEXT |
| `.project/epics/__active__goodplan-cli/slices/sequencing.md` | 8 slices, dependency graph, parallelism notes | CONTEXT — tracer bullet is slice 01, no deps |

### Decisions (all 2026-03-20, all active unless noted)

| Decision | Status | Relevance |
|---|---|---|
| `2026-03-20-layered-architecture.md` | active | HIGH — 4-layer stack this slice bootstraps |
| `2026-03-20-entity-namespaced-commands.md` | active | MEDIUM — entity:verb pattern (only init/status in this slice) |
| `2026-03-20-command-surface-conventions.md` | superseded (by entity-namespaced-commands) | LOW — stdin conventions still active |
| `2026-03-20-roll-your-own-state-machine.md` | active | LOW — state machine not in this slice |
| `2026-03-20-typescript-first-go-later.md` | active | HIGH — TypeScript/Bun chosen, 57MB binary expected |
| `2026-03-20-inline-flag-replaces-depth.md` | active | LOW — --inline not in this slice |
| `2026-03-20-skills-versioned-in-repo.md` | active | LOW — skills migration is slice 07 |
| `2026-03-20-no-work-stack.md` | active | LOW — three active pointers in project.json (relevant to schema) |
| `2026-03-20-epic-verification-at-activation.md` | active | LOW — epic lifecycle not in this slice |
| `2026-03-20-incremental-architecture-updates.md` | active | LOW — completion flow not in this slice |
| `2026-03-17-simplicity-as-default.md` | active | CONTEXT — general design philosophy |
| `2026-03-20-cli-as-workflow-engine.md` | active | CONTEXT — CLI/LLM responsibility split |
| `2026-03-20-orchestrator-subagent-split.md` | active | LOW — sub-agent pattern not in this slice |
| `2026-03-20-skill-cli-integration.md` | active | LOW — skill integration not in this slice |

### Stale Documentation

None. All documentation was authored in the last 2 days (2026-03-20 to 2026-03-21) during the create-architecture phase. There is no code to drift from — the architecture docs are the design target, not a description of existing code.

## Recent Development Activity

The repo has been exclusively documentation and project scaffolding work:

- **2026-03-20**: Epic created (exploration, decisions, prototype). Architecture docs authored. Decisions captured. jqjs spike prototype completed (validated jqjs works in compiled Bun binary).
- **2026-03-20 (later)**: Migrated .project/ to epic structure. Architecture refined (transition tables, commands-api, invariants).
- **Prior work (pre-2026-03-20)**: Skill development (refactor-intelligence, complete-rename, initiatives-infrastructure, etc.) — all using the old markdown-based workflow that the CLI is replacing.

The jqjs prototype at `.project/epics/goodplan-cli/prototypes/jqjs-spike/` (now deleted from working tree) validated that @michaelhomer/jqjs compiles correctly in a Bun binary. This de-risks the jqjs smoke test in the tracer bullet.

## Key Constraints for Tracer Bullet

1. **Tech stack is locked**: TypeScript 6.0, Bun 1.3.x, citty 0.2.x, Zod 4.x, @michaelhomer/jqjs 1.6.x, picocolors 1.1.x, Vitest 4.x, Biome
2. **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` all required
3. **Deterministic JSON**: alphabetical key ordering on all writes (INV-002)
4. **Schema validation**: Zod on every read and write (INV-005)
5. **Structured errors**: `{ error: { code, message, detail? } }` shape, exit codes 1/2/3 (INV-007)
6. **Stateless commands**: target flags required, no ambient state (INV-004)
7. **Output modes**: `--json` for structured output, human-readable default with picocolors
8. **stdin infrastructure**: TTY detection, 1MB limit, empty stdin = `{}`, validation with Zod
9. **Binary compilation**: `bun build --compile` to single binary, ~57MB expected
10. **Repo structure**: `src/commands/`, `src/core/data/`, `src/core/state/`, `src/core/context/`, `src/schemas/`, `src/util/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`

## Architecture Docs Most Relevant to This Slice

In priority order for plan review:

1. **`conventions.md`** (project) — tech stack, repo structure, code style, testing approach
2. **`commands-api.md`** — init command spec, status command spec, global flags, input/output handling, stdin behavior
3. **`data-model.md`** — project.json schema, directory structure, StatusResult shape
4. **`_overview.md`** — layer boundaries, dependency versions, deployment model
5. **`conventions.md`** (architecture) — command routing pattern, schema validation pattern, output modes
6. **`invariants.md`** — INV-002 (deterministic JSON), INV-005 (schema validation), INV-007 (structured errors)

## Areas of Stability vs Churn

- **Stable**: Tech stack decisions, 4-layer architecture, entity model, command naming convention, error handling pattern. These were all decided during exploration and architecture phases and show no signs of revision.
- **Stable**: project.json schema — simple with well-defined fields, unlikely to change.
- **No churn**: This is greenfield; there is no code to have churn in. All documentation was written in a single focused session.
- **Minor evolution risk**: The `--smoke-jq` flag is explicitly temporary (removed in slice 05 when full `--query` lands). This is documented in the goal and is intentional throwaway scope.
