# Plan: `/define-slices` Skill

## Overview

Build the `/define-slices` Claude Code skill — reads project context (idea, architecture, conventions, learnings, existing slices) and interactively defines an ordered set of vertical slices with concrete success criteria. Re-entrant: can add new slices or revise existing ones mid-project.

Simpler than `/define-architecture` — no multi-phase file generation. One main interactive loop: propose slices → iterate → write files.

## Phase 1: Reference Files

Create reference files at `~/.claude/skills/define-slices/references/`.

### Tasks

- [ ] Create `references/formats.md` — state.md 4-section format and flow-log.jsonl entry format (copy from existing skills, adapt scope values). Add sync comment referencing `.project/skill-conventions.md` as canonical source.

- [ ] Create `references/templates.md` — templates for the two output files:
  - `sequencing.md` template: ordered list with columns for sequence number, slice name, one-line description, dependencies, and rationale. Include a preamble section for overall sequencing rationale.
  - `goal.md` template: sections for What We're Building, Behavior (numbered steps), Success Criteria (concrete and verifiable — not "tests pass" but specific commands/actions and expected outcomes), Scope Boundaries (in/out).

- [ ] Create `references/guidance.md` — conversation guidance:
  - Context loading order and what to read
  - How to ground slice proposals in architecture (each slice should map to architecture subsystems/flows)
  - Success criteria quality bar: must be verifiable by running something (script, curl, browser, function call) — reject vague criteria like "works correctly" or "tests pass"
  - Re-entry handling: detect existing sequencing.md and goal.md files, offer to add/revise vs. start fresh
  - CLAUDE.md update: add sequencing.md reference to Project Context section (same 3-case logic as define-architecture)
  - Graceful stop cases: (a) no files written → don't touch state; (b) sequencing.md written but no goal.md files → state shows in-progress; (c) some goal.md files written → state lists what was written
  - Naming convention: `NN-kebab-name/` where NN is two-digit sequence number (01, 02, ...)

### Verification
- `ls ~/.claude/skills/define-slices/references/` shows formats.md, templates.md, guidance.md
- Each file is self-contained and under 3KB
- Templates match the structure in workflow.md

## Phase 2: Write SKILL.md

Create `~/.claude/skills/define-slices/SKILL.md`.

### Tasks

- [ ] Create SKILL.md with YAML frontmatter:
  - `name: define-slices`
  - `description:` — covers what it does, when to invoke, trigger phrases. Mention outputs (sequencing.md, goal.md files). Note `/define-architecture` prerequisite. Trigger phrases: 'define slices', 'break this into slices', 'what should we build first', 'let's plan the slices', 'define vertical slices', 'what's our build order'.

- [ ] Write the skill body with these steps:

  **Step 1 — Load References**
  Load `references/templates.md` and `references/guidance.md`.

  **Step 2 — Load Context**
  1. Read `.project/idea.md` — required. If absent, tell user to run `/start-project` first, stop.
  2. Read `.project/conventions.md` — required for tech stack context. If absent, suggest `/define-architecture` but proceed if user wants to.
  3. Read `.project/architecture/_overview.md` and other architecture files — for subsystem and flow context. If architecture/ is empty/absent, warn but proceed.
  4. Read `.project/learnings.md` if it exists.
  5. Check for existing slices: `ls .project/vertical-slices/sequencing.md .project/vertical-slices/*/goal.md 2>/dev/null`.
  Present summary: "Found: idea.md, conventions.md, N architecture files, [learnings.md]. Existing slices: [list or 'none']."

  **Step 3 — Re-entry Check**
  - No existing slices → proceed to Step 4.
  - Existing sequencing.md and/or goal.md files → list what was found. Use AskUserQuestion: "Want to add new slices to the existing set, revise existing slices, or start fresh?"
    - "Add" → load existing slices as context, propose only new slices
    - "Revise" → present existing slices for review, iterate on changes
    - "Start fresh" → proceed to Step 4 (existing files will be overwritten)

  **Step 4 — Propose Slices**
  1. Based on idea.md, architecture, and conventions, propose an initial set of slices. Ground each slice in specific architecture subsystems or flows. Order so each slice builds on the last and delivers testable end-to-end value.
  2. Present the proposed set as a numbered list with: name, one-line description, key dependencies, and brief rationale for ordering.
  3. Ask: "What needs changing? Add, remove, reorder, or rename slices. Or say 'looks good' to proceed to details."
  4. Iterate until the user approves the set.

  **Step 5 — Define Each Slice**
  For each slice in order:
  1. Draft the full goal.md using the template from references/templates.md.
  2. Focus especially on Success Criteria — each criterion must specify: what to run (command, script, browser action, API call) and what the expected outcome is. Reject vague criteria.
  3. Present the draft and ask for corrections.
  4. Iterate until satisfied.
  5. Create the directory (`mkdir -p .project/vertical-slices/NN-slice-name/`) and write goal.md with the Write tool.
  6. Show progress: "Defined N of M slices. Next: [next slice]."

  If the user says "that's enough" or "stop here" mid-slice:
  - Handle per graceful stop cases in guidance.md.

  **Step 6 — Write sequencing.md**
  Using the template from references/templates.md, write `.project/vertical-slices/sequencing.md` with the full ordered list, dependencies, and rationale.

  **Step 7 — CLAUDE.md Update**
  Add `sequencing.md` reference to CLAUDE.md Project Context section. Same 3-case logic as define-architecture (no file / no section / existing section). Re-load guidance.md before this step for the format.

  **Step 8 — Write Back State**
  Load `references/formats.md`. Update state.md and append to flow-log.jsonl. Set Next Step to the first slice's `/create-plan` (or `/explore` if the first slice needs exploration).

  **Step 9 — Done Summary**
  List all slices defined, recommend starting the first slice.

  **Error handling:** Retry failed Write calls once. If still failing, inform user and continue.

- [ ] Review SKILL.md size — must be under 500 lines

### Verification
- `wc -l ~/.claude/skills/define-slices/SKILL.md` — under 500 lines
- `head -6` — valid YAML frontmatter
- `ls ~/.claude/skills/define-slices/references/` — all three reference files exist

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer.**

Test in the goodplan-2 project (which already has idea.md, conventions.md, and architecture/ from the define-architecture test run).

**Test 1 — Full run:**
- Run `/define-slices` with no args
- Verify it reads all context and presents a summary
- Verify proposed slices are grounded in the architecture
- Verify success criteria are concrete (commands to run, expected output)
- Verify sequencing.md and all goal.md files are written
- Verify CLAUDE.md is updated with sequencing.md reference
- Verify state.md and flow-log updated

**Test 2 — Re-entry (add slices):**
- Run `/define-slices` again on the same project
- Verify it detects existing slices and offers add/revise/start-fresh
- Choose "Add" — verify it proposes only new slices and integrates with existing set
- Verify sequencing.md is updated (not duplicated)

**Test 3 — No architecture:**
- Run on a project with only idea.md (no conventions.md or architecture/)
- Verify it warns but proceeds
- Verify slices are still coherent despite missing architecture context

## What to verify
- [ ] Context summary shown before proposals
- [ ] Slices grounded in architecture subsystems/flows
- [ ] Success criteria are concrete (specific commands/actions + expected outcomes)
- [ ] sequencing.md has ordering rationale
- [ ] goal.md files written incrementally
- [ ] CLAUDE.md updated with sequencing.md reference
- [ ] Re-entry correctly detects existing slices
- [ ] state.md and flow-log updated on completion
