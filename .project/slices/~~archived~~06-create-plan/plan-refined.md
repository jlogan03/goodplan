# Plan: `/create-plan` Skill

## Overview

Build the `/create-plan` Claude Code skill — takes a slice or side quest goal and produces a complete `plan.md` in the exact format expected by `/refine-plan` and `/implement-plan`. The process is deeply interactive: the agent asks questions to understand what needs to be built, researches dependencies, and iteratively builds the plan through conversation.

Key insight from pre-work: both `/refine-plan` and `/implement-plan` expect the same format — single markdown file (under ~300 lines) or directory with `_overview.md` + numbered phase files. Each phase needs: clear objective, `[ ]` checkbox task list, success criteria/verification.

### Shared Research Directory Convention

All three plan-lifecycle skills (`/create-plan`, `/refine-plan`, `/implement-plan`) share research artifacts:

- **Slice-level research**: `.project/vertical-slices/NN-slice-name/research/` — written by `/create-plan`, read by all three
- **Project-level research**: `.project/research/` — written by `/explore`, read by all three
- Before researching a topic, check both directories for existing answers. Reuse if still fresh (check version/date header). Only research what's missing or stale.

This slice updates `/refine-plan` and `/implement-plan` to use these directories instead of `/tmp/plan-research/`.

## Phase 1: Reference Files

Create reference files at `~/.claude/skills/create-plan/references/`.

### Tasks

- [x] Create `references/formats.md` — state.md 4-section format and flow-log.jsonl entry format. Copy from existing skills. Add a sync comment (a code comment noting the canonical source is `.project/skill-conventions.md`, so future editors know to keep them in sync).

- [x] Create `references/plan-format.md` — the documented plan format convention derived from inspecting `/refine-plan` and `/implement-plan`. Must include:
  - Two plan types: single file (under ~300 lines) vs directory (`_overview.md` + `NN-phase-name.md`)
  - Phase structure: each phase needs objective, `[ ]` task list, verification section
  - Task checkbox semantics: `[ ]` pending, `[x]` complete
  - Self-containment: plan + codebase should be enough for reviewers and implementers
  - Goal clarity: explicit goal statement at top for `/refine-plan` to confirm with user
  - Slug derivation: kebab-case, 2-4 words, used for commit messages
  - Size guideline: single file if under ~300 lines, split to directory if larger
  - A concrete template for each type (single file and directory-based)

- [x] Create `references/guidance.md` — conversation guidance:
  - Scope resolution: how to determine which slice/quest we're planning (state.md → argument → ask)
  - Context loading order: goal.md for scope, architecture/, conventions.md, learnings.md, sequencing.md, other slice goal.md files, exploration output
  - **Interactive Q&A strategy**: the plan-building process is conversation-driven. Start by understanding the goal, then ask questions to flesh out each phase. Follow-up on answers that raise new questions. Focus on what would make an implementation sub-agent uncertain: ambiguous requirements, technology choices, API designs, integration points, error handling strategy, testing approach.
  - **Research integration**: before proposing specific tools/libraries/versions, research them. Save research to slice's `research/` directory with a header template (`# <Topic>\n\nResearched: <date> | Source: <tool>\n\n---`). Check project-level `.project/research/` and slice-level research before spawning new research agents.
  - **Architectural change detection**: when to flag changes to the user (crosses system boundaries: new/removed subsystems, API changes between systems, communication patterns, data contracts) vs. when not to (internal implementation changes). Flag technical debt and propose refactors. Goal: keep the user's mental model of the architecture accurate and current.
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

- [x] Create SKILL.md with YAML frontmatter:
  - `name: create-plan`
  - `description:` — what it does, when to invoke, trigger phrases. Mention outputs (plan.md). Note that idea.md + goal.md for the slice are required. Trigger phrases: 'create a plan', 'write a plan', 'plan this slice', 'let's plan', 'create plan', 'make a plan for'.

