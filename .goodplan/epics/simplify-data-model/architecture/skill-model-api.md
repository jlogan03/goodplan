# Skill Model API — Simplify Data Model Epic

## Overview

12 skills replacing 19. Four pipeline skills use the orchestrator pattern with agent definitions. Eight standalone skills operate directly.

## Skill Inventory

### Pipeline Skills

| Skill | Invoked as | Phases | Interactive | Autonomous |
|---|---|---|---|---|
| `create-epic` | `/gp:create-epic` | 6 | Goal capture, architecture Q&A, approval gates | Explore, architecture draft, refinement loops, slices draft, refinement loops |
| `plan-slice` | `/gp:plan-slice` | 2 | Plan Q&A, approval gate | Refinement loop |
| `create-side-quest` | `/gp:create-side-quest` | 4 | Goal capture, plan Q&A, approval gate | Explore, refinement loop |
| `implement` | `/gp:implement` | 2 | None | Implementation loop, slice/quest completion (+ epic completion prompt if last slice) |

### Standalone Skills

| Skill | Invoked as | Description |
|---|---|---|
| `start-epic` | `/gp:start-epic` | Approve architecture proposal, activate epic |
| `explore` | `/gp:explore` | Ad-hoc research/brainstorm/prototype. Also invoked internally by create-epic and create-side-quest |
| `complete-epic` | `/gp:complete-epic` | Epic-level learnings synthesis, architecture reconciliation, artifact promotion. Classified as standalone (not pipeline) because it has no interactive phases and no multi-phase status orchestration — it runs a single logical step. **Agent usage:** spawns `completion-epic` agent for cross-slice learnings synthesis and architecture reconciliation. Does not use the refinement loop. |
| `audit` | `/gp:audit` | Mode selection (architecture/docs/tests), spawns reviewer agents |
| `task` | `/gp:task` | Quick task capture |
| `upgrade` | `/gp:upgrade` | Upgrade `.goodplan/` state format between versions |
| `init` | `/gp:init` | Initialize new project (empty repo) or onboard existing repo. Auto-detects mode: if source code files exist (e.g., `src/`, `lib/`, `*.ts`, `*.py`), runs onboard flow; otherwise runs new-project flow. Override with `--mode new` or `--mode onboard`. |
| `status` | `/gp:status` | Query state, orient session |

## Description Field Guidelines

The `description` field is the primary trigger mechanism — Claude uses it to match user intent to skills. Consolidated skills must trigger for ALL merged use cases. Required trigger phrases per skill:

| Skill | Must trigger for |
|---|---|
| `create-epic` | "create epic", "new epic", "start epic", "start project", "new project" |
| `plan-slice` | "create plan", "plan slice", "refine plan", "improve plan", "review plan" |
| `create-side-quest` | "side quest", "new quest", "quick task that needs a plan" |
| `implement` | "implement", "execute plan", "build slice", "complete slice" |
| `complete-epic` | "complete epic", "finish epic", "close epic", "wrap up epic" |
| `audit` | "audit architecture", "audit docs", "audit tests", "review codebase", "check quality" |
| `init` | "init", "initialize", "onboard", "new repo", "set up project" |
| `task` | "capture", "quick note", "bug", "idea", "todo", "task" |
| `explore` | "explore", "research", "brainstorm", "investigate", "prototype" |
| `status` | "status", "where am I", "what's next", "project state" |
| `start-epic` | "start epic", "activate epic", "approve architecture" |
| `upgrade` | "upgrade", "migrate", "update state format" |

## Pipeline Skill Details

### `/gp:create-epic`

Creates a full epic from goal through slices.

