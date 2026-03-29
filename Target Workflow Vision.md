# Target Workflow Vision

This document captures the target state for the goodplan workflow based on exploration and decisions made during the 2026-03-29 design session. It serves as a north star for the epics and quests that implement these improvements, ensuring we don't drift from the goal as we work through them.

For the current workflow, see `workflow.md`. For the exploration scratchpad, see `Development Workflow.md`.

---

## Design Principles (What Changed)

These principles extend the existing workflow. Existing principles (CLI as state owner, single entry point, learning loop, expertise tracking, conversational jumping) remain unchanged.

### State Protection via Hooks
The LLM must not directly read or write `.project/` state files (`.json`, `.jsonl`). All state mutations go through the CLI. This is enforced by Claude Code `PreToolUse` hooks that block `Edit` and `Write` tool calls targeting state files. The hooks ship as part of the goodplan plugin.

### Knowledge Artifacts Stay in the Repo
Architecture docs, learnings, plans, goals, research, brainstorms, and all other `.md` content live in `.project/` and travel with Git branches. This preserves branch-coupling (each branch's architecture reflects that branch's reality) and Git history value.

### No Backend for State
Workflow state (entity statuses, scores, activity log) stays in the repo, protected by hooks. A backend service exists only for telemetry and cross-user analytics — it's additive, not in the critical path.

### Relevance Over Volume
Context bundling prioritizes relevance, not completeness. A two-pass retrieval system (CLI structural filtering → optional LLM relevance scoring) selects specifically useful context rather than dumping everything that might be related.

### Tech Debt as a First-Class Entity
Technical debt is tracked explicitly, with degradation triggers that make it actionable. The system applies back-pressure to prevent unbounded debt accumulation.

### Earned Autonomy with Discovery Checkpoints
The LLM earns autonomy per-subsystem based on demonstrated reliability. During autonomous work, mid-implementation discovery checkpoints surface tradeoff-changing findings immediately rather than waiting for completion.

### Workflow Improves via Telemetry, Not Self-Modification
Skills do not modify themselves. Instead, the CLI forwards structured events to an optional telemetry backend. Cross-user pattern analysis identifies improvement opportunities, which are planned and implemented as normal workflow changes to this repo.

---

## Plugin Distribution

The goodplan workflow is distributed as a single Claude Code plugin. Installing the plugin provides:

1. **CLI binary** — embedded in the plugin for macOS (arm64). Future: download-on-first-run for multi-platform.
2. **Skills** — all workflow skills (`/project-status`, `/create-epic`, `/create-plan`, `/implement-plan`, etc.)
3. **State protection hooks** — `PreToolUse` hooks that block direct state file manipulation
4. **Telemetry hooks** — optional, forwards structured events to a configured endpoint

The plugin is versioned atomically — CLI, skills, and hooks are always in sync.

### Plugin Structure

```
goodplan-plugin/
├── .claude-plugin/
│   └── plugin.json
├── binaries/
│   └── macos-arm64/goodplan
├── scripts/
│   └── setup.sh              # Symlinks binary to persistent data dir
├── skills/
│   └── <all skill directories>/
└── hooks/
    ├── protect-state.sh       # Blocks direct state file writes
    └── hooks.json
```

### Key Variables
- `${CLAUDE_PLUGIN_ROOT}` — plugin install directory (replaced on update)
- `${CLAUDE_PLUGIN_DATA}` — persistent data directory (survives updates)
- Binary lives at `${CLAUDE_PLUGIN_DATA}/bin/goodplan`

---

## Context Retrieval System

### Problem
As projects grow, naive "load everything" context bundling either blows the budget or forces aggressive truncation. The workflow needs to select specifically relevant context for each task.

### Two-Pass Retrieval

**Pass 1 — CLI structural filtering (deterministic, fast):**
- **Source code**: Plan declares files to create/modify. CLI computes import graph (one level of imports/importers) to determine the "blast radius." Only files in the dependency cone are included.
- **Architecture**: Include docs for subsystems the plan touches. Always include `_overview.md` (compact summary). Exclude untouched subsystems.
- **Learnings**: Filter by subsystem and pattern tags that overlap with the current scope.
- **Decisions**: Filter by domain. Always include `revisiting` decisions.
- **Conventions**: Always include (kept deliberately concise for this reason).

**Pass 2 — LLM relevance scoring (judgment-based, optional):**
When Pass 1 results exceed the budget, a lightweight LLM pass scores each candidate document 1-5 for relevance to the specific task. Scores determine inline vs. referenced vs. excluded.

### Learning Metadata
Each learning is tagged with:
- `subsystems[]` — which subsystems it applies to
- `patterns[]` — what kind of work triggered it (e.g., "async-operations", "schema-migration", "batch-processing")
- `filePatterns[]` — glob patterns for files where the learning tends to be relevant

### Import Graph
The CLI maintains a lightweight dependency index (TypeScript import parsing, adjacency list). Updated on each `submit-implementation`. Used by context bundling to compute blast radius for source code inclusion.

