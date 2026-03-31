# Workflow Improvements — Prioritized Work Items

Organized by dependency order and impact. Each item references the relevant section in `Target Workflow Vision.md`.

---

## Priority 1: Foundation (Enable Everything Else)

### Epic: Plugin Distribution
**Why epic:** New infrastructure — build pipeline, plugin manifest, hook system, binary packaging. Nothing like this exists today.

**Goal:** Package the goodplan CLI, skills, and hooks as a single Claude Code plugin that users install once.

**Scope:**
- Plugin manifest (`plugin.json`) with hooks configuration
- `SessionStart` hook for binary setup (symlink to `${CLAUDE_PLUGIN_DATA}/bin/`)
- Embed compiled macOS arm64 binary in plugin
- State protection `PreToolUse` hook (blocks Write/Edit on `.project/*.json` and `.project/*.jsonl`)
- Build script: `bun run build:plugin` — assembles plugin directory from `skills/`, `src/`, hook scripts
- Update `bun run install:skills` to also build/install the plugin locally for development
- Documentation for plugin installation

**Depends on:** Nothing
**Enables:** All other work (state protection is the foundation for trusting CLI-only mutations)

**Slices:**
1. Plugin scaffold — manifest, directory structure, `build:plugin` script
2. State protection hook — `protect-state.sh`, hook configuration, test that writes are blocked
3. Binary embedding — compile CLI, include in plugin, setup script, PATH integration
4. Skill packaging — copy skills into plugin structure, verify they load
5. Local development workflow — `install:skills` builds plugin, install locally for testing

---

### Quest: State Machine Back-Transitions
**Why quest:** Fits within existing architecture — adds new transition events to the state machine reducer. No exploration needed.

**Goal:** Allow the state machine to go backward (e.g., `implementing → planning`) so users don't have to abandon and recreate when they need to change course.

**Scope:**
- Add reverse transition events: `REPLAN_SLICE`, `REPLAN_QUEST`, `RE_REFINE_SLICE`, `RE_REFINE_QUEST`
- Track `replanCount` on slice/quest entities
- Require a reason string on back-transitions (captured in activity log)
- CLI commands: transitions triggered via existing `goodplan` commands with a `--replan` flag or similar

**Depends on:** Nothing
**Enables:** More flexible conversational workflow

---

### Quest: Phase Skipping
**Why quest:** Small state machine change — adds skip transitions with acknowledgment.

**Goal:** Allow skipping phases for trivial work (e.g., `created → implementing` without a plan) with explicit acknowledgment preserved in the audit trail.

**Scope:**
- Add skip transition events: `SKIP_TO_IMPLEMENTING`, `SKIP_TO_PLAN_REFINED` (skip refinement)
- `goodplan slice:skip-to <status> --reason "..."` command
- Activity log entry records the skip and reason
- Skill integration: quest planning skill assesses scope and suggests lightweight path when appropriate

**Depends on:** Nothing
**Enables:** Reduced ceremony for trivial quests

---

## Priority 2: Learning & Context (Highest Impact on Quality)

### Quest: Learning Metadata Tags
**Why quest:** Adds fields to existing learning schema and CLI commands. No architectural change.

**Goal:** Make learnings retrievable by relevance, not just by scope hierarchy.

**Scope:**
- Add `subsystems[]`, `patterns[]`, `filePatterns[]` fields to learning schema
- Update `goodplan learning:list` to support `--subsystem <name>` and `--pattern <name>` filters
- Update learning creation in `/complete` skill to prompt for tags (or auto-derive from context)
- Backfill tags on existing learnings (one-time migration or gradual via `/complete`)

**Depends on:** Nothing
**Enables:** Relevance-based context retrieval

---

### Quest: Context Budget Enforcement
**Why quest:** Logic changes in the CLI's `start-*` commands — deterministic allocation and filtering.

**Goal:** CLI context bundles are relevance-filtered, not dump-everything.

**Scope:**
- Per-phase allocation tables in CLI configuration
- Budget calculation with surplus redistribution
- Output reserve enforcement (never fill beyond 80% of estimated context)
- `excludedReason` field in bundle response for debugging
- Cut-priority ordering (learnings from distant scopes first, untouched subsystem architecture next, etc.)
- Filter learnings by subsystem/pattern tag overlap with current scope

