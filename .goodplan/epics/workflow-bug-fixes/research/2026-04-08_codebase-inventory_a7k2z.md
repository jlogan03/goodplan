# Codebase Inventory — goodplan

Factual map of the existing goodplan codebase for the drafter. Absolute paths where given.

## 1. CLI source (`/Users/iwhite/Repos/goodplan/src/`)

### Top-level

| Path | Purpose |
|---|---|
| `src/index.ts` | CLI entry — wires citty main command, global args, all subcommands |
| `src/version.ts` | Version constant |
| `src/commands/main.ts` | Main citty command aggregator |
| `src/commands/global-args.ts` | `--json`, `--query`, `--quiet`, `--verbose`, `--force` shared args |
| `src/types/jqjs.d.ts` | Ambient types for jq JS bindings |

### `src/core/` — subsystems

| Dir | Purpose |
|---|---|
| `core/state/` | Roll-your-own state machine: `types.ts`, `reduce.ts`, and `transitions/*.ts` (one per transition) |
| `core/data/` | File I/O: `load.ts`, `commit.ts`, `hmac.ts`, `serialize.ts`, `tree.ts`, `assemble.ts`, `markdown-files.ts`, `files.ts`, `project.ts`, `schema-registry.ts` |
| `core/rpc/` | Command-side orchestration between commands and state/data: `begin.ts`, `complete.ts`, `submit.ts`, `init.ts`, `migrate.ts`, `next-commands.ts`, `paths.ts`, `update-implementation-phase.ts`, `version-stamp.ts`, `types.ts` |
| `core/context/` | Context bundle assembly for sub-agent phases: `collect.ts`, `budget.ts`, `priorities.ts`, `decisions.ts`, `learnings.ts`, `types.ts`, `index.ts` |
| `core/artifacts.ts` | Artifact path resolution |
| `core/tree.ts` | File tree helpers |

### `src/core/state/transitions/` (state machine)

One file per transition. All phases covered:

| File | Phase |
|---|---|
| `init.ts` | project init |
| `epic-create.ts`, `epic-lifecycle.ts`, `epic-phase.ts`, `epic-refine.ts`, `epic-verify.ts` | epic lifecycle |
| `slice-create.ts`, `slice-plan.ts`, `slice-submit.ts`, `slice-implement.ts`, `slice-complete.ts`, `slice-abandon.ts` | slice lifecycle |
| `quest-create.ts`, `quest-explore.ts`, `quest-plan.ts`, `quest-implement.ts`, `quest-complete.ts`, `quest-abandon.ts` | quest (side quest) lifecycle |
| `task-create.ts`, `task-lifecycle.ts` | task capture |
| `decision.ts` | decision events |
| `rollup-learnings.ts` | learning rollup |
| `helpers.ts` | shared transition helpers |

`reduce.ts` applies event → state. Guards/exit conditions live inline in transition files (no external FSM config). Status enums live in the schemas (see Section 7).

### `src/schemas/`

