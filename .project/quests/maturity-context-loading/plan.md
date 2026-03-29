# Plan: Maturity Context Loading

## Overview

Thread maturity awareness through the remaining skills that lack it: implement-plan, refine-plan, and refine-slices. Three of six target skills (create-plan, create-slices, complete) already have full maturity support. The approach is consistent across all three phases: extract the maturity table from `_overview.md`, include a brief maturity legend in the shared preamble so all agents understand what maturity levels mean in terms of change risk and verification requirements, and present the maturity summary to the user.

All changes are skill-file-only — no CLI code changes. The maturity legend text is derived from `maturity-conventions.md` and kept to 2-3 lines so it adds context without bloating prompts.

## Phase 1: implement-plan Maturity Threading

Add maturity extraction and legend to implement-plan so implementing agents and reviewers know when they're touching sensitive subsystems.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "maturity" skills/implement-plan/SKILL.md` returns 0 — no maturity references in the orchestrator
- [ ] `grep -c "maturity" skills/implement-plan/references/shared-preamble.md` returns 0 — no maturity context in reviewer preamble
- [ ] `grep -c "maturity" skills/implement-plan/references/sub-agent-prompts.md` returns 0 in the Implementation Sub-Agent Prompt section — no maturity context for implementing agents

**After implementation** (should pass / show presence):
- [ ] `grep -c "maturity" skills/implement-plan/SKILL.md` returns >= 1 — orchestrator extracts maturity table at startup
- [ ] `grep -c "maturity" skills/implement-plan/references/shared-preamble.md` returns >= 1 — preamble includes maturity summary and legend
- [ ] `grep -c "maturity" skills/implement-plan/references/sub-agent-prompts.md` returns >= 1 in the Implementation Sub-Agent Prompt section — implementing agent has maturity legend

### Tasks

- [ ] **SKILL.md — Add maturity extraction step**: In Step 1 (Load and Parse the Plan), after loading `conventions.md`, add a sub-step: "Load `architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty and skip maturity-aware behavior." Store the extracted table for use in preamble and implementation prompts.
- [ ] **shared-preamble.md — Add maturity section**: After the `## Team Defaults` section, add a `## Subsystem Maturity` section with a `{maturity_summary}` placeholder. Below the placeholder, include a static legend:
  ```
  **Maturity levels** — Developing: changes expected, be deliberate.
  Maturing: changes need justification, impact awareness, fitness function updates.
  Foundational: changes rare — require serious justification, migration planning, fitness function updates.
  ```
  When `{maturity_summary}` is empty (no maturity table found), omit the entire section.
- [ ] **sub-agent-prompts.md — Add maturity context to Implementation Sub-Agent Prompt**: In Step 2b (Read Architecture Files), after the instruction to read `_overview.md`, add: "Pay attention to the `## Subsystem Maturity` table. When implementing changes that touch a subsystem:" followed by the same 3-line legend. This ensures the implementing agent understands maturity semantics even if it doesn't receive the preamble.
- [ ] **SKILL.md — Fill maturity placeholder**: In Step 3.2 where the orchestrator fills `{placeholders}` in the shared preamble, add `{maturity_summary}` to the list. The value is the extracted maturity table from Step 1, or empty if none found.

### Verification

- Read the updated shared-preamble.md and confirm the maturity section is conditional on `{maturity_summary}` being non-empty.
- Read the updated sub-agent-prompts.md and confirm the legend text matches the maturity-conventions.md definitions for Developing, Maturing, and Foundational.
- Confirm no duplicate maturity extraction logic — SKILL.md should extract once and pass via placeholder, not have each sub-agent extract independently.

## Phase 2: refine-plan Maturity Framing

Add the same maturity extraction and preamble pattern to refine-plan. Reviewers already check maturity (Holistic criterion 12, SW Architecture criterion 12), but the orchestrator doesn't frame or present it.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "maturity" skills/refine-plan/SKILL.md` returns 0 — no maturity references in the orchestrator

