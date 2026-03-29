# Plan: Skill Workflow Bugs & Output Consistency

## Overview

Fix 4 workflow bugs across goodplan skills and standardize output templates for consistent user-facing presentation. Part A fixes bugs (duplicate sections in create-slices, unnecessary confirmation prompts, /complete learnings gate, migration sibling file detection). Part B extracts shared output templates to `_shared/references/output-templates.md` and integrates rigid templates into skills that currently use prose or semi-rigid descriptions.

Key audit finding: refine-slices has **zero** output templates (no iteration summary, no completion summary). complete has 4 prose-described outputs. create-slices and create-plan use semi-rigid inline examples. These are the primary integration targets.

## Phase 1: Bug Fixes

Fix all 4 Part A bugs — 3 skill-file edits + 1 CLI code change + 1 shared reference update.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -n "AskUserQuestion" skills/complete/SKILL.md | grep -i "learn"` → shows AskUserQuestion gates on learnings (Step 4)
- [ ] `grep -c "Verification\|Success Criteria" skills/create-slices/SKILL.md` → shows both section names appearing
- [ ] `grep -r "validateSourcePath" src/core/rpc/migrate.ts` → validates paths exist but no sibling scanning logic

**After implementation** (should pass / show presence):
- [ ] `grep -n "AskUserQuestion" skills/complete/SKILL.md | grep -i "learn"` → no AskUserQuestion gate on learnings — learnings are presented then written
- [ ] `grep -c "Success Criteria" skills/create-slices/SKILL.md` → 0 (consolidated into Verification)
- [ ] `grep -r "scanSiblings\|siblingScan\|unknownSiblings" src/core/rpc/migrate.ts` → sibling detection logic exists
- [ ] `grep "present.*don.t ask\|workflow-defined actions" skills/_shared/references/cli-interaction.md` → shared principle documented

### Tasks

- [ ] **Bug 1 — Duplicate verification/success-criteria in create-slices:** Read `skills/create-slices/SKILL.md`. Find where both "Verification" and "Success Criteria" sections are defined in the slice goal template. Consolidate into a single "Verification" section. Update any references in `skills/refine-slices/SKILL.md` if it references the old section name.
- [ ] **Bug 2 — Unnecessary confirmation prompts:** Add a "Workflow Action Principle" section to `skills/_shared/references/cli-interaction.md`: "Present what you're doing for visibility. Do not ask permission for actions the workflow defines (writing files, saving learnings, updating state). Only use AskUserQuestion for genuine decisions the user needs to make — approach choices, scope questions, architecture tradeoffs." All skills already load this reference.
- [ ] **Bug 3 — /complete asks to confirm learnings:** Edit `skills/complete/SKILL.md` Step 4. Change from "Present the draft. Iterate on corrections." to "Present the learnings for visibility, then write `completion/learnings.md`." Remove the AskUserQuestion gate. Keep the presentation (user needs to see what was learned) but remove the approval loop.
- [ ] **Bug 4 — Migration sibling file detection:** In `src/core/rpc/migrate.ts`, after validating sourcePaths in answer submissions, add logic to scan each source directory for files/subdirectories not mentioned in the answers. If unknown siblings are found, emit a follow-up question asking the LLM whether they should be included. Add the sibling scan schema to `src/commands/global/migrate/schemas.ts`. Add unit tests for sibling detection in `tests/unit/rpc/migrate.test.ts`.

### Verification

- Run `bun run check` — type check and lint pass
- Run `bun test` — all tests pass including new sibling detection tests
- Read complete SKILL.md and confirm no AskUserQuestion on learnings
- Read create-slices SKILL.md and confirm single Verification section

## Phase 2: Shared Output Templates

Create `skills/_shared/references/output-templates.md` with rigid fenced-code-block templates for patterns shared across multiple skills.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/_shared/references/output-templates.md` → "No such file"

**After implementation** (should pass / show presence):
- [ ] `cat skills/_shared/references/output-templates.md` → contains fenced code block templates for: Iteration Summary, Completion Summary, Done Summary, Context Load Summary
- [ ] Each template uses `{placeholders}` with clear substitution instructions
- [ ] Templates include conditional-omission rules (e.g., "Omit **Expertise** if no section exists")

### Tasks

