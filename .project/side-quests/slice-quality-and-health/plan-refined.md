# Plan: Slice Quality & System Health

## Overview

Upgrade the slice definition and completion workflow to produce higher-quality slices and track system health over time. Four changes: (1) `/define-slices` gains tracer bullet framing with a three-lens evaluation that the agent iterates internally before presenting alternatives to the user, (2) a new `/refine-slices` skill uses the shared iteration loop with 4 reviewers to iteratively improve slice goals, (3) `/complete-slice` gains system-profile.md updates, explicit debt evaluation, and signal tracking across the last 3 slices, and (4) `/audit-architecture` gains a step to create or refresh system-profile.md from audit findings.

**Slug**: `slice-quality`

**Note**: Phases 1 and 4 are independent and can be executed in parallel.

**Key decisions made during planning:**
- Three-lens evaluation runs as an internal iteration loop — the agent tries orderings until lenses pass, then always presents at least 2 alternatives with trade-off summaries
- `/refine-slices` uses the full shared iteration loop (same as refine-plan), not a lighter variant
- 4 reviewers for refine-slices: Software Architecture (always-on) + 3 slice-specific (Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis). Goal.md specified 2-3 reviewers; this plan uses 4 after determining that sequencing, verification, and scope concerns each need specialist review
- Slice-specific reviewer prompts live in `refine-slices/references/reviewers-slices.md` (not shared)
- refine-slices uses working copies created in-place alongside originals (sequencing-refining.md, goal-refining.md per slice directory), consistent with refine-plan
- refine-slices has its own `reviewer-registry.md`
- Signal tracking window: last 3 completed slices
- Systemic debt: propose side quest only (don't auto-create goal.md)
- `/audit-architecture` creates system-profile.md if it doesn't exist

## Phase 1: `/define-slices` Upgrade — Tracer Bullet & Three-Lens Evaluation

Add tracer bullet framing, three-lens internal evaluation loop, and integration failure warnings to the existing `/define-slices` skill.

### Tasks

- [x] **Update `SKILL.md` Step 4 — Tracer bullet framing**: Add explicit language that each slice is a "tracer bullet" — a thin vertical cut through all integration layers, demoable/verifiable on its own. First slice proves the architecture works. Each subsequent slice adds a new verifiable flow. Add warning against orderings that produce large amounts of unexercised code.

- [x] **Add new Step 4b — Three-lens evaluation loop**: After the agent drafts an initial slice ordering (but before presenting to user), evaluate against three lenses: tracer bullet quality, risk front-loading, and observability front-loading. The agent iterates internally (cap at 3 iterations), then always presents at least 2 alternatives with trade-off summaries. For projects with 2-3 or 10+ slices, the agent should adapt thresholds accordingly. Full criteria, iteration behavior, conflict handling, and output format go in guidance.md (see below).

- [x] **Update `references/guidance.md`**: Add a "Three-Lens Evaluation" section documenting:
  - Concrete criteria per lens:
    - **Tracer bullet**: every slice has at least one verification step that runs actual code
    - **Risk**: first 50% of slices cover all high-risk architecture items
    - **Observability**: at least one of the first 2 slices includes logging/debug infrastructure
  - Internal iteration behavior (cap at 3)
  - Conflict handling: if all three lenses cannot be simultaneously satisfied, present the trade-off to the user with AskUserQuestion
  - Always-2-alternatives requirement with prose analysis per lens + compact summary table showing lens scores and trade-offs
  - Threshold adaptation note: criteria are calibrated for 4-8 slices; for 2-3 or 10+ slice projects, adapt thresholds proportionally
  - Example scenario: brief 2-3 sentence trace of a 5-slice case where observability is placed last — the evaluation should catch this and propose a reordering. Show only the user-facing output (not the internal iteration trace). Include a compact format skeleton showing the expected output structure (prose analysis heading per lens + summary table with columns: Ordering, Tracer Bullet, Risk, Observability, Trade-offs) without a full trace

  Add a "Tracer Bullet Framing" section with the framing language and integration failure warning.

- [x] **Adjust Step 5 (Write sequencing.md Draft)**: Move sequencing.md write to after the user has picked their preferred ordering from the alternatives. The agent writes the chosen ordering, not the first draft.

### Verification

- Read the updated SKILL.md and guidance.md. Confirm:
  - Step 4 includes tracer bullet framing language and integration failure warning
  - Step 4b describes the three-lens evaluation with internal iteration, always-2-alternatives, and prose+table format
  - Step 5 writes sequencing.md after user selects from alternatives
  - guidance.md has sections for Three-Lens Evaluation and Tracer Bullet Framing
- Read the output files (sequencing.md and each goal.md) and verify: (a) slice ordering satisfies all three lens criteria, (b) each goal.md has concrete success criteria, (c) the file structure matches the defined format

## Phase 2: `/refine-slices` — New Iterative Review Skill

Create a new skill that iteratively reviews and improves slice goals using the shared iteration loop infrastructure with 4 reviewers.

### Tasks

- [x] **Create `~/.claude/skills/refine-slices/SKILL.md`**: Orchestrator skill using the shared iteration loop (`~/.claude/skills/_shared/references/iteration-loop.md`). Include frontmatter:
  ```
  name: refine-slices
  description: Refines vertical slice definitions, sequencing, and goal clarity. Runs after /define-slices to iteratively improve slice quality. Triggers include: "review slices", "improve slice goals", "slice quality", "are these slices good", "refine slices", "are my slices well-ordered", "check slice dependencies", "slice ordering review", "improve slice sequencing", "reorder slices"
  ```

  Define Loop Parameters:
  - **Reviewer list**: Software Architecture (always-on) + Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis (always-on for this skill)
  - **Exit criteria**: All reviewers ≥ 9
  - **Early exit**: All reviewers ≥ 8 after minimum 3 iterations
  - **Max iterations**: 4 (expect 2-3 typically)
  - **Sub-agent prompts**: The SKILL.md instructs the orchestrator to read `~/.claude/skills/refine-plan/references/sub-agent-prompts.md` for bootstrap and synthesis prompt templates, and `references/sub-agent-prompts.md` (local) for the editor template only
  - **Working directory**: Working copies created in-place within each slice directory (e.g., `.project/vertical-slices/01-start-project/goal-refining.md`) plus `sequencing-refining.md` alongside `sequencing.md`. A manifest lists all working copy full paths.
  - **Run directory**: `.project/vertical-slices/slices-refining/` (holding `round-N/reviews/`, `merged.md` — follows the `-refining/` naming convention). Distinct from working copies which live alongside originals.
  - **review_context**: `"slice goal definitions and sequencing"`

  When spawning reviewers, inject a supplementary instruction block after the bootstrap prompt for all 4 reviewers: "This review covers multiple files. Prefix each issue with the filename it applies to (e.g., `goal-refining.md [03-my-slice]`: ...)." For the Software Architecture reviewer (shared prompt), inject this as an additional block appended to the bootstrap prompt. For the 3 slice-specific reviewers, embed the instruction directly in their prompt templates in `reviewers-slices.md`. Do not modify the shared prompt itself.

  **Filename prefix fallback**: If a reviewer issue lacks a filename prefix, the editor sub-agent should attempt to infer the target file from the issue content (e.g., mentions of sequencing → sequencing-refining.md, mentions of a specific slice name → that slice's goal-refining.md). If inference is not possible, the editor should skip the issue and log it as unresolvable in the round's merged.md. The synthesis sub-agent should note any unresolvable issues so the next round's reviewers can re-raise them with proper prefixes.

  **Scope exclusion**: This skill operates exclusively on vertical slice definitions. The SKILL.md must place scope exclusion prominently near the file discovery glob pattern: side quest `goal.md` files (`.project/side-quests/*/goal.md`) are explicitly excluded from the glob results.

  Skill flow:
  1. Load context (idea.md, architecture, conventions, decisions, learnings, all vertical-slice goal.md files, sequencing.md)
  2. Create working copies of sequencing.md and all goal.md files in-place alongside originals
  3. Enter iteration loop (shared reference handles review → synthesize → edit → repeat). `{plan_file_paths}` receives a newline-separated list of all working copy paths.
  4. On exit: rename working copies to originals (overwrite)
  5. State write-back + flow-log

- [x] **Create `~/.claude/skills/refine-slices/references/reviewer-registry.md`**: List all 4 reviewers with their focus areas, prompt file paths, and section names. Format matches refine-plan's registry. Include a `## review_context Value` section with value `"slice goal definitions and sequencing"` (required for the orchestrator to fill the `{review_context}` placeholder in shared prompts). The three slice-specific reviewers (Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis) do not use `{review_context}` — their prompts are self-contained with baked-in context. The Context column in the registry table should be empty for these three reviewers and populated only for Software Architecture (which uses the shared prompt from `reviewers-cross-cutting.md`): `{review_context}` = `"slice goal definitions and sequencing"`.

- [x] **Create `~/.claude/skills/refine-slices/references/reviewers-slices.md`**: Three slice-specific reviewer prompts:
  - **Architecture Alignment Reviewer**: Do slices map cleanly to subsystem boundaries? Are dependencies between slices consistent with architecture? Are any slices crossing too many subsystem boundaries (sign of poor scoping)?
  - **Tracer Bullet Quality Reviewer**: Is each slice independently verifiable end-to-end? Does the Verification section describe something the agent can actually execute? Are there slices that produce code without exercising it? Would implementing this slice give confidence the architecture works for its domain?
  - **Risk/Dependency Analysis Reviewer**: Are unknowns front-loaded? Are there circular dependencies between slices? Is the ordering robust — could a slice fail without cascading? Are dependencies between slices minimal and explicit?

- [x] **Create `~/.claude/skills/refine-slices/references/sub-agent-prompts.md`**: This file contains **only** the editor prompt section, customized for multi-file slice editing. The SKILL.md must explicitly instruct the orchestrator to read `~/.claude/skills/refine-plan/references/sub-agent-prompts.md` for bootstrap and synthesis prompt templates, and read `references/sub-agent-prompts.md` (local) for the editor template only. The editor sub-agent edits sequencing-refining.md and goal-refining.md files based on synthesized feedback.

  **Multi-file editing strategy**: The editor receives a manifest listing all working copy paths (one sequencing-refining.md + N goal-refining.md). Reviewer prompts must prefix each issue with the target filename. The `{plan_file_paths}` placeholder receives a newline-separated list of all working copy paths. Use the existing `"directory-based"` plan type format: treat `sequencing-refining.md` as the "overview" file and the `goal-refining.md` files as "phase files". This avoids introducing a new plan_type value and is compatible with the shared preamble's existing Plan Location handling. The bootstrap prompt's "Plan Location" section should list sequencing-refining.md as the overview and goal files in slice order as phase files.

  **Editor sub-agent multi-file handling**: The editor sub-agent reads all files listed in the manifest, applies feedback items by matching the filename prefix on each issue to the correct file, and writes back each modified file individually. The editor must not create or delete files — only modify existing working copies.

  **Cleanup on interruption**: If the skill is interrupted before completing any iteration (no `round-1/` directory exists in the run directory), delete all working copies. Use the manifest if it exists; if the manifest was not yet created, glob for `*-refining.md` under `.project/vertical-slices/` to find working copies. If interrupted mid-iteration (some `round-N/` exists), leave working copies in place for resume.

  Note: The skill references `~/.claude/skills/refine-plan/references/shared-preamble.md` directly — no separate shared-preamble.md is created.

- [x] **Define state machine integration**: Specify the state.md transition after refine-slices completes: `Current Phase: refine-slices complete — slice goals and sequencing refined`, `Next Step: /create-plan for the first unplanned slice`. The flow-log entry should use `"phase":"refine-slices"` with scope, status, and summary fields consistent with existing entries.

- [x] **Update `workflow.md`**: Add `/refine-slices` between phase 4 (Plan Vertical Slices) and phase 5 (per-slice Explore Loop) as an optional step: "4b. Refine Slices (optional — iterative review of slice goals)". Add `system-profile.md` to the file structure section at the top level of `.project/` alongside `learnings.md` and `conventions.md`, with comment `# system health and quality profile`.

### Verification

- Read all created files. Confirm:
  - SKILL.md exists at `~/.claude/skills/refine-slices/SKILL.md` (discoverable by convention — no central registry needed)
  - SKILL.md has `name` and `description` frontmatter fields
  - SKILL.md references the shared iteration loop and defines all Loop Parameters
  - reviewer-registry.md lists 4 reviewers with correct prompt file paths and includes a `## review_context Value` section
  - reviewers-slices.md has 3 complete reviewer prompts with clear evaluation criteria; each prompt prefixes issues with the target filename
  - sub-agent-prompts.md contains only the editor template customized for multi-file slice editing; SKILL.md instructs the orchestrator to read refine-plan's sub-agent-prompts.md for bootstrap and synthesis templates
  - SKILL.md references `~/.claude/skills/refine-plan/references/shared-preamble.md` directly (no local copy)
  - State machine integration: state.md transition and flow-log entry format are defined
- Confirm the skill's working copy pattern: sequencing-refining.md alongside original, goal-refining.md created in-place within each slice directory, manifest lists full paths
- Confirm run directory is `.project/vertical-slices/slices-refining/`

## Phase 3: `system-profile.md` Convention & `/complete-slice` Upgrade

Define the system-profile.md format and add three new steps to `/complete-slice`: system-profile update, explicit debt evaluation, and cross-slice signal tracking.

### Tasks

- [x] **Create `_shared/references/system-profile-format.md`**: Define the canonical section structure for system-profile.md with its five sections and their sub-structures:
  - **Health**: Well-tested areas, Undertested areas, Known fragile areas
  - **Performance Characteristics**: Observed characteristics with context
  - **Extensibility**: Easy to extend, Hard to extend
  - **Technical Debt**: Localized items, Systemic items
  - **Recent Changes**: Rolling list of last 3 slices' changes

  `/complete-slice` is the primary owner (highest write frequency). Both `/complete-slice` and `/audit-architecture` reference this shared format. `/audit-architecture` appends rather than overwrites when sections were recently updated. Recency is determined by a comment marker at the end of each section: `<!-- Last updated by: <skill> for <scope>, <date> -->`. Both skills must write this marker when updating a section. `/audit-architecture` checks this marker to decide append vs overwrite — if the marker date is within the last 2 completed slices, append; otherwise overwrite. Note: format changes require testing both consuming skills.

- [x] **Update `/complete-slice` SKILL.md — Add Step 6b (Update system-profile.md)**: After architecture review (Step 6), add a new step that reads `.project/system-profile.md` (create if missing using the format from `_shared/references/system-profile-format.md`) and updates it based on what was learned in this slice:
  - **Health**: Which areas were tested, which have gaps
  - **Performance Characteristics**: Any characteristics observed during verification
  - **Extensibility**: Did implementation reveal areas easy or hard to extend?
  - **Technical Debt**: Any shortcuts taken, patterns that won't scale
  - **Recent Changes**: Add this slice's changes to the rolling list (keep last 3 slices; count existing entries, remove oldest if >= 3 before adding new one)

  If system-profile.md doesn't exist, create it with initial content from this slice's artifacts. If it exists, update sections with new information (don't overwrite unrelated sections).

- [x] **Update `/complete-slice` SKILL.md — Add Step 6c (Explicit debt evaluation)**: After Step 6b, explicitly evaluate: "Did this slice reveal architectural debt?" Present findings with classification:
  - **Localized debt**: Propose inline fix (specific files, what to change)
  - **Systemic debt**: Describe the debt, recommend a side quest, but do not auto-create goal.md — propose only, let user decide

  Use AskUserQuestion for each debt finding: "Fix now (localized) / Propose side quest (systemic) / Acknowledge and defer / Skip".

- [x] **Update `/complete-slice` SKILL.md — Add Step 6d (Signal tracking)**: After Step 6c, examine artifact directories for the last 3 completed slices. Discovery logic:
  1. **Discover completed scopes**: Scan for `.project/vertical-slices/*/completion/learnings.md` and `.project/side-quests/*/completion/learnings.md`.
  2. **Derive scope values**: For each path, strip the `.project/` prefix and `/completion/learnings.md` suffix to get the scope value (e.g., `vertical-slices/03-my-slice`).
  3. **Correlate with flow-log**: Filter `flow-log.jsonl` entries matching both `phase: "complete-slice"` AND the derived `scope` value. Use the entry's timestamp to sort.
  4. **Select window**: Take the 3 most recent by timestamp.
  5. **Count refinement effort**: Count `round-N/` directories under `<scope>/refinement/` for each scope (this measures per-slice plan refinement quality). Note: rounds under `.project/vertical-slices/slices-refining/` measure slice *definition* quality (from refine-slices) and are a separate metric — do not mix these two counts. Only per-scope `refinement/` rounds are used for the trend signal.

  Look for trends in:
  - **Refinement effort**: Count `round-N/` directories in `<scope>/refinement/` for each slice (more rounds = more issues found during refinement)
  - **Architectural changes during completion**: Count entries in `<scope>/completion/architecture-updates.md` for each slice

  If any metric is strictly increasing across all 3 data points (a < b < c), surface it: "The last 3 slices have required increasing [metric]. Consider running `/audit-architecture`." Only surface when strictly increasing — not just one high value, and not flat-then-up (e.g., [3, 2, 3] does not trigger).

- [x] **Update `references/guidance.md`**: Add sections for system-profile.md format, debt evaluation protocol, and signal tracking algorithm.

- [x] **Update graceful stop cases**: Add handling for the new steps — if stopped during 6b/6c/6d, note partial completion in state.md (system-profile updated but debt evaluation not done, etc.).

### Verification

- Read updated SKILL.md and guidance.md. Confirm:
  - Step 6b creates or updates system-profile.md with all 5 sections
  - Step 6c evaluates debt with localized/systemic classification
  - Step 6d discovers last 3 completed slices via `completion/learnings.md` scan + `flow-log.jsonl` timestamps, counts `round-N/` directories and `architecture-updates.md` entries, and detects upward trends
  - Graceful stop cases cover new steps
  - guidance.md documents system-profile format, debt protocol, and signal algorithm
- Trace the signal tracking logic: given 3 flow-log entries with iteration counts [2, 3, 5], it should flag an upward trend. Given [3, 2, 3], it should not.

## Phase 4: `/audit-architecture` Integration

Update `/audit-architecture` to create or refresh `.project/system-profile.md` from audit findings.

### Tasks

- [x] **Add Step 5b to `~/.claude/skills/audit-architecture/SKILL.md`**: After writing the audit report (Step 5), add a step to refresh system-profile.md:
  1. Read `.project/system-profile.md` (if exists)
  2. If missing, create it using the format from `_shared/references/system-profile-format.md` with initial content derived from audit findings
  3. If exists, update relevant sections. Write the `<!-- Last updated by: audit-architecture, <date> -->` marker at the end of each updated section (per the convention in `system-profile-format.md`):
     - **Health**: Incorporate gap analysis findings (areas where code drifts from architecture indicate fragility)
     - **Technical Debt**: Incorporate both gap findings (drift = debt) and reassessment findings (architecture needing change = design debt)
     - **Extensibility**: Incorporate reassessment findings about module depth and boundary quality
     - **Recent Changes**: Not updated by audit (this is slice-driven)
  4. Always present a brief summary of proposed changes before writing. Proceed unless the user objects — consistent with audit-architecture's existing pattern.

- [x] **Remove the TODO comment** from audit-architecture SKILL.md. Search for the content marker containing `TODO: When system-profile.md is implemented` (the full text is `<!-- TODO: When system-profile.md is implemented (slice-quality-and-health quest), refresh it here -->`). Search by content, not line number.

- [x] **Update `references/guidance.md`** (audit-architecture's): Add a section on system-profile.md refresh logic, describing which audit findings map to which profile sections. Explicitly document both finding type mappings:
  - **Gap analysis findings** (code drifts from architecture): map to Health (fragile areas) and Technical Debt (drift = debt)
  - **Reassessment findings** (architecture needing change): map to Technical Debt (design debt) and Extensibility (module depth, boundary quality)

- [x] **Update graceful stop cases** in audit-architecture SKILL.md: Add handling for interruption during Step 5b (system-profile refresh). If stopped during system-profile write, note partial completion in state.md. This falls into the same pattern as the existing "quest proposal" partial case — document it explicitly rather than relying on implicit coverage.

### Verification

- Read updated SKILL.md and guidance.md. Confirm:
  - Step 5b creates system-profile.md if missing or updates it if present, writing `<!-- Last updated by: ... -->` markers on each updated section
  - Gap analysis findings map to Health and Technical Debt sections
  - Reassessment findings map to Technical Debt and Extensibility sections
  - The TODO comment is removed
  - guidance.md documents the mapping logic with explicit gap-analysis and reassessment finding type mappings
  - Graceful stop cases cover Step 5b interruption