**After implementation** (should pass / show presence):
- [ ] `grep -c "maturity" skills/refine-plan/SKILL.md` returns >= 1 — orchestrator extracts maturity table and includes it in preamble

### Tasks

- [ ] **SKILL.md — Add maturity extraction step**: In Step 0b (Load Plan and Prepare Working Copy), after loading the plan, add: "Load `architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty." This mirrors the create-plan Step 3 sub-step 4 pattern.
- [ ] **SKILL.md — Add maturity to preamble filling**: Where the orchestrator fills shared preamble placeholders for reviewer sub-agents, add `{maturity_summary}`. The refine-plan shared preamble should use the same `## Subsystem Maturity` section as implement-plan's (from Phase 1).
- [ ] **Shared preamble alignment**: refine-plan uses its own `references/shared-preamble.md`. Add the same `## Subsystem Maturity` section with `{maturity_summary}` placeholder and legend as was added to implement-plan's preamble in Phase 1. Keep the text identical to avoid drift.
- [ ] **SKILL.md — Present maturity context to user**: After the plan summary output in Step 0b, if maturity data was found, display: "**Maturity context**: [list of subsystems at Maturing or Foundational, or 'All subsystems at Developing or below']". This gives the user visibility into the maturity landscape before refinement begins.

### Verification

- Read both shared-preamble.md files (implement-plan and refine-plan) and confirm the maturity section text is identical.
- Read refine-plan SKILL.md and confirm extraction happens once and is passed via placeholder, matching the Phase 1 pattern.

## Phase 3: refine-slices Maturity Verification

Add maturity awareness to refine-slices so reviewers can flag slices that touch Maturing/Foundational subsystems but lack a Maturity Note in their goal.md.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "maturity" skills/refine-slices/SKILL.md` returns 0 — no maturity references in the orchestrator
- [ ] `grep -c "Maturity Note" skills/refine-slices/references/reviewers-slices.md` returns 0 — no reviewer criterion for Maturity Notes

**After implementation** (should pass / show presence):
- [ ] `grep -c "maturity" skills/refine-slices/SKILL.md` returns >= 1 — orchestrator extracts maturity table
- [ ] `grep -c "Maturity Note" skills/refine-slices/references/reviewers-slices.md` returns >= 1 — reviewer has explicit Maturity Note criterion

### Tasks

- [ ] **SKILL.md — Add maturity extraction step**: At the context loading step, add maturity table extraction from `_overview.md`, same pattern as Phases 1-2.
- [ ] **SKILL.md — Add maturity to reviewer preamble**: Fill `{maturity_summary}` in the shared preamble for slice reviewers. If refine-slices uses a shared preamble, add the same `## Subsystem Maturity` section. If it uses a different mechanism, adapt accordingly.
- [ ] **reviewers-slices.md — Add Maturity Note criterion to Architecture Alignment reviewer**: Add a new criterion: "**Maturity Note completeness**: For each slice, check whether it touches subsystems at Maturing or Foundational maturity (using the maturity table). If it does, verify the slice's goal.md contains a `## Maturity Note` section that names the affected subsystem(s) and maturity level(s). Flag missing Maturity Notes as IMPORTANT — plans for these slices need fitness function and migration awareness that the Maturity Note triggers in `/create-plan`."
- [ ] **SKILL.md — Present maturity context to user**: After loading slices, if maturity data was found, display which slices have Maturity Notes and which may be missing them. This gives the user early visibility before the review loop starts.

### Verification

- Read reviewers-slices.md and confirm the new criterion references the maturity table and specifies IMPORTANT severity for missing Maturity Notes.
- Read SKILL.md and confirm the maturity extraction pattern is consistent with Phases 1-2.
- Confirm the criterion text explains *why* Maturity Notes matter (they trigger fitness function and migration tasks in `/create-plan`).