**Depends on:** Learning Metadata Tags
**Enables:** Better context quality at scale

---

### Quest: Import Graph for Source Code Retrieval
**Why quest:** New capability in the CLI data layer, but fits within existing architecture.

**Goal:** CLI can compute which source files are relevant to a given scope by analyzing TypeScript imports.

**Scope:**
- Lightweight TypeScript import parser (parse `import` statements, build adjacency list)
- `goodplan context:deps --files <file1> <file2>` — returns dependency cone (imports + importers, 1 level)
- Integration with context bundling: `start-implementation` uses the plan's file list + import graph to select source files
- Index updated on each `submit-implementation`
- Stored in `.project/.dep-graph.json` (gitignored — recomputable)

**Depends on:** Nothing
**Enables:** Precise source code context in bundles

---

### Quest: Pre-Planning Interview Protocol
**Why quest:** Skill content change — updates to `/create-plan` skill.

**Goal:** Systematically extract useful context from the user before planning begins.

**Scope:**
- Define required inputs: acceptance criteria, known constraints, priority ordering, related past work
- Add "what could go wrong" prompt
- Add "show me an example" prompt for ambiguous requirements
- Track which questions surfaced useful information (metadata in plan artifacts)
- Evolve the protocol based on tracked usefulness

**Depends on:** Nothing
**Enables:** Better plans, fewer "building the wrong thing" failures

---

## Priority 3: Runtime Intelligence (Better Implementation)

### Quest: Tech Debt Logging
**Why quest:** New entity type, but follows existing entity patterns (JSON files, CLI CRUD commands).

**Goal:** Implementation skills can log tech debt explicitly, with degradation triggers that make it actionable.

**Scope:**
- TechDebt schema: `id`, `subsystem`, `scope`, `description`, `reason`, `impact`, `impactDescription`, `degradationTrigger`, `status`, `ts`
- CLI commands: `techdebt:create`, `techdebt:list`, `techdebt:show`, `techdebt:resolve`, `techdebt:drop`
- State file: `techdebt.jsonl` (append-only)
- Integration with `/implement-plan`: skill logs debt via CLI when making deliberate quality tradeoffs