| Phase | Type | CLI Status Transition | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | `created` | Orchestrator asks user about the epic goal, writes `goal.md` |
| 2. Explore | Autonomous | `created` → `exploring` → `explored` | Spawns explore-phase agent for research/brainstorm |
| 3. Architecture Q&A | Interactive | `explored` → `defining-architecture` | Orchestrator runs design tree (broad + deep pass) |
| 4. Architecture draft + refinement | Autonomous | `defining-architecture` | Spawns architecture-phase agent to draft files, then refinement-coordinator → reviewers → synthesis → editor loop |
| 5. Slices Q&A | Interactive | `architecture-defined` → `defining-slices` | Orchestrator discusses scope, ordering, dependencies |
| 6. Slices draft + refinement | Autonomous | `defining-slices` → `slices-defined` | Spawns slices-phase agent to draft, then refinement loop |

Re-entry: query `gp epic:show --epic <name> --json`, check `status` field, resume from corresponding phase. Offer continue/go-back.

### `/gp:plan-slice`

Creates and refines an implementation plan for a slice.

| Phase | Type | CLI Status Transition | What Happens |
|---|---|---|---|
| 1. Plan Q&A | Interactive | `created` → `planning` | Orchestrator asks about approach, phasing, expected behavior |
| 2. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `plan-refined` | Spawns plan-phase agent to draft, then refinement-coordinator → reviewers → synthesis → editor loop |

Re-entry: query `gp slice:show --slice <name> --json`, check `status`. If status is `plan-refined`, the plan is already complete — offer to re-run refinement (additional review round on the existing plan) or proceed to implementation.

### `/gp:create-side-quest`

Creates a quest from goal through refined plan.

| Phase | Type | CLI Status Transition | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | `created` | Orchestrator asks about the quest goal |
| 2. Explore | Autonomous | `created` → `exploring` → `explored` | Spawns explore-phase agent |
| 3. Plan Q&A | Interactive | `explored` → `planning` | Orchestrator asks about approach |
| 4. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `plan-refined` | Spawns plan-phase agent, then refinement loop |

Re-entry: query `gp quest:show --quest <name> --json`, check `status`.

### `/gp:implement`

Implements a plan and completes the slice.

| Phase | Type | CLI Status Transition | What Happens |
|---|---|---|---|
| 1. Implementation | Autonomous | `plan-refined` → `implementing` | Spawns implement-phase agent per plan phase, with review loops per phase |
| 2. Slice completion | Autonomous | `implementing` → `implementation-complete` → `completed` | Spawns completion agent for learnings, architecture review |

**No interactive phases by design** — user interaction was front-loaded by `/gp:plan-slice`. The approved plan is the user's intent; implementation executes it without further approval gates.

If this is the last slice in the epic: orchestrator prompts "All slices complete. Run `/gp:complete-epic` when ready."

Re-entry: query slice status. If `implementing`, check which plan phases have commits.

## Agent Definitions

All agent `.md` files live in `agents/` at the plugin root.

### Phase Agents

| Agent | Used by | Purpose |
|---|---|---|
| `explore-phase.md` | create-epic (direct spawn), create-side-quest (direct spawn), explore (skill wrapper) | Research/brainstorm/prototype loop |
| `architecture-phase.md` | create-epic | Draft architecture files from Q&A output |
| `slices-phase.md` | create-epic | Draft slice definitions from Q&A output |
| `plan-phase.md` | plan-slice, create-side-quest | Draft implementation plan from Q&A output |
| `implement-phase.md` | implement | Implement a plan phase, run RED/GREEN checks, report changed files |
| `completion-slice.md` | implement | Synthesize slice-level learnings, review architecture delta, propose side quests, update project health |
| `completion-epic.md` | complete-epic | Synthesize cross-slice learnings, reconcile epic architecture against top-level, promote artifacts, propose side quests |

### Coordination Agents

| Agent | Used by | Purpose |
|---|---|---|
| `refinement-coordinator.md` | Any skill running a review loop | Read artifact (via Read, Grep, Glob), analyze content, select relevant reviewers, return structured spawn plan to orchestrator. Does not spawn reviewers itself — the orchestrator acts on the spawn plan. |
| `synthesis.md` | Any skill running a review loop | Merge reviewer outputs, deduplicate, resolve contradictions |
| `editor.md` | Any skill running a review loop | Apply review feedback to artifact |

