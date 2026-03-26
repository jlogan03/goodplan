# Plan: Skill Workflow Bugs & Output Consistency

## Overview

Fix 3 workflow bugs across goodplan skills and standardize output templates for consistent user-facing presentation. Part A fixes bugs (redundant sections in create-slices guidance.md goal template, unnecessary confirmation prompts, /complete learnings gate). Part B extracts the shared Iteration Summary template to `_shared/references/output-templates.md` and integrates rigid templates into all skills — so no prose-only structured output descriptions remain. Completion Summary, Done Summary, and Context Load Summary stay inline in each skill.

Key audit finding: refine-slices has **zero** output templates (no iteration summary, no completion summary). complete has 4 prose-described outputs. create-slices and create-plan use semi-rigid inline examples. These are the primary integration targets.

## Phase 1: Bug Fixes

Fix all 3 Part A bugs — 2 skill-file edits + 1 shared reference update.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -n "^## Success Criteria$" skills/create-slices/references/guidance.md` → shows Success Criteria heading in goal.md template (redundant with Verification)
- [ ] `grep -n "when approved" skills/complete/SKILL.md` → shows approval gate on learnings (Step 4)
- [ ] `grep "Workflow Action Principle\|workflow-defined actions" skills/_shared/references/cli-interaction.md` → no matches (principle not yet documented)

**After implementation** (should pass / show presence):
- [ ] `grep -n "^## Success Criteria$" skills/create-slices/references/guidance.md` → no matches (consolidated into Verification)
- [ ] `grep -n "when approved" skills/complete/SKILL.md` → no approval gate on learnings — learnings are presented then written
- [ ] `grep "Workflow Action Principle\|workflow-defined actions" skills/_shared/references/cli-interaction.md` → shared principle documented
- [ ] `grep "Success Criteria.*Verification\|Verification" skills/create-slices/SKILL.md` → references updated to single "Verification" section name

### Tasks

- [ ] **Bug 1 — Redundant Success Criteria/Verification in create-slices goal template:** Read `skills/create-slices/references/guidance.md`. In the goal.md template, the `## Success Criteria` and `## Verification` sections are redundant in practice — real goal.md files restate the same content in both. Consolidate into a single `## Verification` section in `guidance.md`. Structure: checkable assertions first (checklist format: `- [ ] <What to run> — <expected outcome>`), then a narrative live-testing paragraph describing end-to-end validation. Verify content preservation by confirming every assertion and testing instruction from the original two sections appears in the merged result. Then update `skills/create-slices/SKILL.md` Step 6 — the paragraph that mentions "Success Criteria" and "Verification" — merge into a single guidance paragraph for "Verification" that covers both writing checkable assertions and describing live end-to-end testing.
- [ ] **Bug 2 — Unnecessary confirmation prompts:** Add a new `### Workflow Action Principle` subsection at the end of Section 5 ("Interaction Patterns by Role"), before `## 6. State Orientation`, in `skills/_shared/references/cli-interaction.md`. Also update the Table of Contents to include the new subsection anchor. Content: "Present what you're doing for visibility. Do not ask permission for actions the workflow defines (writing files, saving learnings, updating state). Only use AskUserQuestion for genuine decisions the user needs to make — approach choices, scope questions, architecture tradeoffs." All skills already load this reference.
- [ ] **Bug 3 — /complete asks to confirm learnings:** Edit `skills/complete/SKILL.md` Step 4. Change from "Present the draft. Iterate on corrections." to "Present the learnings for visibility, then write `completion/learnings.md`." Remove the approval gate ("when approved" pattern). Keep the presentation (user needs to see what was learned) but remove the approval loop.

### Verification

- Read complete SKILL.md and confirm no approval gate on learnings
- Read create-slices `references/guidance.md` and confirm single Verification section (no Success Criteria)
- Read create-slices SKILL.md and confirm references updated to single "Verification" section name

## Phase 2: Shared Output Templates

Create `skills/_shared/references/output-templates.md` with the shared Iteration Summary template. Completion Summary, Done Summary, and Context Load Summary stay inline in each skill — they are structurally divergent or too thin to benefit from extraction.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/_shared/references/output-templates.md` → "No such file"

**After implementation** (should pass / show presence):
- [ ] `cat skills/_shared/references/output-templates.md` → contains fenced code block template for: Iteration Summary
- [ ] Template uses `{placeholders}` with clear substitution instructions
- [ ] Template includes conditional-omission rules (e.g., "Omit **Expertise** if no section exists", `Phase {X} —` prefix conditional on implement-plan vs refine-* skills)

### Tasks

- [ ] Create `skills/_shared/references/output-templates.md` with the Iteration Summary Template — extracted from refine-plan (lines 251-278). Used by: refine-plan, refine-architecture, refine-slices, implement-plan. Include the `Phase {X} —` prefix as conditional (implement-plan uses it, refine-* skills don't). Exact fenced code block with `{placeholders}` for reviewer names, scores, issue table (severity, description, source, resolution), contradictions, USER_INPUT, RESEARCH_NEEDED, actions.
- [ ] Include: the fenced code block, substitution rules for each `{placeholder}`, conditional-omission rules, and a "Used by" list naming the consuming skills.
- [ ] Update `skills/_shared/references/README.md` to add a row to the existing `| File | Purpose |` table for `output-templates.md`.

### Verification

- Read both the extracted template in `output-templates.md` and the original inline version in refine-plan SKILL.md — confirm the fenced code block content is character-for-character identical (ignore surrounding context like section headings or notes)
- `wc -l skills/_shared/references/output-templates.md` — file is under 200 lines
- Each `{placeholder}` has clear substitution instructions

## Phase 3a: Iteration Loop + First Consumer

Update `iteration-loop.md` to reference the shared Iteration Summary template, then update refine-plan as the first consumer and verify the integration works before touching other skills.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "output-templates.md" skills/_shared/references/iteration-loop.md` → no matches

