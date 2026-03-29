# Plan: `/define-slices` Skill

## Overview

Build the `/define-slices` Claude Code skill — reads project context (idea, architecture, conventions, learnings, existing slices) and interactively defines an ordered set of vertical slices with concrete success criteria. Re-entrant: can add new slices or revise existing ones mid-project.

Simpler than `/define-architecture` — no multi-phase file generation. One main interactive loop: propose slices → iterate → write files.

## Phase 1: Reference Files

Create reference files at `~/.claude/skills/define-slices/references/`.

### Tasks

- [x] Create `references/formats.md` — state.md 4-section format and flow-log.jsonl entry format (copy from existing skills, adapt scope values). Add sync comment referencing `.project/skill-conventions.md` as canonical source.

- [x] Create `references/guidance.md` — conversation guidance AND templates (single file to minimize Read calls):
  - Context loading order and what to read
  - How to ground slice proposals in architecture (each slice should map to architecture subsystems/flows)
  - Success criteria quality bar: must be verifiable by running something (script, curl, browser, function call) — reject vague criteria like "works correctly" or "tests pass"
  - Re-entry handling: detect existing sequencing.md and goal.md files, offer to add/revise vs. start fresh
  - CLAUDE.md update: add sequencing.md reference to Project Context section (same 3-case logic as define-architecture)
  - Graceful stop cases: (a) no files written → don't touch state; (b) sequencing.md written but no goal.md files → in-progress; (c) some goal.md files written → state lists what was written
  - Naming convention: `NN-kebab-name/` where NN is two-digit sequence number (01, 02, ...)
  - Templates section with two templates:
    - `sequencing.md` template: ordered list with columns for sequence number, slice name, one-line description, dependencies, and rationale. Include a preamble section for overall sequencing rationale.
    - `goal.md` template: sections for What We're Building, Behavior (numbered steps), Success Criteria (concrete and verifiable — not "tests pass" but specific commands/actions and expected outcomes), Scope Boundaries (in/out).

### Verification
- `ls ~/.claude/skills/define-slices/references/` shows formats.md, guidance.md
- Each file is self-contained and under 3KB
- Templates match the structure in workflow.md

## Phase 2: Write SKILL.md

Create `~/.claude/skills/define-slices/SKILL.md`.

### Tasks

- [x] Create SKILL.md with YAML frontmatter:
  - `name: define-slices`
  - `description:` — covers what it does, when to invoke, trigger phrases. Mention outputs (sequencing.md, goal.md files). Requires idea.md from `/start-project`. Note `/define-architecture` as recommended prerequisite (architecture files ground slice boundaries, but not strictly required). Trigger phrases: 'define slices', 'break this into slices', 'what should we build first', 'let's plan the slices', 'define vertical slices', 'what's our build order', 'slices', 'what should we build', 'add a slice', 'new slice'.