### Reviewer Agents

One per domain. All share the same output format (injected via `skills:` frontmatter). The refinement-coordinator selects which to spawn.

**Always-on:**
- `reviewer-holistic.md`
- `reviewer-software-architecture.md`

**Language specialists:**
- `reviewer-typescript.md`
- `reviewer-python.md`
- `reviewer-rust.md`

**Web specialists:**
- `reviewer-backend.md`
- `reviewer-frontend.md`
- `reviewer-data-layer.md`
- `reviewer-devops.md`

**Cross-cutting specialists:**
- `reviewer-ci-github-workflows.md`
- `reviewer-tui-cli.md`
- `reviewer-repo-tooling.md`
- `reviewer-ux-ia.md`
- `reviewer-api-contract.md`

**AI tooling specialists:**
- `reviewer-agent-skill.md`
- `reviewer-mcp-server.md`

**Scientific specialists:**
- `reviewer-algorithm-numerical.md`
- `reviewer-performance.md`
- `reviewer-ml-pipeline.md`
- `reviewer-data-io.md`

## Skill Migration

### What Gets Merged

| New Skill | Absorbs | Key Changes |
|---|---|---|
| `create-epic` | create-epic + explore (internal) + create-architecture + refine-architecture + create-slices + refine-slices | Becomes orchestrator. Phase logic extracted to agent definitions. |
| `plan-slice` | create-plan + refine-plan | Orchestrator + plan-phase agent + refinement loop |
| `create-side-quest` | (new) quest creation + explore (internal) + create-plan + refine-plan | Orchestrator combining quest and plan flows |
| `implement` | implement-plan + complete (slice) | Implementation + slice completion in one flow |
| `complete-epic` | complete (epic scope) | Standalone epic completion |
| `audit` | audit-architecture + audit-docs + audit-tests | Mode selection, shared reviewer infrastructure |
| `init` | onboard-repo + create-epic Mode A | Handles both empty and existing repos |
| `task` | capture | Renamed |
| `upgrade` | migrate | Renamed |
| `status` | project-status | Renamed |

### What Gets Deleted

After all skills are migrated:
- `skills/create-architecture/`
- `skills/refine-architecture/`
- `skills/create-plan/`
- `skills/refine-plan/`
- `skills/create-slices/`
- `skills/refine-slices/`
- `skills/implement-plan/`
- `skills/complete/`
- `skills/audit-architecture/`
- `skills/audit-docs/`
- `skills/audit-tests/`
- `skills/capture/`
- `skills/onboard-repo/`
- `skills/migrate/`
- `skills/project-status/`

References in `_shared/references/` are handled per the migration table below. Agent definitions inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/<file>.md` — no need to convert reference files to skill directories.

### `_shared/references/` Migration Table

| Reference File | Disposition | Rationale |
|---|---|---|
| Review preamble (output format, severity levels, score rubric) | **Stays as reference file** — injected into reviewer agents via `@` references | Shared by all reviewer agents |
| CLI conventions (command patterns, flag usage) | **Stays as reference file** — injected into phase agents via `@` references | Shared by phase agents that generate CLI calls |
| Output format templates | **Merged into review preamble** | Already part of the review output contract |
| Reviewer domain prompts (e.g., `reviewers-cross-cutting.md`) | **Split into per-domain files** (`review-holistic.md`, `review-typescript.md`, etc.) — injected into each reviewer agent via `@` references | Each reviewer agent composes: shared preamble + domain-specific criteria |
| Skill-specific references (only used by one deleted skill) | **Deleted** | No remaining consumer after skill consolidation |
| Large reference docs (architecture guides, style guides) | **Stay as reference files** — sub-agents Read them when needed | Too large for context injection |

The total skill directory count remains 12 user-facing skills. No non-user-invocable skills are needed — the `@` reference pattern replaces the `skills:` injection pattern entirely. Inventory `_shared/references/` during the `plan-slice` proof-of-concept slice to finalize the split.