### Context Bundle Response
```json
{
  "contextBundle": {
    "inline": { ... },
    "references": [ ... ],
    "budgetUsed": "18.2KB / 20KB",
    "excludedReason": {
      "learnings": "12 excluded (different subsystem)",
      "sourceCode": "47 excluded (outside dependency cone)"
    }
  }
}
```

The `excludedReason` field supports debugging — if the agent struggles because of missing context, you can see what was excluded and why.

---

## Tech Debt System

### Entity: TechDebt
```json
{
  "id": "td-003",
  "subsystem": "data-layer",
  "scope": "slice/03-batch-processing",
  "description": "Using sequential writes instead of batch insert",
  "reason": "Batch insert requires schema migration we're deferring",
  "impact": "moderate",
  "impactDescription": "~3x slower for bulk operations, acceptable at current scale",
  "degradationTrigger": "Record volume > 10k or batch frequency > 1/minute",
  "status": "open",
  "createdDuring": "implementation",
  "ts": "2025-04-01T..."
}
```

### CLI Commands
- `goodplan techdebt:create` — log a debt item during implementation
- `goodplan techdebt:list` — view debt by subsystem, severity, age
- `goodplan techdebt:resolve` — mark as resolved (references fixing quest)
- `goodplan techdebt:drop` — explicitly accept the debt (with reason)

### Automatic Debt Management

At slice/quest completion, `/complete` reviews accumulated debt:

| Signal | Response |
|---|---|
| **Count**: 3+ open items in one subsystem | Propose cleanup quest |
| **Severity**: any "high" or "critical" item | Propose cleanup quest immediately |
| **Degradation trigger met** | Propose cleanup quest with urgency |
| **Age**: item survived 2+ epics without triggering | Nudge to drop — "This debt has survived significant system evolution without becoming problematic. Drop it?" |

---

## Intervention System

### Structure
```json
{
  "ts": "...",
  "scope": "slice/batch-processing",
  "phase": "implementation",
  "category": "missing-context | wrong-approach | spec-gap | scope-mismatch | quality-miss | novel-situation",
  "systemState": "what the LLM had produced or was about to do",
  "signalsPresent": "what information was available that should have indicated a problem",
  "humanAction": "what the human decided",
  "outcome": "what happened after",
  "ruleCandidate": "can this become a rule? what would it be?",
  "automated": false
}
```

### Analysis Cadence
- **Per-scope** (`/complete`): Were there interventions? One-off or pattern?
- **Per-epic** (epic completion): Cluster by category. Identify systematic gaps.
- **Cross-user** (telemetry backend): Aggregate patterns across projects.

### Rule Promotion
When 3+ interventions share a pattern → create a workflow improvement entry with a concrete proposed change → user approves → becomes a quest to modify the skill/CLI/reviewer.

Self-modifying skills are explicitly out of scope. All workflow improvements go through the normal plan→refine→implement flow.

---

## Failure Mode Catalog

Eight failure modes with detection criteria and prescribed responses (see `Development Workflow.md` §Failure Mode Detection for full detail):

1. **Getting Stuck** — near-zero net improvement across iterations
2. **Oscillation** — corrections are too aggressive, scores alternate
3. **Regression** — fixes break previously working code
4. **Building the Wrong Thing** — implementation matches plan but not user intent
5. **Architectural Drift** — cumulative small changes create incoherence
6. **Lost Learnings** — same mistakes repeated despite captured learnings
7. **Scope Creep** — implementation expands beyond declared boundaries
8. **Context Overload** — output quality degrades despite good plans

Plus three additional modes:
9. **Premature Commitment** — early architectural decision turns out wrong
10. **Constraint Conflicts** — two requirements are genuinely in tension
11. **Low-Information Iterations** — feedback/correction rounds that don't improve output

Detection is split: CLI detects mechanical signals (score trajectories, iteration counts, regression in checks). Skills detect semantic signals (stuck approaches, scope creep, specification gaps).

---

## Mid-Implementation Discovery Checkpoints

After each implementation phase, the implementer produces a "discoveries" section:
- Anything contradicting assumptions in the plan, architecture, or goal
- Severity levels: `info`, `tradeoff-change`, `blocking`

`tradeoff-change` discoveries trigger immediate user notification. They're cross-referenced against the decision log to check if any revisit triggers are met.

CLI support: `goodplan discovery:flag --scope <slice> --severity <level> --description "..."`

---

## Architecture Pre-Mortem Reviews

During `define-architecture` or `architecture-proposal`, after drafting but before approval, a pre-mortem reviewer agent generates 5-7 concrete scenarios where the architecture would break down:

For each scenario:
1. Concrete description (not "if traffic increases" but "if we need 10k concurrent webhooks")
2. Which architectural decision fails and why
3. Severity (cosmetic, painful, catastrophic)
4. What the architecture would need to handle it
5. Likelihood given the project's trajectory