- [x] Write the skill body with these steps:

  **Step 1 — Load References**
  Load `references/plan-format.md` and `references/guidance.md`.

  **Step 2 — Determine Scope**
  1. Check if an argument was passed. Derivation algorithm: if argument is a path, use its parent directory as scope (including paths under `.project/side-quests/`). If argument is a slice name, resolve via `.project/vertical-slices/`. If argument matches a side quest name, resolve via `.project/side-quests/`. If no argument, read `.project/state.md` for the active slice.
  2. If no argument and no state.md (or state.md has no active slice), scan `.project/vertical-slices/` for the first slice directory that has `goal.md` AND (`explore-complete.md` or `explore-skipped.md`) but no `plan.md`. If none found, fall back to slices with `goal.md` but no explore marker, and use AskUserQuestion to confirm ("This slice hasn't completed exploration — plan it anyway?"). If still ambiguous, use AskUserQuestion to ask which slice/quest to plan.
  3. Read the scope's `goal.md`. If it doesn't exist, tell the user and stop.
  4. **Re-entry check**: if `plan.md` (or `plan/` directory) already exists in the scope directory, use AskUserQuestion: "A plan already exists. Overwrite / Revise existing / Cancel". If "Revise existing": load existing plan, present it, allow targeted edits. Check for downstream refinement/implementation artifacts before overwriting.

  **Step 3 — Load Context**
  Read (in order, skipping what doesn't exist):
  1. `.project/idea.md`
  2. `.project/conventions.md`
  3. Read all `.md` files in `.project/architecture/` (starting with `_overview.md`). If more than 8 architecture files, read `_overview.md` and `conventions.md` in full, first 30 lines of each remaining file.
  4. `.project/learnings.md`
  5. `.project/vertical-slices/sequencing.md` — for dependency and ordering context
  6. Other slice `goal.md` files — to understand what comes before/after
  7. Existing research: check `.project/research/` (project-level) and the scope's `research/` directory for any prior research
  8. Exploration output in the scope's `brainstorm/` directories (if any)
  Present summary: "Loaded: idea.md, conventions.md, N architecture files, M research files. Slice context: [goal.md summary]. Missing: [list or 'nothing']."

  **Step 4 — Interactive Planning**
  This is the core of the skill — a structured conversation loop:

  (a) **Restate & confirm**: Restate the goal from goal.md and summarize loaded context. Use AskUserQuestion to confirm understanding ("Does this capture what we're planning?" / "I have corrections"). Only after confirmation, ask initial clarifying questions about anything unclear or ambiguous.

  (b) **Propose phase breakdown**: Present phase names and one-line objectives. Use AskUserQuestion: "Does this phasing make sense?" / "I have changes". If user has changes, apply them and re-present the updated breakdown for approval. Iterate until approved.

  (c) **Per-phase deep dive**: For each phase, ask targeted questions (implementation approach, technology choices, integration points, error handling, testing strategy). If answers raise new questions, follow up immediately. After completing each phase's deep dive, show progress ("Phase 2 of 5 fleshed out. Moving to Phase 3: [name].") and offer a natural pause point. **Research dependencies** as they surface: spawn a sub-agent using the Agent tool to research tools, libraries, APIs, or Docker images. The sub-agent prompt should include: the topic, instruction to use WebSearch and Context7 MCP tools, the output format (concise summary with version/date header), and where to save (scope's `research/` directory). Check existing research directories first — only research what's new or stale. If no useful results, note the gap and flag it during the readiness gate. After each sub-agent returns, present a brief findings summary to the user before incorporating into the plan.

  (c2) **Architectural change detection**: Throughout Steps 4a-4c, compare the emerging plan against the loaded architecture files. When a phase would require changes that cross system boundaries — new or removed subsystems, changed APIs between subsystems, altered communication patterns, new integration points, or modified data contracts — flag it explicitly to the user: "This phase would change the architecture: [describe what changes and why]." Use AskUserQuestion to confirm the user wants that change before incorporating it into the plan. Changes that are purely internal to a subsystem's implementation (refactoring internals, adding private helpers, changing algorithms) do NOT need flagging unless the user has specified otherwise. Also proactively flag emerging technical debt: if the plan takes shortcuts, defers refactoring, or builds on a pattern that won't scale, tell the user. Propose refactors when appropriate. The goal is to keep the user's mental model of the architecture accurate and up-to-date, so they can reason about the system's strengths, weaknesses, and future directions.

  (d) **Readiness gate**: Re-load `references/guidance.md` (may have left context during a long interactive session). Once all phases have been discussed, check: every phase has an objective, task list, verification steps, and no open questions. If any architectural changes were flagged and approved, note them in the plan so `/refine-plan` and `/implement-plan` reviewers are aware. Use AskUserQuestion: "Ready to draft the plan?" / "More to discuss".

  **Graceful stop (Steps 4-6):** Trigger phrases: "that's enough", "stop here", "let's stop". If user stops mid-conversation: (a) if no plan.md written (regardless of research files) → reload `formats.md` (may have left context during a long interactive session), don't touch state.md (research files alone don't change file-existence state); (b) if plan.md written → reload `formats.md` (may have left context during a long interactive session), normal state update (Step 7).

  **Step 5 — Draft and Approve**
  1. Re-load `references/plan-format.md` (session may be long). Assemble the complete plan from the conversation into this format.
  2. Present the draft to the user. For plans with 4+ phases, present overview + first 2 phases, then remaining phases (or let user request one phase at a time).
  3. If the draft exceeds ~300 lines, split into directory format proactively.
  4. Iterate on corrections.
  5. Use AskUserQuestion for final approval: "Looks good — write it" / "I have more changes".

  **Step 6 — Write Plan**
  Write `plan.md` (or plan directory) to the scope's directory:
  - Single file: `.project/vertical-slices/NN-slice-name/plan.md`
  - Directory: `.project/vertical-slices/NN-slice-name/plan/` with `_overview.md` + phase files

  **Step 7 — Write Back State**
  Re-load `references/formats.md` (session may be long). Update state.md and append to flow-log.jsonl. Set Next Step to `/refine-plan` on the plan just written.

  **Step 8 — Done Summary**
  Show: plan location, phase count, research files written, recommended next step (`/refine-plan`).

  **Error handling:** Retry failed Write calls once.

