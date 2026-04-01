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
| `implement` | `/gp:implement` | 2 | None (front-loaded by plan-slice) | Implementation loop, slice completion (+ epic completion prompt if last slice) |

### Standalone Skills

| Skill | Invoked as | Description |
|---|---|---|
| `start-epic` | `/gp:start-epic` | Approve architecture proposal, activate epic |
| `explore` | `/gp:explore` | Ad-hoc research/brainstorm/prototype. Also invoked internally by create-epic and create-side-quest |
| `complete-epic` | `/gp:complete-epic` | Epic-level learnings synthesis, architecture reconciliation, artifact promotion |
| `audit` | `/gp:audit` | Mode selection (architecture/docs/tests), spawns reviewer agents |
| `task` | `/gp:task` | Quick task capture |
| `upgrade` | `/gp:upgrade` | Upgrade `.goodplan/` state format between versions |
| `init` | `/gp:init` | Initialize new project (empty repo) or onboard existing repo |
| `status` | `/gp:status` | Query state, orient session |

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

Re-entry: query `gp slice:show --slice <name> --json`, check `status`.

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

If this is the last slice in the epic: orchestrator prompts "All slices complete. Run `/gp:complete-epic` when ready."

Re-entry: query slice status. If `implementing`, check which plan phases have commits.

## Agent Definitions

All agent `.md` files live in `agents/` at the plugin root.

### Phase Agents

| Agent | Used by | Purpose |
|---|---|---|
| `explore-phase.md` | create-epic, create-side-quest, explore | Research/brainstorm/prototype loop |
| `architecture-phase.md` | create-epic | Draft architecture files from Q&A output |
| `slices-phase.md` | create-epic | Draft slice definitions from Q&A output |
| `plan-phase.md` | plan-slice, create-side-quest | Draft implementation plan from Q&A output |
| `implement-phase.md` | implement | Implement a plan phase, report changed files |
| `completion-phase.md` | implement, complete-epic | Synthesize learnings, review architecture |

### Coordination Agents

| Agent | Used by | Purpose |
|---|---|---|
| `refinement-coordinator.md` | Any skill running a review loop | Read artifact, select reviewers, return spawn plan |
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

References in `_shared/references/` that are only consumed by deleted skills are also removed. Shared references consumed by agent definitions move to skill-format files injectable via `skills:` frontmatter.