Accepted risks become decisions with the scenario as their `revisitTrigger`.

---

## State Machine Flexibility

### Back-Transitions
The state machine supports going backward: `implementing → planning` (with a reason captured). The entity tracks replan count.

### Phase Skipping
`goodplan slice:skip-to implementing --reason "trivial change, no plan needed"` — allows skipping phases with explicit acknowledgment. Preserved in audit trail.

### Lightweight Path
For trivial quests: plan → implement → complete (skip refinement, skip formal QA). The skill assesses scope and chooses the appropriate path.

---

## Autonomy Progression

Per-subsystem tracking with promotion criteria, demotion triggers, and how autonomy modulates each phase. See `Development Workflow.md` §Autonomy Progression for full detail.

### Cold-Start Enhancement
- User can set initial autonomy levels per-subsystem during architecture definition
- New subsystems following established patterns can inherit one level below the parent's earned level

---

## Alignment Checkpoints

At the start of each slice, `/project-status` presents a 3-5 sentence system state summary — what the LLM believes the current system does, what the architecture looks like, what the next slice will change. The human confirms or corrects.

Corrections are interventions (category: `mental-model-drift`) and update the relevant architecture file.

After long autonomous phases, a "here's what changed" summary requires human acknowledgment before the next scope begins.

---

## Pre-Planning Interview Protocol

Before planning starts, required inputs:
- Acceptance criteria (what "done" looks like)
- Known constraints
- Priority ordering if tradeoffs emerge
- Related past work the user knows about
- "What could go wrong" prompt — surfaces tacit knowledge
- "Show me an example" prompt for ambiguous requirements

The protocol evolves: track which questions surfaced useful information and which got "I don't know."

---

## Workflow Improvement Queue

A tracked queue for proposed workflow changes:

```json
{
  "trigger": "3 interventions with category=missing-context in auth subsystem",
  "category": "context-bundling",
  "proposedChange": "Add auth subsystem learnings to mandatory context for API-layer plans",
  "scope": "CLI context bundling",
  "status": "proposed | implemented | validated | rejected",
  "evidence": "interventions int-012, int-015, int-019"
}
```

`/project-status` surfaces pending improvements. User approves/rejects/defers. Approved improvements become quests. Track whether implemented improvements actually reduce the corresponding interventions.

---

## Telemetry Backend

Optional service that receives structured events from the CLI. Not in the critical path for any workflow operation.

### What It Receives
- Activity events (phase transitions, durations)
- Intervention records (categorized, with rule candidates)
- Metric snapshots (refinement rounds, implementation iterations, QA issue counts)
- Tech debt events (created, resolved, dropped, triggered)
- Autonomy events (promotions, demotions)
- Learning recurrence events

### What It Provides
- Cross-user pattern analysis (which failure modes are most common)
- Reviewer effectiveness metrics (which reviewers catch issues, which produce noise)
- Workflow health dashboard
- Prioritized improvement opportunities

### Privacy
Configurable telemetry level:
- `metrics-only` — counts and scores (default)
- `structured` — includes categories and types
- `full` — includes descriptions

---

## CLI vs LLM Responsibility Split

### Move to CLI (deterministic)
- **Reviewer selection** — based on touched subsystems and maturity levels
- **Failure mode detection** — mechanical signals (score trajectories, same-lines-modified detection via git diff)
- **Tech debt threshold enforcement** — count/severity/degradation logic

### Keep in LLM (judgment)
- All interactive phases (interviewing, brainstorming, writing content)
- Semantic failure detection (conceptually wrong approaches)
- Learning relevance scoring (Pass 2 of context retrieval)
- Pre-mortem scenario generation
- Discovery severity assessment

### CLI-Proposes, LLM-Disposes
- **Context prioritization** — CLI provides default bundle, skill can request adjustments
- **Reviewer recommendations** — CLI suggests reviewers, skill can add/remove
- **Autonomy assessment** — CLI computes metrics, skill presents promotion/demotion recommendation

---

## Decision Log (From This Session)

| Decision | Rationale |
|---|---|
| State stays in repo, not a backend | Backend branch-tracking replicates Git's problems. Hooks solve the protection need simply. |
| Hooks enforce state protection | Deterministic, ships with plugin, no architecture change needed |
| No self-modifying skills | Feedback loops are dangerous. Telemetry backend is the improvement mechanism. |
| Plugin embeds macOS binary | Single-platform for now. Download-on-first-run for multi-platform later. |
| Tech debt age = drop signal | Old untriggered debt that survived system evolution is probably acceptable |
| Two-pass context retrieval | Structural filtering (fast) + LLM scoring (when needed). Import graph is highest-leverage investment. |
| Discovery checkpoints during implementation | Don't wait for completion to surface tradeoff-changing findings |
| Architecture pre-mortem before commitment | Harness LLM pattern-matching to identify failure scenarios before they're expensive |
| Back-transitions in state machine | Don't force abandon+recreate to change course |