- [x] Review SKILL.md size — must be under 500 lines

### Verification
- `wc -l ~/.claude/skills/create-plan/SKILL.md` — under 500 lines
- `head -6` — valid YAML frontmatter
- `ls ~/.claude/skills/create-plan/references/` — all three reference files exist
- Confirm all `references/` file paths in SKILL.md match files created in Phase 1

## Phase 3: Move `/refine-plan` and `/implement-plan` from `/tmp/` to Slice Directories

> **Note:** Verify line numbers against the actual file before each edit, as earlier changes may shift them.

Both skills currently write to `/tmp/plan-research/` (research) and `/tmp/plan-review/` (review iterations). Move all persistent artifacts to the slice directory. workflow.md already defines `refinement/` and `implementation/` directories per-slice for exactly this purpose.

### What moves where

| Current location | New location | Skill |
|---|---|---|
| `/tmp/plan-research/<topic>.md` | `<scope_dir>/research/<topic>.md` | Both |
| `/tmp/plan-research/_codebase-context.md` | `<scope_dir>/research/_codebase-context.md` | Both |
| `/tmp/plan-review/<slug>/iter-N/` | `<scope_dir>/refinement/round-N/` | refine-plan |
| `/tmp/plan-review/<slug>/iter-N/` | `<scope_dir>/implementation/phase-N/iteration-N/` | implement-plan |

Directory names align with workflow.md conventions: `round-N` for refinement, `phase-N/iteration-N` for implementation.

Iterations are no longer deleted — preserved in-slice for cross-session continuity. **Remove ALL `run_dir` cleanup** since iterations are now persistent.

### Pre-edit Safety

- [x] Before editing, create a git commit of the current state of both skills (`~/.claude/skills/refine-plan/` and `~/.claude/skills/implement-plan/`). Edit one skill completely before starting the other. Run the verification grep between skills to catch inconsistencies.

### Tasks — `/refine-plan`

