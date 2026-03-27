# Plan: `/create-plan` Skill

## Overview

Build the `/create-plan` Claude Code skill — takes a slice or side quest goal and produces a complete `plan.md` in the exact format expected by `/refine-plan` and `/implement-plan`. Reads all available project context, asks targeted questions to fill gaps, and writes the plan.

Key insight from pre-work: both `/refine-plan` and `/implement-plan` expect the same format — single markdown file (under ~300 lines) or directory with `_overview.md` + numbered phase files. Each phase needs: clear objective, `[ ]` checkbox task list, success criteria/verification.

## Phase 1: Reference Files

Create reference files at `~/.claude/skills/create-plan/references/`.

### Tasks

- [ ] Create `references/formats.md` — state.md 4-section format and flow-log.jsonl entry format. Copy from existing skills. Sync comment referencing `.project/skill-conventions.md`.

- [ ] Create `references/plan-format.md` — the documented plan format convention derived from inspecting `/refine-plan` and `/implement-plan`. Must include:
  - Two plan types: single file (under ~300 lines) vs directory (`_overview.md` + `NN-phase-name.md`)
  - Phase structure: each phase needs objective, `[ ]` task list, verification section
  - Task checkbox semantics: `[ ]` pending, `[x]` complete
  - Self-containment: plan + codebase should be enough for reviewers and implementers
  - Goal clarity: explicit goal statement at top for `/refine-plan` to confirm with user
  - Slug derivation: kebab-case, 2-4 words, used for commit messages
  - Size guideline: single file if under ~300 lines, split to directory if larger
  - A concrete template for each type (single file and directory-based)

- [ ] Create `references/guidance.md` — conversation guidance:
  - Scope resolution: how to determine which slice/quest we're planning (state.md → argument → ask)
  - Context loading order: goal.md for scope, architecture/, conventions.md, learnings.md, sequencing.md, other slice goal.md files, exploration output
  - Gap-filling strategy: focus questions on what would make an implementation sub-agent uncertain
  - Phase design principles: each phase should be independently reviewable, have clear boundaries, and include verification that the implementing agent can execute
  - CLAUDE.md: no update needed (create-plan doesn't create new project-level files)
  - Graceful stop: (a) no plan written → don't touch state; (b) plan partially drafted but not written → don't touch state; (c) plan.md written → update state
  - When to split: if the drafted plan exceeds ~300 lines, proactively split into directory format

### Verification
- `ls ~/.claude/skills/create-plan/references/` shows formats.md, plan-format.md, guidance.md
- plan-format.md templates are compatible with how `/refine-plan` parses plans
- Each file under 3KB

## Phase 2: Write SKILL.md

Create `~/.claude/skills/create-plan/SKILL.md`.

### Tasks

- [ ] Create SKILL.md with YAML frontmatter:
  - `name: create-plan`
  - `description:` — what it does, when to invoke, trigger phrases. Mention outputs (plan.md). Note that idea.md + goal.md for the slice are required. Trigger phrases: 'create a plan', 'write a plan', 'plan this slice', 'let's plan', 'create plan', 'make a plan for'.

- [ ] Write the skill body with these steps:

  **Step 1 — Load References**
  Load `references/plan-format.md` and `references/guidance.md`.

  **Step 2 — Determine Scope**
  1. Check if an argument was passed (slice/quest name or path).
  2. If not, read `.project/state.md` to find the active slice.
  3. If still ambiguous, use AskUserQuestion to ask which slice/quest to plan.
  4. Read the scope's `goal.md`. If it doesn't exist, tell the user and stop.

  **Step 3 — Load Context**
  Read (in order, skipping what doesn't exist):
  1. `.project/idea.md`
  2. `.project/conventions.md`
  3. `.project/architecture/_overview.md` and other architecture files
  4. `.project/learnings.md`
  5. `.project/vertical-slices/sequencing.md` — for dependency and ordering context
  6. Other slice `goal.md` files — to understand what comes before/after
  7. Exploration output in the scope's `research/` and `brainstorm/` directories (if any)
  Present summary of what was loaded.

  **Step 4 — Draft Plan**
  1. Using the plan format template from plan-format.md, draft a plan for the scope.
  2. Break the work into phases. Each phase should be independently reviewable and include: objective, `[ ]` task list, verification steps.
  3. Focus verification steps on what the implementing agent can actually execute — run commands, check outputs, use browser tools, curl endpoints.
  4. If the draft exceeds ~300 lines, split into directory format proactively.

  **Step 5 — Fill Gaps**
  1. Present the draft to the user.
  2. Ask targeted questions about anything that would leave an implementation sub-agent uncertain. Focus on: ambiguous requirements, technology choices not covered in conventions, API designs not specified in architecture, and any "it depends" moments.
  3. Iterate until the user approves.
  4. Use AskUserQuestion for final approval: "Looks good — write it" / "I have more changes".

  **Step 6 — Write Plan**
  Write `plan.md` (or plan directory) to the scope's directory:
  - Single file: `.project/vertical-slices/NN-slice-name/plan.md`
  - Directory: `.project/vertical-slices/NN-slice-name/plan/` with `_overview.md` + phase files

  **Step 7 — Write Back State**
  Load `references/formats.md`. Update state.md and append to flow-log.jsonl. Set Next Step to `/refine-plan` on the plan just written.

  **Step 8 — Done Summary**
  Show: plan location, phase count, recommended next step (`/refine-plan`).

  **Error handling:** Retry failed Write calls once.

- [ ] Review SKILL.md size — must be under 500 lines

### Verification
- `wc -l ~/.claude/skills/create-plan/SKILL.md` — under 500 lines
- `head -6` — valid YAML frontmatter
- `ls ~/.claude/skills/create-plan/references/` — all three reference files exist

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer.**

Test in goodplan-2 (which now has idea.md, conventions.md, architecture/, and slices from the define-slices test run).

**Test 1 — Plan for first slice:**
- Run `/create-plan` with no args
- Verify it detects the first unplanned slice from state.md/sequencing.md
- Verify it loads all context and presents a summary
- Verify the draft plan follows the format from plan-format.md
- Verify each phase has objective, task list, and verification steps
- Verify plan.md is written to the correct slice directory
- Hand the plan to `/refine-plan` — verify it runs without format issues

**Test 2 — Plan with explicit scope:**
- Run `/create-plan` for a specific later slice
- Verify it reads that slice's goal.md and adjusts for dependencies on earlier slices

**Test 3 — No goal.md:**
- Run for a slice directory that has no goal.md
- Verify it tells the user and stops gracefully

## What to verify
- [ ] Scope resolution works (state.md inference, explicit argument, ask)
- [ ] All context loaded (idea, conventions, architecture, learnings, sequencing, exploration)
- [ ] Plan format matches what /refine-plan expects
- [ ] Each phase has objective, [ ] tasks, verification
- [ ] Gap-filling questions are targeted (not generic)
- [ ] Plan is self-contained (readable without external files)
- [ ] state.md and flow-log updated on completion
- [ ] /refine-plan can parse the output without manual edits