**After implementation** (should pass / show presence):
- [ ] `grep "output-templates.md" skills/_shared/references/iteration-loop.md` → references shared Iteration Summary template
- [ ] `grep "output-templates.md" skills/refine-plan/SKILL.md` → references shared template (inline copy removed)

### Tasks

- [ ] Update `skills/_shared/references/iteration-loop.md` to reference `output-templates.md` for the Iteration Summary Template, so skills that defer to the shared loop inherit the template.
- [ ] **refine-plan**: Replace inline Iteration Summary template with reference to shared template (source of truth moves to shared file). Keep Completion Summary inline.

### Verification

- `bun run check` — lint passes
- Read refine-plan SKILL.md and confirm Iteration Summary references shared template, inline Iteration Summary fenced code block is removed, Completion Summary remains inline
- Read iteration-loop.md and confirm it references output-templates.md

## Phase 3b: Remaining Skill Integration

Update remaining 6 skills to reference shared Iteration Summary template and add inline rigid templates for skill-specific outputs (Done Summary, Context Load Summary, Completion Summary stay inline per skill).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "output-templates.md" skills/refine-slices/SKILL.md` → no matches (refine-slices has no template references)
- [ ] `grep "output-templates.md" skills/complete/SKILL.md` → no matches

**After implementation** (should pass / show presence):
- [ ] `grep "output-templates.md" skills/refine-slices/SKILL.md` → references shared Iteration Summary template
- [ ] All 7 skills touched in Phases 3a+3b (refine-plan, refine-architecture, refine-slices, implement-plan, create-plan, create-slices, complete) have either rigid inline templates or references to shared templates for every structured output point
- [ ] No structured output point is described in prose only

### Tasks

- [ ] **refine-slices** (biggest gap — zero templates): Add reference to shared Iteration Summary template at the iteration display step. Add inline rigid Completion Summary template after the finalization step — include: Score Progression (before/after), Issues Resolved (count + key items), Slices Modified (list of changed slices with change type).
- [ ] **complete**: Convert prose Done Summary (Step 11) to inline rigid fenced-code-block template. Convert prose artifact load summary (Step 3) to inline rigid Context Load Summary template. Keep the signal tracking alert and no-divergence message as-is (already semi-rigid/rigid).
- [ ] **create-slices**: Convert prose Done Summary (Step 10 "Done Summary") to inline rigid fenced-code-block template. Convert semi-rigid context load summary (Step 2 "Load Context") to inline rigid template. Convert semi-rigid slice list proposal (Step 4 "Propose Slices") and progress indicator (Step 6 "Define Each Slice") to inline rigid fenced-code-block templates. Note: "Rigid" here means a fenced code block showing expected shape with `{placeholders}` — the skill adapts content to context (slice count, mode) while maintaining structural consistency.
- [ ] **create-plan**: Convert prose Done Summary (Step 8) to inline rigid fenced-code-block template. Convert semi-rigid context load summary (Step 3) to inline rigid template. Convert semi-rigid phase context header and progress indicator to inline rigid templates. Note: "Rigid" here means a fenced code block showing expected shape with `{placeholders}` — the skill adapts content to context while maintaining structural consistency.
- [ ] **implement-plan**: Replace inline Iteration Summary template with reference to shared template. Keep Completion Summary inline. Convert prose plan load summary (Step 1 #5) to a rigid inline template. Convert semi-rigid phase progress report (Step 3.6) to a rigid inline template.
- [ ] **refine-architecture**: Replace inline Iteration Summary template with reference to shared template. Keep Completion Summary and architecture-specific "Changes Summary" inline.

### Verification

Per-skill output point checklist (each must have rigid inline template or shared template reference):
- **refine-slices**: Iteration Summary (shared ref), Completion Summary (inline)
- **complete**: Done Summary (inline), Context Load Summary (inline), Signal Tracking Alert (unchanged — already rigid), No-Divergence Message (unchanged — already rigid)
- **create-slices**: Done Summary (inline), Context Load Summary (inline), Slice List Proposal (inline), Progress Indicator (inline)
- **create-plan**: Done Summary (inline), Context Load Summary (inline), Phase Context Header (inline), Progress Indicator (inline)
- **implement-plan**: Iteration Summary (shared ref), Completion Summary (inline), Plan Load Summary (inline), Phase Progress Report (inline)
- **refine-architecture**: Iteration Summary (shared ref), Completion Summary (inline), Changes Summary (inline)
- **refine-plan** (Phase 3a — already verified, included for completeness): Iteration Summary (shared ref), Completion Summary (inline)

Checks:
- Fresh-enumeration grep: `grep -n "^List:\|^Present:\|^Display:\|^Show:" skills/{create-plan,create-slices,complete,refine-slices}/SKILL.md` — confirm all matches are followed by or preceded by a rigid template, not prose only
- For each skill above, grep for structured output points and confirm each one either has an inline rigid template or references shared `output-templates.md`
- No skill has a PROSE-only structured output point remaining
- `bun run check` — lint passes
