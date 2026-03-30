# Plan: Maturity Context Loading

Status: COMPLETE
Completed: 2026-03-27

## Overview

Thread maturity awareness through the remaining skills that lack it: implement-plan, refine-plan, and refine-slices. Three of six target skills (create-plan, create-slices, complete) already have full maturity support. The approach is consistent across all three phases: extract the maturity table from `_overview.md`, include a brief maturity legend in the shared preamble so all agents understand what maturity levels mean in terms of change risk and verification requirements, and present the maturity summary to the user.

All changes are skill-file-only — no CLI code changes. The maturity legend text is derived from `maturity-conventions.md` and kept to a single shared reference file (`skills/_shared/references/maturity-legend.md`) so all skills reference one canonical copy. Skills include the legend via a `{maturity_legend}` placeholder that the orchestrator reads from `maturity-legend.md` at runtime and interpolates — both implement-plan and refine-plan already have placeholder-filling machinery. This avoids copy-pasting legend text into multiple locations and prevents drift. Experimental is omitted from the legend because it imposes no constraints on changes.

## Phase 1: implement-plan Maturity Threading

Add maturity extraction and legend to implement-plan so implementing agents and reviewers know when they're touching sensitive subsystems.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "maturity" skills/implement-plan/SKILL.md` returns 0 — no maturity references in the orchestrator
- [ ] `grep -c "maturity" skills/implement-plan/references/shared-preamble.md` returns 0 — no maturity context in reviewer preamble
- [ ] `sed -n '/## Implementation Sub-Agent Prompt/,/^## /p' skills/implement-plan/references/sub-agent-prompts.md | grep -c "maturity"` returns 0 — no maturity context in the Implementation Sub-Agent Prompt section specifically
- [ ] `grep -c "maturity" skills/_shared/references/maturity-legend.md` — file does not exist yet

**After implementation** (should pass / show presence):
- [ ] `grep -c "maturity" skills/implement-plan/SKILL.md` returns >= 1 — orchestrator extracts maturity table at startup
- [ ] `grep -c "maturity" skills/implement-plan/references/shared-preamble.md` returns >= 1 — preamble includes maturity summary and legend reference
- [ ] `sed -n '/## Implementation Sub-Agent Prompt/,/^## /p' skills/implement-plan/references/sub-agent-prompts.md | grep -c "maturity"` returns >= 1 — implementing agent has maturity legend reference
- [ ] `cat skills/_shared/references/maturity-legend.md` contains the canonical legend text

**Note**: grep checks verify keyword presence, not behavioral correctness. Verification tasks below confirm actual wiring and content accuracy.

### Tasks

- [x] **Create `skills/_shared/references/maturity-legend.md`**: Create a shared legend file that all skills reference. Content derived from `maturity-conventions.md` (Experimental omitted — it imposes no constraints):
  ```
  **Maturity levels** — Developing: changes expected but should be deliberate.
  Maturing: changes need justification and impact awareness.
  Foundational: changes rare — require serious justification, migration planning, fitness function updates.
  ```
- [x] **SKILL.md — Add maturity extraction step**: In Step 1 (Load and Parse the Plan), after the line "Also load `.project/conventions.md` if it exists" (around line 86), add a sub-step: "Load `architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty and skip maturity-aware behavior." Store the extracted table for use in preamble and implementation prompts.
- [x] **shared-preamble.md — Add maturity section**: After the `## Team Defaults` section, add a `## Subsystem Maturity` section with a `{maturity_summary}` placeholder followed by a `{maturity_legend}` placeholder. The orchestrator reads `skills/_shared/references/maturity-legend.md` at runtime and fills `{maturity_legend}` — do not copy-paste the legend text into the preamble. When `{maturity_summary}` is empty (no maturity table found), omit the entire section.
- [x] **sub-agent-prompts.md — Add maturity context to Implementation Sub-Agent Prompt**: In Step 2b (Read Architecture Files), after the instruction to read `_overview.md`, add: "Pay attention to the `## Subsystem Maturity` table. When implementing changes that touch a subsystem:" followed by a `{maturity_legend}` placeholder. The orchestrator reads `skills/_shared/references/maturity-legend.md` at runtime and fills this placeholder. This ensures the implementing agent understands maturity semantics even if it doesn't receive the preamble.
- [x] **SKILL.md — Fill maturity placeholders**: In Step 3.2 where the orchestrator fills `{placeholders}` in the shared preamble, add `{maturity_summary}` (the extracted maturity table from Step 1, or empty if none found) and `{maturity_legend}` (the content of `skills/_shared/references/maturity-legend.md`) to the list. Also fill `{maturity_legend}` in the sub-agent prompt.
- [x] **SKILL.md — Present maturity context to user**: In Step 1, after loading maturity data, if maturity data was found, display: "**Maturity context**: [list of subsystems at Maturing or Foundational, or 'All subsystems at Developing or below']". This gives the user visibility into the maturity landscape before implementation begins.

### Verification

- Read the updated shared-preamble.md and confirm the maturity section is conditional on `{maturity_summary}` being non-empty.
- Read the updated sub-agent-prompts.md and confirm the legend text matches `skills/_shared/references/maturity-legend.md` exactly, which in turn matches the maturity-conventions.md definitions for Developing, Maturing, and Foundational.
- Confirm shared-preamble.md and sub-agent-prompts.md use `{maturity_legend}` placeholders — no copy-pasted legend text. The single source of truth is `maturity-legend.md`, interpolated at runtime.
- Confirm no duplicate maturity extraction logic — SKILL.md should extract once and pass via placeholder, not have each sub-agent extract independently.
- Update Consumer Guide in `skills/_shared/references/maturity-conventions.md`: add `/implement-plan` to the "Loaded by" column for the "Maturity table" row.