**Depends on:** State protection hooks (so the LLM can't write techdebt.jsonl directly)
**Enables:** Automatic debt management

---

### Quest: Automatic Debt Management
**Why quest:** Threshold logic in `/complete` skill + CLI support.

**Goal:** `/complete` reviews accumulated debt and proposes cleanup quests when thresholds are crossed.

**Scope:**
- Count-based threshold: 3+ open items in one subsystem → propose cleanup
- Severity-based: any "high" or "critical" → propose cleanup immediately
- Degradation-triggered: degradation condition met → propose with urgency
- Age-based drop signal: debt surviving 2+ epics without triggering → nudge to drop
- Integration with `/complete` and `/project-status`

**Depends on:** Tech Debt Logging
**Enables:** Bounded tech debt accumulation

---

### Quest: Mid-Implementation Discovery Checkpoints
**Why quest:** New CLI command + skill integration. Fits existing patterns.

**Goal:** Surface tradeoff-changing discoveries during implementation, not just at completion.

**Scope:**
- CLI command: `goodplan discovery:flag --scope <slice> --severity <info|tradeoff-change|blocking> --description "..."`
- Storage: `discoveries.jsonl` per scope
- `tradeoff-change` severity triggers user notification in the implementation skill
- Cross-reference against decision log revisit triggers
- `/complete` reviews all discoveries as part of the completion flow

**Depends on:** Nothing
**Enables:** Earlier detection of assumption-invalidating findings

---

### Quest: Failure Mode Detection in CLI
**Why quest:** Moves mechanical detection from skills to CLI. Fits existing architecture.

**Goal:** CLI detects stuck, oscillation, regression, and scope creep mechanically so skills don't have to.

**Scope:**
- Net improvement tracking: `checksNewlyPassing - checksNewlyFailing` per iteration
- Oscillation detection: score direction alternation across 3+ rounds
- Regression detection: previously-passing check fails after a round (compare check results across iterations)
- Scope detection: `git diff` shows changes to files outside the plan's declared scope
- Return failure mode signals in `submit-implementation` and `submit-refinement` responses
- Skills react to signals with prescribed responses from the failure mode catalog

**Depends on:** Nothing
**Enables:** More reliable autonomous implementation

---

### Quest: Architecture Pre-Mortem Reviewer
**Why quest:** New reviewer agent — follows existing reviewer patterns.

**Goal:** Before committing to an architecture, identify 5-7 concrete scenarios where it would break down.

**Scope:**
- Pre-mortem reviewer agent (markdown prompt, spawned during architecture phases)
- Structured output: scenario, failing decision, severity, required architecture change, likelihood
- Integration with `/create-architecture` and architecture proposal phases
- Accepted risks automatically create decisions with `revisitTrigger` set to the scenario

**Depends on:** Nothing
**Enables:** Better architectural decisions, fewer premature commitment failures

---

## Priority 4: Feedback Loops (Workflow Self-Improvement)

### Quest: Intervention Logging
**Why quest:** New entity type following existing patterns.

**Goal:** Capture every instance where the human steps in to override, correct, or unblock the LLM.

**Scope:**
- Intervention schema: `ts`, `scope`, `phase`, `category`, `systemState`, `signalsPresent`, `humanAction`, `outcome`, `ruleCandidate`, `automated`
- CLI commands: `intervention:create`, `intervention:list`, `intervention:show`
- Storage: `interventions.jsonl` (append-only, per-scope + project-level)
- Integration with `/complete`: reviews interventions during scope completion
- Integration with epic completion: cluster analysis by category
- Categories: `missing-context`, `wrong-approach`, `spec-gap`, `scope-mismatch`, `quality-miss`, `novel-situation`

**Depends on:** State protection hooks
**Enables:** Workflow improvement queue, telemetry

---

### Quest: Workflow Improvement Queue
**Why quest:** Lightweight entity + integration with existing skills.

**Goal:** Provide a structured pipeline from "we noticed a pattern" to "we changed the workflow."

**Scope:**
- Schema: `trigger`, `category`, `proposedChange`, `scope` (skill/CLI/reviewer/context), `status`, `evidence`
- CLI commands: `improvement:create`, `improvement:list`, `improvement:show`, `improvement:implement`, `improvement:reject`
- `/project-status` surfaces pending improvements
- `/complete` proposes improvements when intervention clusters are detected
- Implemented improvements tracked — verify they reduce the corresponding interventions

**Depends on:** Intervention Logging
**Enables:** Closed-loop workflow improvement

---

### Quest: Alignment Checkpoints
**Why quest:** Skill content change + minor CLI support.

**Goal:** Keep LLM and human mental models aligned, especially across long autonomous phases.

**Scope:**
- `/project-status` presents system state summary at slice start (3-5 sentences of what the LLM believes)
- Human confirms or corrects
- Corrections logged as interventions (category: `mental-model-drift`)
- Corrections update relevant architecture files
- After delegated/autonomous phases: "here's what changed" summary requires acknowledgment

**Depends on:** Intervention Logging
**Enables:** Reduced mental model drift

---

### Quest: Reviewer Selection in CLI
**Why quest:** Moves deterministic logic from skills to CLI.

**Goal:** CLI recommends which reviewers to run based on touched subsystems and maturity levels.

**Scope:**
- Reviewer registry in CLI configuration (reviewer name → applicable subsystems, maturity sensitivity)
- `start-refinement` response includes `recommendedReviewers[]` based on plan's declared scope
- Skills can override but get a sensible default
- Track reviewer effectiveness: which reviewers catch real issues vs. produce noise

**Depends on:** Nothing
**Enables:** Better reviewer selection, reviewer effectiveness tracking

---

## Priority 5: Scale (Multi-User, Analytics)

### Epic: Telemetry Backend
**Why epic:** New infrastructure — API design, data model, privacy considerations, deployment. Needs exploration.

**Goal:** Optional service that receives structured events from the CLI for cross-user pattern analysis.

**Scope:**
- API endpoint for receiving events (activity, interventions, metrics, tech debt, autonomy)
- Storage and aggregation
- Privacy levels: `metrics-only` (default), `structured`, `full`
- `goodplan config set telemetry.endpoint <url>` and `telemetry.enabled true`
- Batched event forwarding (buffer locally, flush periodically)
- `goodplan telemetry:show-pending` — inspect queued events before they're sent
- Dashboard for workflow health across projects/users
- Pattern analysis: failure mode frequency, reviewer effectiveness, learning recurrence rates

**Depends on:** Intervention Logging, Tech Debt Logging (for full value — but can start with activity events only)
**Enables:** Data-driven workflow improvement at scale

---

## Priority 6: Autonomy (Longer-Term)

### Quest: Autonomy Tracking
**Why quest:** New entity (`autonomy.json`) + integration with existing skills.

**Goal:** Track per-subsystem autonomy levels and modulate workflow behavior accordingly.

**Scope:**
- Autonomy schema: per-subsystem `level`, `scopesCompleted`, `averageRefinementRounds`, `regressionCount`, `lastPromotion`, `lastDemotion`
- CLI: `goodplan autonomy:show`, autonomy context included in `start-*` bundles
- `/complete` evaluates promotion/demotion criteria
- Promotions require human confirmation; demotions are automatic
- Skills adjust behavior per autonomy level (plan co-writing vs. approval-only, etc.)

**Depends on:** Nothing (but more valuable after several other quests are done)
**Enables:** Reduced human overhead for well-understood work

---

### Quest: Autonomy Cold-Start
**Why quest:** Small extension to autonomy tracking.

**Goal:** Allow sensible initial autonomy levels instead of always starting at Guided.

**Scope:**
- User can set initial autonomy during architecture definition
- New subsystems following established patterns inherit one level below parent's earned level
- Document that autonomy reflects demonstrated reliability in this codebase, not general LLM capability

**Depends on:** Autonomy Tracking

---

## Dependency Graph

```
Plugin Distribution ─────────────────────────────────────┐
  └─ State Protection Hooks                               │
       └─ Tech Debt Logging                               │
       │    └─ Automatic Debt Management                  │
       └─ Intervention Logging                            │
            └─ Workflow Improvement Queue                 │
            └─ Alignment Checkpoints                      │
            └─ Telemetry Backend (epic)                   │
                                                          │
State Machine Back-Transitions ───────────────────────────┤ (independent)
Phase Skipping ───────────────────────────────────────────┤
Learning Metadata Tags ───────────────────────────────────┤
  └─ Context Budget Enforcement                           │
Import Graph ─────────────────────────────────────────────┤
Pre-Planning Interview Protocol ──────────────────────────┤
Mid-Implementation Discovery Checkpoints ─────────────────┤
Failure Mode Detection in CLI ────────────────────────────┤
Architecture Pre-Mortem Reviewer ─────────────────────────┤
Reviewer Selection in CLI ────────────────────────────────┤
Autonomy Tracking ────────────────────────────────────────┤
  └─ Autonomy Cold-Start                                  │
```

Many items are independent and can be parallelized. The main dependency chain is:
**Plugin → State Protection → {Tech Debt, Interventions} → {Debt Management, Improvement Queue, Alignment, Telemetry}**

---

## Suggested Execution Order

1. **Plugin Distribution** (epic) — foundation for everything
2. **State Machine Back-Transitions + Phase Skipping** (parallel quests) — immediate UX improvement
3. **Learning Metadata Tags** → **Context Budget Enforcement** (sequential) — highest quality impact
4. **Tech Debt Logging** + **Mid-Implementation Discovery Checkpoints** + **Pre-Planning Interview Protocol** (parallel quests) — runtime intelligence
5. **Intervention Logging** → **Workflow Improvement Queue** (sequential) — feedback loops
6. **Import Graph** + **Failure Mode Detection** + **Architecture Pre-Mortem** + **Reviewer Selection** (parallel quests) — refinement
7. **Alignment Checkpoints** + **Automatic Debt Management** (parallel quests) — polish
8. **Autonomy Tracking** → **Autonomy Cold-Start** (sequential) — longer-term
9. **Telemetry Backend** (epic) — scale