- [x] Write the skill body with these steps:

  **Step 1 — Load References**
  Load `references/guidance.md` (contains both conversation guidance and templates).

  **Step 2 — Load Context**
  1. Read `.project/idea.md` — required. If absent, tell user to run `/start-project` first, stop.
  2. Read `.project/conventions.md` — use tech stack and project structure to inform slice boundaries. Recommended for context — if absent, suggest `/define-architecture` but proceed without it. Both are valuable — conventions inform tech constraints and project structure; architecture files inform subsystem and flow boundaries.
  3. Read `.project/architecture/_overview.md` and other architecture files — for subsystem and flow context. If architecture/ is empty/absent, warn but proceed.
  4. Read `.project/learnings.md` if it exists.
  5. Check for existing slices: `ls .project/vertical-slices/sequencing.md .project/vertical-slices/*/goal.md 2>/dev/null`.
  Present summary: "Found: idea.md, conventions.md, N architecture files, [learnings.md]. Existing slices: [list or 'none']."

  **Step 3 — Re-entry Check**
  - No existing slices → proceed to Step 4.
  - Existing sequencing.md and/or goal.md files → list what was found. Use AskUserQuestion: "Want to add new slices to the existing set, revise existing slices, or start fresh?"
    - "Add" → read existing sequencing.md and goal.md files as context. Propose only new slices. New slices always get the next available NN prefix (don't try to insert between existing numbers). The ordering in sequencing.md is the source of truth for execution order, not the NN directory prefix. Merge new slices at appropriate positions in the existing ordering. Present the combined list for user approval. Rewrite sequencing.md with the merged list. Existing goal.md files are not modified unless user requests.
    - "Revise" → present existing slices for review. Before modifying any slice, check if it has downstream artifacts (`plan.md`, `plan-refined.md`, `refinement/`, `implementation/`). If so, warn the user that downstream work exists. Iterate on changes. Directories are never deleted — only sequencing.md is updated and goal.md files are overwritten.
    - "Start fresh" → proceed to Step 4 (existing files will be overwritten)

  **Step 4 — Propose Slices**
  1. Based on idea.md, architecture, and conventions, propose an initial set of slices. Ground each slice in specific architecture subsystems or flows. Order so each slice builds on the last and delivers testable end-to-end value.
  2. Present the proposed set as a numbered list with: name, one-line description, key dependencies, and brief rationale for ordering.
  3. Ask: "What needs changing? Add, remove, reorder, or rename slices. Or say 'looks good' to proceed to details."
  4. Iterate. When user is satisfied, use AskUserQuestion with options: "Looks good — proceed to details" / "I have more changes".

  **Step 5 — Write sequencing.md Draft**
  Using the sequencing.md template from guidance.md, write `.project/vertical-slices/sequencing.md` with the full ordered list, dependencies, and rationale.

  **Step 6 — Define Each Slice**
  Re-load `references/guidance.md` to ensure templates are in context.
  For each slice in order:
  1. Draft the full goal.md using the goal.md template from guidance.md.
  2. Focus especially on Success Criteria — each criterion must specify: what to run (command, script, browser action, API call) and what the expected outcome is. Reject vague criteria.
  3. Present the draft and ask for corrections.
  4. Iterate until satisfied.
  5. Create the directory and write goal.md:
     ```bash
     mkdir -p .project/vertical-slices/NN-slice-name/
     ```
     Write goal.md with the Write tool.
  6. Show progress: "Defined N of M slices. Next: [next slice]."

  If the user says "that's enough" or "stop here" mid-slice:
  - Load `references/formats.md` for state.md format.
  - Graceful stop cases: (a) no files written → don't touch state; (b) sequencing.md written but no goal.md files → update state to in-progress, Current Phase: `define-slices in-progress — stopped after writing sequencing.md`; (c) some goal.md files written → update state listing what was written, Current Phase: `define-slices in-progress — stopped after writing sequencing.md, [comma-separated list of goal.md files written]`.

  **Step 7 — Finalize sequencing.md**
  If any slice names, ordering, or dependencies changed during Step 6 iteration, rewrite sequencing.md to reflect the final state.

  **Step 8 — CLAUDE.md Update**
  Use the Read tool to re-load `references/guidance.md` to get the Project Context section format. Add sequencing.md reference to CLAUDE.md. Before adding, check if sequencing.md is already referenced (define-architecture may have added it conditionally) — if present, skip. Otherwise apply 3-case logic:
  1. No CLAUDE.md → create with Write tool.
  2. CLAUDE.md exists, no `## Project Context` section → append section with Edit tool.
  3. Existing `## Project Context` → extract old_string from heading through next `## ` or EOF, replace with Edit tool including the sequencing.md reference. Fall back to Write if Edit fails.

  **Step 9 — Write Back State**
  Load `references/formats.md`. (This is the normal completion path. The graceful stop cases in Step 6 exit before reaching Step 9, so the double load of formats.md never occurs in practice.) Update state.md and append to flow-log.jsonl with `"phase":"define-slices"` and `"scope":"project"`. Set Next Step to `/create-plan` for the first unplanned slice.

  **Step 10 — Done Summary**
  List all slices defined, recommend `/create-plan` for the first unplanned slice.

  **Error handling:** Retry failed Write calls once. If still failing, inform user and continue.

- [x] Review SKILL.md size — must be under 500 lines (129 lines)

### Verification
- `wc -l ~/.claude/skills/define-slices/SKILL.md` — under 500 lines
- `head -6` — valid YAML frontmatter
- `ls ~/.claude/skills/define-slices/references/` — formats.md and guidance.md exist

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

**Test 4 — Graceful stop:**
- Run `/define-slices`, define 2 of N slices, then say "stop here"
- Verify sequencing.md exists with all proposed slices
- Verify goal.md files exist only for the 2 defined slices
- Verify state.md reflects in-progress, listing what was written

## What to verify
- [x] Context summary shown before proposals
- [x] Slices grounded in architecture subsystems/flows
- [x] Success criteria are concrete (specific commands/actions + expected outcomes)
- [x] sequencing.md has ordering rationale
- [x] goal.md files written incrementally
- [x] CLAUDE.md updated with sequencing.md reference
- [x] Re-entry correctly detects existing slices
- [x] state.md and flow-log updated on completion