## Phase 2: refine-plan Maturity Framing

Add the same maturity extraction and preamble pattern to refine-plan. Reviewers already check maturity (Holistic criterion 12, SW Architecture criterion 12), but the orchestrator doesn't frame or present it.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "maturity" skills/refine-plan/SKILL.md` returns 0 — no maturity references in the orchestrator
- [ ] `grep -c "maturity" skills/refine-plan/references/shared-preamble.md` returns 0 — no maturity context in reviewer preamble

**After implementation** (should pass / show presence):
- [ ] `grep -c "maturity" skills/refine-plan/SKILL.md` returns >= 1 — orchestrator extracts maturity table and includes it in preamble
- [ ] `grep -c "maturity" skills/refine-plan/references/shared-preamble.md` returns >= 1 — preamble includes maturity summary and legend reference

**Note**: grep checks verify keyword presence, not behavioral correctness. Verification tasks below confirm actual wiring and content accuracy. Reviewer files (e.g., `reviewers-always.md`) are excluded from before-checks because they already reference "maturity" in existing review criteria — those are reviewer evaluation criteria, not context-loading.

### Tasks

- [x] **SKILL.md — Add maturity extraction step**: In Step 2b (Load Architecture), after architecture files are loaded, add: "Load `architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty." This mirrors the implement-plan Phase 1 pattern and places maturity extraction alongside architecture loading rather than in the plan-loading step (Step 0b).
- [x] **SKILL.md — Add maturity to preamble filling**: Where the orchestrator fills shared preamble placeholders for reviewer sub-agents, add `{maturity_summary}` and `{maturity_legend}` (read from `skills/_shared/references/maturity-legend.md` at runtime). The refine-plan shared preamble should use the same `## Subsystem Maturity` section as implement-plan's (from Phase 1).
- [x] **Shared preamble alignment**: refine-plan uses its own `references/shared-preamble.md`. Add the same `## Subsystem Maturity` section with `{maturity_summary}` and `{maturity_legend}` placeholders as was added to implement-plan's preamble. Do not copy-paste legend text — the `{maturity_legend}` placeholder is filled at runtime from `skills/_shared/references/maturity-legend.md`.
- [x] **SKILL.md — Present maturity context to user**: After the plan summary output in Step 2b (after maturity extraction), if maturity data was found, display: "**Maturity context**: [list of subsystems at Maturing or Foundational, or 'All subsystems at Developing or below']". This gives the user visibility into the maturity landscape before refinement begins.

### Verification

- Read both shared-preamble.md files (implement-plan and refine-plan) and confirm the maturity section structure is identical, both using `{maturity_legend}` placeholder — no copy-pasted legend text.
- Read refine-plan SKILL.md and confirm extraction happens once (in Step 2b) and is passed via placeholder, matching the Phase 1 pattern.
- Update Consumer Guide in `skills/_shared/references/maturity-conventions.md`: add `/refine-plan` to the "Loaded by" column for the "Maturity table" row.

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

- [x] **SKILL.md — Add maturity extraction step**: In Step 0 (Load Context), add maturity table extraction from `_overview.md`, same pattern as Phases 1-2. Store the extracted table for use when filling preamble placeholders.
- [x] **Verify preamble inheritance from refine-plan**: refine-slices uses `../refine-plan/references/shared-preamble.md` (SKILL.md line 195). Phase 2's preamble edit automatically flows to refine-slices. Verify this is the case. Ensure the `{maturity_summary}` placeholder is filled when spawning reviewers — add `{maturity_summary}` to the placeholder filling step (Step 3, where reviewers are spawned) using the maturity table extracted in Step 0.
- [x] **reviewers-slices.md — Add Maturity Note criterion to Architecture Alignment reviewer**: Add a new criterion: "**Maturity Note completeness**: For each slice, check whether it touches subsystems at Maturing or Foundational maturity (using the maturity table in the preamble). If no maturity table is available in the preamble, skip this criterion. If it does, verify the slice's goal.md contains a `## Maturity Note` section that names the affected subsystem(s) and maturity level(s). Flag missing Maturity Notes as IMPORTANT — plans for these slices need fitness function and migration awareness that the Maturity Note triggers in `/create-plan`." This criterion depends on task 2 having populated `{maturity_summary}` in the preamble.
- [x] **SKILL.md — Present maturity context to user**: After loading slices, if maturity data was found, display which slices have Maturity Notes and which may be missing them. This gives the user early visibility before the review loop starts.
- [x] **Update Consumer Guide in maturity-conventions.md**: In `skills/_shared/references/maturity-conventions.md`, add `/refine-slices` to the "Loaded by" column for the "Maturity table" row (Phase 1 already added `/implement-plan`, Phase 2 added `/refine-plan`).

### Verification

- Read reviewers-slices.md and confirm the new criterion references the maturity table, includes the conditional guard for missing preamble data, and specifies IMPORTANT severity for missing Maturity Notes.
- Read SKILL.md and confirm the maturity extraction pattern is consistent with Phases 1-2.
- Confirm the criterion text explains *why* Maturity Notes matter (they trigger fitness function and migration tasks in `/create-plan`).
- Verify that refine-slices inherits the shared preamble from refine-plan and that `{maturity_summary}` is filled in the reviewer spawning step.
- Read the "Loaded by" column for the Maturity table row in `skills/_shared/references/maturity-conventions.md` and confirm it includes all six skill names: `/create-plan`, `/create-slices`, `/complete`, `/implement-plan`, `/refine-plan`, `/refine-slices`.