- [ ] Create `skills/_shared/references/output-templates.md` with these templates:
  - **Iteration Summary Template** — extracted from refine-plan (lines 251-278). Used by: refine-plan, refine-architecture, refine-slices, implement-plan. Include the `Phase {X} —` prefix as conditional (implement-plan uses it, refine-* skills don't). Exact fenced code block with `{placeholders}` for reviewer names, scores, issue table (severity, description, source, resolution), contradictions, USER_INPUT, RESEARCH_NEEDED, actions.
  - **Completion Summary Template (Refinement)** — extracted from refine-plan (lines 284-324). Used by: refine-plan, refine-architecture, refine-slices. Score progression table, per-iteration issue tables, remaining issues.
  - **Completion Summary Template (Implementation)** — extracted from implement-plan (lines 403-437). Used by: implement-plan. Phase table with iterations/scores/commits, verification evidence, key decisions, follow-up.
  - **Done Summary Template** — new template for create-plan, create-slices, complete. Fenced code block with fields: scope, artifacts written, recommended next step. Currently pure prose in all 3 skills.
  - **Context Load Summary Template** — standardize the "Loaded: [files]. Context: [summary]. Missing: [list]." pattern used semi-rigidly by create-plan, create-slices, and complete.
- [ ] Each template section includes: the fenced code block, substitution rules for each `{placeholder}`, conditional-omission rules, and a "Used by" list naming the consuming skills.

### Verification

- Confirm each template matches the existing rigid versions in refine-plan and implement-plan (no accidental content changes)
- File is under 500 lines (manageable for agent context)
- Each template has clear `{placeholder}` substitution instructions

## Phase 3: Per-Skill Template Integration

Update each skill's SKILL.md to reference shared templates from `output-templates.md` and add skill-specific rigid templates for unique outputs.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "output-templates.md" skills/refine-slices/SKILL.md` → no matches (refine-slices has no template references)
- [ ] `grep "output-templates.md" skills/complete/SKILL.md` → no matches

**After implementation** (should pass / show presence):
- [ ] `grep "output-templates.md" skills/refine-slices/SKILL.md` → references shared templates
- [ ] `grep "output-templates.md" skills/complete/SKILL.md` → references shared templates
- [ ] All 8 skills have either rigid inline templates or references to shared templates for every structured output point
- [ ] No structured output point is described in prose only

### Tasks

- [ ] **refine-slices** (biggest gap — zero templates): Add Output Templates section referencing shared Iteration Summary and Refinement Completion Summary. Add `Read output-templates.md` instruction at the iteration display step (currently just says "Display iteration summary to user"). Add a completion summary step that presents the Refinement Completion Summary template after the finalization step.
- [ ] **complete**: Replace prose Done Summary (Step 11) with reference to shared Done Summary Template. Replace prose artifact load summary (Step 3) with reference to shared Context Load Summary Template. Keep the signal tracking alert and no-divergence message as-is (already semi-rigid/rigid).
- [ ] **create-slices**: Replace prose Done Summary (Step 10) with reference to shared Done Summary Template. Replace semi-rigid context load summary (Step 2) with reference to shared Context Load Summary Template. Convert semi-rigid slice list proposal (Step 4) and progress indicator (Step 6) to inline rigid fenced-code-block templates.
- [ ] **create-plan**: Replace prose Done Summary (Step 8) with reference to shared Done Summary Template. Replace semi-rigid context load summary (Step 3) with reference to shared Context Load Summary Template. Convert semi-rigid phase context header and progress indicator to inline rigid templates.
- [ ] **implement-plan**: Replace inline Iteration Summary and Completion Summary templates with references to shared templates (they're currently duplicated — defined both inline and in implement-plan). Convert prose plan load summary (Step 1 #5) to a rigid inline template. Convert semi-rigid phase progress report (Step 3.6) to a rigid inline template.
- [ ] **refine-plan**: Replace inline Iteration Summary and Completion Summary templates with references to shared templates (source of truth moves to shared file).
- [ ] **refine-architecture**: Replace inline templates with references to shared templates. Keep the architecture-specific "Changes Summary" section that differs from the generic refinement completion summary — add it as a supplement to the shared template reference.
- [ ] **project-status**: Already fully rigid — no changes needed. Verify templates are still correct after other changes.
- [ ] Update `skills/_shared/references/iteration-loop.md` to reference `output-templates.md` for the Iteration Summary Template, so skills that defer to the shared loop inherit the template.

### Verification

- For each skill, grep for structured output points and confirm each one either has an inline rigid template or references shared `output-templates.md`
- No skill has a PROSE-only structured output point remaining
- `bun run install:skills` — install updated skills
- Run `/project-status` twice — confirm identical output structure (content may differ but format should match)