- [x] Update `refine-plan/SKILL.md` — every `/tmp/` and cleanup reference:
  - **Line ~73** (the line containing `run_dir="/tmp/plan-review/..."`): change to `run_dir="<scope_dir>/refinement"`
  - **Line ~74** (the line containing `mkdir -p "$run_dir" /tmp/plan-research`): change to `mkdir -p "$run_dir" <scope_dir>/research`
  - **Line ~76** (the line containing `find /tmp/plan-review -maxdepth 1 ... -exec rm -rf`): **remove** entirely (no more cleanup)
  - Rename all `iter-{N}` references to `round-{N}` in mkdir and directory reference patterns (aligns with workflow.md convention for refinement)
  - **Line ~146** (the line containing `/tmp/plan-research/<topic>.md`): change to `<scope_dir>/research/<topic>.md`
  - **Line ~179** (the line containing `rm -rf "$run_dir"` in Step 5): **remove** entirely
  - Add scope derivation after plan slug derivation (Step 0): Derive scope directory: `scope_dir=$(dirname "<plan_path>")`

- [x] Update `refine-plan/references/dependency-research.md`:
  - **Line ~28** (the line containing `/tmp/plan-research/`): replace with: "Check existing `<scope_dir>/research/` and `.project/research/` files before spawning research."
  - **Line ~33** (the line containing `/tmp/plan-research/<dependency-name>`): change output path to `<scope_dir>/research/...`

- [x] Update `refine-plan/references/codebase-context-discovery.md`:
  - **Line ~40** (the line containing `/tmp/plan-research/_codebase-context.md`): change to `<scope_dir>/research/_codebase-context.md`
  - **Line ~50** (the "Add the codebase context file path" instruction): update path reference

- [x] Update `refine-plan/references/shared-preamble.md`:
  - **Line ~62** (inside the fenced code block, the RESEARCH_NEEDED sentence mentioning "writes docs to `/tmp/plan-research/`"): change path to `<scope_dir>/research/`

### Tasks — `/implement-plan`

- [x] Update `implement-plan/SKILL.md` — every `/tmp/` and cleanup reference:
  - **Line ~78** (the line containing `run_dir="/tmp/plan-review/..."`): change to `run_dir="<scope_dir>/implementation"`
  - **Line ~79** (the line containing `mkdir -p "$run_dir" /tmp/plan-research`): change to `mkdir -p "$run_dir" <scope_dir>/research`
  - **Line ~81** (the line containing `find /tmp/plan-review -maxdepth 1 ... -exec rm -rf`): **remove** entirely
  - Rename all `iter-{N}` references to `phase-{X}/iteration-{N}` in mkdir and directory reference patterns (aligns with workflow.md convention for implementation)
  - **Line ~163** (the line containing `/tmp/plan-research/<topic>.md`): change to `<scope_dir>/research/<topic>.md`
  - **Line ~251** (the line containing `rm -rf "$run_dir"` in Step 4.2 cleanup): **remove** entirely
  - **Line ~262** (the line containing `rm -rf "$run_dir"` in incomplete exit handler): **remove** entirely
  - Add scope derivation after plan slug derivation (Step 1): Derive scope directory: `scope_dir=$(dirname "<plan_path>")`

- [x] Update `implement-plan/references/dependency-research.md`:
  - **Line ~28** (the line containing `/tmp/plan-research/`): replace with: "Check existing `<scope_dir>/research/` and `.project/research/` files before spawning research."
  - **Line ~33** (the line containing `/tmp/plan-research/<dependency-name>`): change output path to `<scope_dir>/research/...`

- [x] Update `implement-plan/references/codebase-context-discovery.md`:
  - **Line ~40** (the line containing `/tmp/plan-research/_codebase-context.md`): change to `<scope_dir>/research/_codebase-context.md`
  - **Line ~50** (the "Add the codebase context file path" instruction): update path reference

- [x] Update `implement-plan/references/shared-preamble.md`:
  - **Line ~55** (inside the fenced code block, the RESEARCH_NEEDED sentence mentioning "writes docs to `/tmp/plan-research/`"): change path to `<scope_dir>/research/`

- [x] Verify both skills' sub-agent prompts use `{research_file_paths}` placeholders (already clean — no `/tmp/` paths to change). The shared preambles are the files that need path updates and are covered above