| File | Shape |
|---|---|
| `schemas/shared.ts` | `timestampSchema`, `refinementSchema` |
| `schemas/state-events.ts` | Event union applied by reducer |
| `schemas/error-output.ts` | Structured error envelope |
| **entities/** | |
| `entities/project.ts` | Project entity (13 lines — minimal) |
| `entities/overview.ts` | Overview snapshot |
| `entities/epic.ts` | `epicStatusSchema` (15 states), `verificationSchema`, `verificationResultSchema`, `epicSchema` (name, status, goal, refinement, verifications, timestamps) |
| `entities/slice.ts` | `sliceStatusSchema` (10 states), `deferredItemSchema`, `sliceSchema` (name, epic, status, goal, deferred, refinement, timestamps) |
| `entities/quest.ts` | `questStatusSchema` (12 states), `questSchema` (name, status, goal, refinement, timestamps) — these are **side quests** |
| `entities/task.ts` | `taskContextSchema`, `taskStatusSchema` (open/converted/dropped), `taskConvertedToSchema`, `taskSchema` |
| **records/** | |
| `records/decision.ts` | `decisionEntrySchema` (id, status=active/superseded/revisiting, domain, title, summary, date, supersededBy, entityPath?, reconsiderWhen?) |
| `records/learning.ts` | `learningEntrySchema` (category, summary, **file**, tags, source, rollup, rollupTo, validUntil?) + `learningInputSchema` (category enum: domain/worked/didnt-work/do-differently) |
| `records/activity-log.ts` | Activity log line schema |
| `records/architecture-delta.ts` | Architecture delta record |
| **commands/** | Zod input/output schemas per command group: `status.ts`, `artifacts.ts`, `decision.ts`, `epic.ts`, `slice.ts`, `quest.ts`, `task.ts`, `submit.ts` |

### `src/commands/` — entity-namespaced

| Dir | Count | Commands |
|---|---|---|
| `commands/global/` | 6 | init, migrate, schema, state, status, verify (+ `migrate/schemas.ts`, `validate-source-path.ts`) |
| `commands/epic/` | 13 | create, list, show, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, complete, abandon, add-verification, update-verification |
| `commands/slice/` | 8 | create, list, show, plan, refine-plan, implement, complete, abandon (+ `utils.ts`) |
| `commands/quest/` | 9 | create, list, show, explore, plan, refine-plan, implement, complete, abandon |
| `commands/task/` | 5 | create, list, show, drop, convert |
| `commands/decision/` | 4 | create, list, show, update |
| `commands/learning/` | 2 | list, rollup |
| `commands/subagent/` | 16 | start-* / submit-* pairs for: plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices — these assemble context bundles and record phase boundaries |

### `src/util/`

`output.ts`, `stdin.ts`, `slug.ts`, `json.ts`, `pagination.ts`, `errors.ts`, `debug.ts`, `validate.ts`, `query.ts` (jq wrapper), `semver.ts`.

## 2. Plugin skills (`/Users/iwhite/Repos/goodplan/plugin/skills/`)

| Skill | user-invocable | Description | Likely fate under new design |
|---|---|---|---|
| `workflow-guide/SKILL.md` | false (always-on) | Orientation: CLI patterns, write restrictions, flow entry points | **Rewrite** — write restrictions change (HMAC drop), flows restructure |
| `status/SKILL.md` | true | Query state via CLI, report phase / recent / next | **Keep/extend** |
| `init/SKILL.md` | true | Auto-detect onboard vs fresh | **Keep** |
| `upgrade/SKILL.md` | true | Migrate/re-migrate `.project/` or `.goodplan/` | **Extend** (directory layout changes) |
| `task/SKILL.md` | true | Quick capture bug/idea/todo | **Keep** |
| `explore/SKILL.md` | true | Research/brainstorm/prototype loop | **Keep** |
| `create-epic/SKILL.md` | true | Full epic pipeline: goal → explore → arch → slices | **Rewrite** — new arch-current/arch-target split, new naming |
| `start-epic/SKILL.md` | true | Present architecture, activate | **Keep/extend** |
| `plan-slice/SKILL.md` | true | Interactive Q&A → draft → review → refine | **Keep**, rubrics integration |
| `implement/SKILL.md` | true | Autonomous plan execution with review loops | **Keep/extend** — verification events |
| `complete-epic/SKILL.md` | true | Cross-slice learning synthesis + architecture reconcile | **Rewrite** (arch reconcile target) |
| `create-side-quest/SKILL.md` | true | Goal → explore → plan for side quests | **Rename impact**: "side-quest" already the name here, but `quest-*` files in CLI become `side-quest-*` |
| `audit/SKILL.md` | true | Dispatches arch/docs/tests audits | **Rewrite** (invariants + events model) |

### `plugin/skills/_references/`

| File | Purpose |
|---|---|
| `cli-interaction.md` (26KB) | THE large CLI interaction guide skills import |
| `epic-conventions.md` (15KB) | Epic directory conventions — **will change** |
| `iteration-loop.md` (14KB) | Draft → review → synthesis → edit loop template |
| `output-templates.md` (10KB) | User-facing message templates |
| `plan-pipeline.md` | Plan pipeline spec |
| `reviewer-registry.md` | Reviewer selection registry — **central to Trust Substrate plans** |
| `explore-phase-pattern.md` | Explore loop pattern |
| `decisions-format.md` | Decision entry format |
| `expertise-tracking.md` | Ian expertise tracking |
| `orchestrator-discipline.md` | Orchestrator rules |
| `orchestrator-error-handling.md` | Error handling patterns |

## 3. Plugin agents (`/Users/iwhite/Repos/goodplan/plugin/agents/`)

All agents declare `model: opus`.

### Phase agents

| File | Purpose |
|---|---|
| `explore-phase.md` | Single exploration cycle, returns PARTIAL |
| `plan-phase.md` | Draft implementation plan from Q&A + arch context |
| `architecture-phase.md` | Draft architecture files from Q&A + exploration |
| `slices-phase.md` | Draft slice breakdown |
| `implement-phase.md` | Implement single plan phase, RED/GREEN checks |
| `onboard-phase.md` | Scan existing codebase, scaffold `.goodplan/` |

### Reviewer agents (all spawned in refinement loops)

| File | Declared domain |
|---|---|
| `reviewer-holistic.md` | Goal alignment, completeness, coherence (always included) |
| `reviewer-software-architecture.md` | Architecture-level design |
| `reviewer-agent-skill.md` | Agent/skill design quality |
| `reviewer-api-contract.md` | Public API surface |
| `reviewer-backend.md` | Backend services, auth, middleware |
| `reviewer-frontend.md` | Component patterns, a11y, perf |
| `reviewer-data-layer.md` | Schema, migrations, queries, indexing |
| `reviewer-data-io.md` | File formats, streaming, ETL |
| `reviewer-tui-cli.md` | TUI/CLI UX (referenced in `_references/` only — file exists) |
| `reviewer-typescript.md` | TS type safety, packaging |
| `reviewer-python.md` | Python-specific |
| `reviewer-rust.md` | Rust ownership, traits |
| `reviewer-ci-github-workflows.md` | CI/CD, workflows |
| `reviewer-devops.md` | Infra, containers, IaC |
| `reviewer-mcp-server.md` | MCP protocol compliance |
| `reviewer-ml-pipeline.md` | ML data/training/deployment |
| `reviewer-algorithm-numerical.md` | Algo complexity, numerical stability |
| `reviewer-performance.md` | Profiling, memory, concurrency |
| `reviewer-repo-tooling.md` | Repo structure, build, tooling |
| `reviewer-ux-ia.md` | UX information architecture |

### Editor / synthesis

| File | Purpose |
|---|---|
| `editor.md` | Applies review feedback to artifact in place |
| `synthesis.md` | Merges multiple reviewer outputs into unified feedback |

### Completion agents

| File | Purpose |
|---|---|
| `completion-slice.md` | Synthesize slice learnings, arch delta, propose side quests |
| `completion-epic.md` | Cross-slice synthesis, reconcile epic arch → top-level arch |

### Audit agents

| File | Purpose |
|---|---|
| `audit-architecture-phase.md` | Intended vs actual arch, drift, boundary violations, fitness |
| `audit-docs-phase.md` | Stale docs, undocumented APIs, inconsistencies |
| `audit-tests-phase.md` | Coverage gaps, stale tests, fragile patterns |

### `plugin/agents/_references/`

Paired `review-*.md` files (one per reviewer, reviewer rubric content), plus:
- `review-preamble.md` — shared review preamble
- `plan-format.md` — plan doc format
- `maturity-conventions.md` — maturity promotion conventions
- `audit-conventions.md` — audit conventions
- `sub-agent-return-format.md` — PARTIAL/SUCCESS/FAILED JSON return contract

## 4. Plugin hooks (`/Users/iwhite/Repos/goodplan/plugin/hooks/`)

Pure bash (no Python — commit `e265aed` dropped python3).

| File | Trigger | Purpose |
|---|---|---|
| `hooks.json` | — | Registers PreToolUse hooks for Edit/Write and Bash |
| `protect-state.sh` | PreToolUse Edit/Write | Blocks direct writes to `.goodplan/` `.json/.jsonl` files and `learnings/*.md` |
| `warn-bash-state.sh` | PreToolUse Bash | Warns via additionalContext when Bash writes under `.goodplan/` (reads silent) |

## 5. CLI command surface (current)

Top-level command groups from `gp --help`:

- **Global**: `init`, `migrate`, `schema`, `state`, `status`, `verify`
- **decision**: create, list, show, update
- **epic**: create, list, show, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, complete, abandon, add-verification, update-verification
- **learning**: list, rollup
- **quest**: create, list, show, explore, plan, refine-plan, implement, complete, abandon
- **task**: create, list, show, drop, convert
- **slice**: create, list, show, plan, refine-plan, implement, complete, abandon
- **subagent boundaries (bare, un-namespaced)**: `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`, and matching `submit-*` commands

Note: subagent commands break the entity-namespace convention — they're bare top-level verbs. Likely target for cleanup.

## 6. State machine

- **Location**: `src/core/state/` — `types.ts`, `reduce.ts`, `transitions/*.ts`
- **Pattern**: Roll-your-own reducer. Events defined in `schemas/state-events.ts`, applied by `reduce.ts`, one transition file per logical event producer. Guards + exit conditions are inline, not declarative tables.
- **Status enums** live in entity schemas:
  - Epic (15): created, exploring, explored, defining-architecture, architecture-defined, refining-architecture, architecture-refined, defining-slices, slices-defined, refining-slices, slices-refined, activated, completed, abandoned
  - Slice (10): created, planning, plan-created, refining, plan-refined, implementing, implementation-complete, completed, abandoned
  - Quest (12): created, exploring, explored, planning, plan-created, refining, plan-refined, implementing, implementation-complete, completed, abandoned
  - Task (3): open, converted, dropped
  - Decision: active, superseded, revisiting
- **Planned replacement**: invariants + events + derived state (no explicit status columns in entities).

## 7. Schemas — key entity shapes

| Entity | Key fields |
|---|---|
| Epic | name, status, goal, verifications[{description,status,addedDuring,modifiedDuring}], refinement?, timestamps |
| Slice | name, **epic** (parent), status, goal, deferred[{description,targetSlice,targetEpic?}], refinement?, timestamps |
| Quest (= side quest) | name, status, goal, refinement?, timestamps — **no epic parent** |
| Task | name, title, description?, context{activeSlice?,activeQuest?,activeEpic?,gitBranch?,capturedDuring?}, status, convertedTo?, timestamps |
| Decision | id, status, domain, title, summary, date, supersededBy, entityPath?, reconsiderWhen[] |
| Learning | category, summary, **file** (not inline detail), tags[], source, rollup, rollupTo[], validUntil?[] |

**Gotcha**: `learningEntrySchema` requires `file` field; `learningInputSchema` (at completion boundary) accepts legacy `detail` and RPC layer maps it. A Phase 4 migration converted legacy `detail` → `file`.

## 8. Conventions and constraints

- **Tech stack**: TypeScript + Bun runtime, [citty](https://github.com/unjs/citty) for CLI, Zod v4, Biome for lint/format, Vitest 4 for tests
- **TS strict flags** (from user CLAUDE.md): `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` on top of strict mode
- **Zod v4 gotcha** (memory note `project_zod_optional_properties.md`): `.optional()` produces `field?: T | undefined` which conflicts with `exactOptionalPropertyTypes`. Workaround: conditional spread when constructing objects. Investigate native Zod v4 APIs.
- **Test layout**: `tests/unit/`, `tests/integration/`, `tests/fitness/`
- **Dogfood harness**: `tools/dogfood/` — Agent SDK with `permissionMode: "bypassPermissions"`, local plugin path, `settingSources: []`, filtered env
- **Three-world rule** (project CLAUDE.md): repo source (`plugin/`, `src/`) vs installed plugin (marketplace) vs this repo's own `.goodplan/` — never confuse
- **Write restriction**: skills never touch `.goodplan/` directly; CLI only. Hooks enforce this.
- **HMAC**: `core/data/hmac.ts` + `gp verify --fix` — current integrity mechanism; planned to drop

## 9. Planned changes the drafter should know about

| Change | Impact area |
|---|---|
| State machine → invariants + events + derived state | Kills `core/state/transitions/*.ts` architecture; rewrites reducer |
| New directory layout (per design 07) | `epic-conventions.md`, all skills that touch epic paths |
| Drop HMAC | Remove `core/data/hmac.ts`, `gp verify` command; rely on PreToolUse hooks |
| Naming convention: `<date>_<slug>_<suffix>.md` | All artifact writes, glob patterns in audit/status |
| "Side quests" rename | `quest-*` CLI files → `side-quest-*`; `quest` entity schema stays but docs/UX reframe (the create-side-quest skill is already named correctly) |
| Arch docs: `architecture-current.md` + `architecture-target.md` | Replaces current arch files; complete-epic reconcile target |
| Drop `workspace/` concept | Any reference in skills / onboard |
| Defer SQLite caching | Keep file-based data layer |
| Trust Substrate: reviewer registry + rubrics + verification events | Formalize `reviewer-registry.md`; new event types in state-events.ts; rubrics become first-class artifacts |

## Notable observations for the drafter

- **Subagent commands are the only non-namespaced group** (`start-plan`, `submit-plan`, etc.). Every other command is `entity:verb`. Drafter should decide whether to namespace these (e.g., `phase:start-plan`).
- **Quest schema has no epic parent** — quests are standalone by design, unlike slices which require `epic`. The "side quest" rename codifies this.
- **20+ reviewer agents** each with a paired `_references/review-*.md` rubric. This is a large surface area; the reviewer registry is the single routing point.
- **Reducer guards are inline, not declarative** — no transition table. Migration to invariants-based model is nontrivial because guards are code not data.
- **`learning.file` field** — learnings already reference external `.md` files via a field, so the per-learning markdown file pattern is already partially in place (see `gp learning:list --json`).
- **Command count**: roughly 60 commands total (13 epic + 9 quest + 8 slice + 5 task + 4 decision + 2 learning + 6 global + 16 subagent boundary = 63).
- **Subagent start/submit pairs number 8** — exactly the current phase boundaries (plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices).
- **Epic has 15 statuses, quest has 12, slice has 10** — significant state surface to rationalize under invariants model.
