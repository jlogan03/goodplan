# Plan: Slice Quality & System Health

## Overview

Upgrade the slice definition and completion workflow to produce higher-quality slices and track system health over time. Four changes: (1) `/define-slices` gains tracer bullet framing with a three-lens evaluation that the agent iterates internally before presenting alternatives to the user, (2) a new `/refine-slices` skill uses the shared iteration loop with 4 reviewers to iteratively improve slice goals, (3) `/complete-slice` gains system-profile.md updates, explicit debt evaluation, and signal tracking across the last 3 slices, and (4) `/audit-architecture` gains a step to create or refresh system-profile.md from audit findings.

**Slug**: `slice-quality`

**Key decisions made during planning:**
- Three-lens evaluation runs as an internal iteration loop — the agent tries orderings until lenses pass, then always presents at least 2 alternatives with trade-off summaries
- `/refine-slices` uses the full shared iteration loop (same as refine-plan), not a lighter variant
- 4 reviewers for refine-slices: Software Architecture (always-on) + 3 slice-specific (Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis)
- Slice-specific reviewer prompts live in `refine-slices/references/reviewers-slices.md` (not shared)
- refine-slices uses working copies (sequencing-refining.md, goal-refining.md), consistent with refine-plan
- refine-slices has its own `reviewer-registry.md`
- Signal tracking window: last 3 completed slices
- Systemic debt: propose side quest only (don't auto-create goal.md)
- `/audit-architecture` creates system-profile.md if it doesn't exist

## Phase 1: `/define-slices` Upgrade — Tracer Bullet & Three-Lens Evaluation

Add tracer bullet framing, three-lens internal evaluation loop, and integration failure warnings to the existing `/define-slices` skill.

### Tasks

- [ ] **Update `SKILL.md` Step 4 — Tracer bullet framing**: Add explicit language that each slice is a "tracer bullet" — a thin vertical cut through all integration layers, demoable/verifiable on its own. First slice proves the architecture works. Each subsequent slice adds a new verifiable flow. Add warning against orderings that produce large amounts of unexercised code.

- [ ] **Add new Step 4b — Three-lens evaluation loop**: After the agent drafts an initial slice ordering (but before presenting to user), evaluate against three lenses:
  1. **Tracer bullet quality**: Is each slice a complete e2e flow the agent can exercise? If not, merge or redefine.
  2. **Risk front-loading**: Are high-risk unknowns scheduled early?
  3. **Observability front-loading**: Does early work include logging, debugging infra, or tooling?

  The agent iterates internally: if any lens is weak, try alternative orderings (reorder, merge, split) until either all lenses pass or reasonable alternatives are exhausted. **Always present at least 2 alternatives** to the user — the best-scoring ordering plus the next best — with a prose analysis per lens followed by a compact summary table showing lens scores and trade-offs between alternatives. User picks or adjusts.

- [ ] **Update `references/guidance.md`**: Add a "Three-Lens Evaluation" section documenting the evaluation criteria, the internal iteration behavior, the always-2-alternatives requirement, and the prose-plus-summary-table output format. Add a "Tracer Bullet Framing" section with the framing language and integration failure warning.

- [ ] **Adjust Step 5 (Write sequencing.md Draft)**: Move sequencing.md write to after the user has picked their preferred ordering from the alternatives. The agent writes the chosen ordering, not the first draft.

### Verification

- Read the updated SKILL.md and guidance.md. Confirm:
  - Step 4 includes tracer bullet framing language and integration failure warning
  - Step 4b describes the three-lens evaluation with internal iteration, always-2-alternatives, and prose+table format
  - Step 5 writes sequencing.md after user selects from alternatives
  - guidance.md has sections for Three-Lens Evaluation and Tracer Bullet Framing
- Dry-run: mentally trace the flow for a 5-slice project where observability is placed last — the three-lens evaluation should catch this and propose a reordering

## Phase 2: `/refine-slices` — New Iterative Review Skill

Create a new skill that iteratively reviews and improves slice goals using the shared iteration loop infrastructure with 4 reviewers.

### Tasks

- [ ] **Create `~/.claude/skills/refine-slices/SKILL.md`**: Orchestrator skill using the shared iteration loop (`~/.claude/skills/_shared/references/iteration-loop.md`). Define Loop Parameters:
  - **Reviewer list**: Software Architecture (always-on) + Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis (always-on for this skill)
  - **Exit criteria**: All reviewers ≥ 9
  - **Early exit**: All reviewers ≥ 9 after minimum 1 iteration
  - **Max iterations**: 4 (expect 2-3 typically)
  - **Editor prompt path**: `references/sub-agent-prompts.md` → Slice Editor section
  - **Working directory**: Working copies — `sequencing-refining.md` and `goal-refining.md` per slice
  - **Run directory**: `<scope_dir>/slices-refining/` (co-located, following naming convention)
  - **review_context**: `"slice goal definitions and sequencing"`

  Skill flow:
  1. Load context (idea.md, architecture, conventions, decisions, learnings, all goal.md files, sequencing.md)
  2. Create working copies of sequencing.md and all goal.md files
  3. Enter iteration loop (shared reference handles review → synthesize → edit → repeat)
  4. On exit: rename working copies to originals (overwrite)
  5. State write-back + flow-log

- [ ] **Create `~/.claude/skills/refine-slices/references/reviewer-registry.md`**: List all 4 reviewers with their focus areas, prompt file paths, and section names. Format matches refine-plan's registry.

- [ ] **Create `~/.claude/skills/refine-slices/references/reviewers-slices.md`**: Three slice-specific reviewer prompts:
  - **Architecture Alignment Reviewer**: Do slices map cleanly to subsystem boundaries? Are dependencies between slices consistent with architecture? Are any slices crossing too many subsystem boundaries (sign of poor scoping)?
  - **Tracer Bullet Quality Reviewer**: Is each slice independently verifiable end-to-end? Does the Verification section describe something the agent can actually execute? Are there slices that produce code without exercising it? Would implementing this slice give confidence the architecture works for its domain?
  - **Risk/Dependency Analysis Reviewer**: Are unknowns front-loaded? Are there circular dependencies between slices? Is the ordering robust — could a slice fail without cascading? Are dependencies between slices minimal and explicit?

- [ ] **Create `~/.claude/skills/refine-slices/references/sub-agent-prompts.md`**: Bootstrap, synthesis, and editor prompt templates. The editor sub-agent edits sequencing-refining.md and goal-refining.md files based on synthesized feedback. Can reference/adapt refine-plan's templates, adjusted for slice goals instead of implementation plans.

- [ ] **Create `~/.claude/skills/refine-slices/references/shared-preamble.md`**: Shared preamble for reviewer output format (score, issues with severity, summary). Follows the same structure as refine-plan's preamble.

- [ ] **Register the skill**: Add `refine-slices` to the skill description/triggers in the SKILL.md frontmatter. Ensure it appears in the Claude Code skill list.

### Verification

- Read all created files. Confirm:
  - SKILL.md references the shared iteration loop and defines all Loop Parameters
  - reviewer-registry.md lists 4 reviewers with correct prompt file paths
  - reviewers-slices.md has 3 complete reviewer prompts with clear evaluation criteria
  - sub-agent-prompts.md has bootstrap, synthesis, and editor templates
  - shared-preamble.md defines the output format
- Confirm the skill's working copy pattern: sequencing-refining.md and goal-refining.md created at start, renamed on completion
- Confirm run directory is `slices-refining/` in the scope directory

## Phase 3: `system-profile.md` Convention & `/complete-slice` Upgrade

Define the system-profile.md format and add three new steps to `/complete-slice`: system-profile update, explicit debt evaluation, and cross-slice signal tracking.

### Tasks

- [ ] **Update `/complete-slice` SKILL.md — Add Step 6b (Update system-profile.md)**: After architecture review (Step 6), add a new step that reads `.project/system-profile.md` (create if missing using the format from goal.md) and updates it based on what was learned in this slice:
  - **Health**: Which areas were tested, which have gaps
  - **Performance Characteristics**: Any characteristics observed during verification
  - **Extensibility**: Did implementation reveal areas easy or hard to extend?
  - **Technical Debt**: Any shortcuts taken, patterns that won't scale
  - **Recent Changes**: Add this slice's changes to the rolling list (keep last 3 slices; older entries drop off)

  If system-profile.md doesn't exist, create it with initial content from this slice's artifacts. If it exists, update sections with new information (don't overwrite unrelated sections).

- [ ] **Update `/complete-slice` SKILL.md — Add Step 6c (Explicit debt evaluation)**: After Step 6b, explicitly evaluate: "Did this slice reveal architectural debt?" Present findings with classification:
  - **Localized debt**: Propose inline fix (specific files, what to change)
  - **Systemic debt**: Describe the debt, recommend a side quest, but do not auto-create goal.md — propose only, let user decide

  Use AskUserQuestion for each debt finding: "Fix now (localized) / Propose side quest (systemic) / Acknowledge and defer / Skip".

- [ ] **Update `/complete-slice` SKILL.md — Add Step 6d (Signal tracking)**: After Step 6c, check `.project/flow-log.jsonl` for the last 3 completed slices. Look for trends in:
  - **Refinement iteration counts**: Are more review rounds needed over time? (Read `refine-plan` flow-log entries for iteration counts)
  - **Implementation deviations from plans**: Are implementation reviews flagging more issues? (Read `implement-plan` flow-log entries)
  - **Architectural changes during completion**: Are more architecture updates happening at completion time? (Read `complete-slice` flow-log entries)

  If any metric is trending upward across the last 3 slices, surface it: "The last N slices have required increasing [metric]. Consider running `/audit-architecture`." Only surface when there's a clear upward trend (not just one high value).

- [ ] **Update `references/guidance.md`**: Add sections for system-profile.md format, debt evaluation protocol, and signal tracking algorithm.

- [ ] **Update graceful stop cases**: Add handling for the new steps — if stopped during 6b/6c/6d, note partial completion in state.md (system-profile updated but debt evaluation not done, etc.).

### Verification

- Read updated SKILL.md and guidance.md. Confirm:
  - Step 6b creates or updates system-profile.md with all 5 sections
  - Step 6c evaluates debt with localized/systemic classification
  - Step 6d reads last 3 flow-log entries and detects upward trends
  - Graceful stop cases cover new steps
  - guidance.md documents system-profile format, debt protocol, and signal algorithm
- Trace the signal tracking logic: given 3 flow-log entries with iteration counts [2, 3, 5], it should flag an upward trend. Given [3, 2, 3], it should not.

## Phase 4: `/audit-architecture` Integration

Update `/audit-architecture` to create or refresh `.project/system-profile.md` from audit findings.

### Tasks

- [ ] **Add Step 5b to `~/.claude/skills/audit-architecture/SKILL.md`**: After writing the audit report (Step 5), add a step to refresh system-profile.md:
  1. Read `.project/system-profile.md` (if exists)
  2. If missing, create it with initial content derived from audit findings
  3. If exists, update relevant sections:
     - **Health**: Incorporate gap analysis findings (areas where code drifts from architecture indicate fragility)
     - **Technical Debt**: Incorporate both gap findings (drift = debt) and reassessment findings (architecture needing change = design debt)
     - **Extensibility**: Incorporate reassessment findings about module depth and boundary quality
     - **Recent Changes**: Not updated by audit (this is slice-driven)
  4. Present changes before writing. Use AskUserQuestion only if the updates seem contentious.

- [ ] **Remove the TODO comment** on line 147 of audit-architecture SKILL.md (`<!-- TODO: When system-profile.md is implemented... -->`).

- [ ] **Update `references/guidance.md`** (audit-architecture's): Add a section on system-profile.md refresh logic, describing which audit findings map to which profile sections.

### Verification

- Read updated SKILL.md and guidance.md. Confirm:
  - Step 5b creates system-profile.md if missing or updates it if present
  - Gap analysis findings map to Health and Technical Debt sections
  - Reassessment findings map to Technical Debt and Extensibility sections
  - The TODO comment is removed
  - guidance.md documents the mapping logic