### Tasks — Architectural Awareness in `/implement-plan`

- [x] Update `implement-plan/SKILL.md` to add architectural change detection during implementation:
  - In Step 3.2 (implementation-review cycle), after the implementation sub-agent returns: if the implementation required changes that cross system boundaries (new/removed subsystems, API changes between systems, altered communication patterns, new data contracts), the implementation agent should flag these in its report under a `## Architectural Changes` section.
  - The orchestrator (implement-plan) should present any flagged architectural changes to the user via AskUserQuestion before proceeding to review: "Implementation required these architectural changes: [list]. Approve / Discuss / Revert and try different approach".
  - Also flag emerging technical debt: if the implementation takes shortcuts that will need cleanup, add a `## Technical Debt` section to the implementation report. Present to user as informational — no approval gate needed, but the user should be aware.
  - Update the implementation sub-agent prompt template in `references/sub-agent-prompts.md` to instruct the implementation agent to: (a) read architecture files at the start of each phase, (b) compare its changes against the architecture, (c) report architectural changes and technical debt in its result.

### Verification
- `grep -r '/tmp/plan-research' ~/.claude/skills/refine-plan/ ~/.claude/skills/implement-plan/` returns no matches
- `grep -r '/tmp/plan-review' ~/.claude/skills/refine-plan/ ~/.claude/skills/implement-plan/` returns no matches
- `grep -r 'rm -rf.*run_dir\|find.*-exec rm' ~/.claude/skills/refine-plan/ ~/.claude/skills/implement-plan/` returns no matches
- `grep -r '/tmp/' ~/.claude/skills/refine-plan/ ~/.claude/skills/implement-plan/` returns no matches (broad catch-all)
- Both skills derive scope directory from plan path correctly
- Research files saved to `<scope_dir>/research/`
- Refinement iterations in `refinement/round-N/`, implementation in `implementation/phase-N/iteration-N/`
- Both skills check project-level `.project/research/` before spawning new research agents
- **Functional smoke test**: run `/refine-plan` on an existing plan after changes and confirm no path errors

## Phase 4: Manual End-to-End Test

**This phase is a manual test run by the developer.**

Test in goodplan-2 (which has idea.md, conventions.md, architecture/, and slices).

**Test 1 — Full interactive run:**
- Run `/create-plan` with no args
- Verify it detects the first unplanned slice
- Verify it asks clarifying questions before drafting (not just dump-and-ask)
- Verify it researches dependencies when they come up in conversation
- Verify research files are saved to the slice's `research/` directory
- Verify the final plan follows plan-format.md
- Hand the plan to `/refine-plan` — verify it runs without format issues
- Verify `/refine-plan` finds and reuses the research from `/create-plan`

**Test 2 — Plan with existing research:**
- Add a research file manually to `.project/research/` or the slice's `research/`
- Run `/create-plan` — verify it finds and uses existing research instead of re-researching

**Test 3 — No goal.md:**
- Run for a slice directory that has no goal.md
- Verify it tells the user and stops gracefully

**Test 4 — Side quest invocation:**
- Create a side quest directory with a `goal.md` if one doesn't exist
- Run `/create-plan` targeting a side quest in `.project/side-quests/<name>/`
- Verify scope derivation works for non-numbered directories

**Note:** Directory-format plan output (auto-split when >300 lines) should also be verified if a sufficiently large plan is encountered during testing.

## What to verify
- [x] Scope resolution works (state.md inference, explicit argument, ask)
- [x] Interactive Q&A drives the plan (not just draft-then-present)
- [x] Follow-up questions arise naturally from answers
- [x] Dependencies are researched and saved to slice's research/ directory
- [x] Existing research (project-level and slice-level) is found and reused
- [x] Plan format matches what /refine-plan expects
- [x] Each phase has objective, [ ] tasks, verification
- [x] /refine-plan reads research from slice directory (not /tmp)
- [x] /implement-plan reads research from slice directory (not /tmp)
- [x] Re-entry check works (existing plan.md prompts overwrite/revise/cancel)
- [x] Side quest scope derivation works
- [x] state.md and flow-log updated on completion
