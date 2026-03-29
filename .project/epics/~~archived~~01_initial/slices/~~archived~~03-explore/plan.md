# Plan: `/explore` Skill

## Overview

Build the `/explore` Claude Code skill — an iterative brainstorm/research/prototype loop that can be scoped to the whole project, a specific slice, or a side quest. The user picks a mode each iteration (Research, Brainstorm, or Prototype), explores until satisfied, then exits and writes `explore-complete.md`.

This is the most conversational skill in the suite. It doesn't apply a state machine or produce a structured report — it facilitates open-ended investigation and captures whatever emerges.

## Important Context

**Skills are self-contained.** The skill runs in arbitrary target repos. All logic it needs at runtime must be embedded in the skill's own `references/` directory.

**Scope determination (Option C from goal.md):**
1. Explicit argument (e.g. `/explore vertical-slices/03-explore`) → use that, ignore state.md
2. Active slice/quest in state.md → use that scope
3. No active scope → project level
4. Always announce the inferred scope and confirm before proceeding

**Scope path mapping:**

| Scope | research/ path | brainstorm/ path | explore-complete.md |
|---|---|---|---|
| Project | `.project/research/` | `.project/brainstorm/` | `.project/explore-complete.md` |
| Slice | `.project/vertical-slices/<name>/research/` | `.project/vertical-slices/<name>/brainstorm/` | `.project/vertical-slices/<name>/explore-complete.md` |
| Side quest | `.project/side-quests/<name>/research/` | `.project/side-quests/<name>/brainstorm/` | `.project/side-quests/<name>/explore-complete.md` |

**Three modes:**
- **Research** — user names topics → sub-agents investigate in parallel → each writes `research/<topic>.md`
- **Brainstorm** — interactive conversation → Claude captures output to `brainstorm/<topic>.md`
- **Prototype** — project-level only; interactive session to try an approach (UI mockup, algorithm, integration); output goes to `.project/prototypes/<name>/` with a `summary.md`

**Prototype mode is project-level only.** If the scope is a slice or side quest, offer only Research and Brainstorm. If the user asks for a prototype, explain that prototyping is project-level and offer to switch scope or skip it.

**Skip option:** Before entering the loop, offer to skip exploration entirely (write `explore-skipped.md` with a brief reason). Use this when the user already has enough context to move directly to planning or architecture.

**Reference artifacts in this repo (implementer context only):**
- `workflow.md` — full workflow, scope path mapping, file structure
- `.project/skill-conventions.md` — state.md and flow-log.jsonl formats
- `~/.claude/skills/start-project/SKILL.md` — style reference
- `~/.claude/skills/project-status/SKILL.md` — style reference
- `.project/vertical-slices/03-explore/goal.md` — full goal for this skill

---

## Phase 1: Write `references/explore-logic.md`

Embed the path mapping, output templates, and research sub-agent behavior so SKILL.md stays lean.

### Tasks

- [ ] Create `~/.claude/skills/explore/references/explore-logic.md` containing:

  **Scope path mapping table** (project / slice / side-quest → research/, brainstorm/, explore-complete.md, explore-skipped.md paths)

  **explore-complete.md template:**
  ```markdown
  # Explore Complete

  ## Scope
  <project-level | vertical-slices/<name> | side-quests/<name>>

  ## What Was Explored
  <Bullet list of topics researched and/or brainstormed>

  ## Key Conclusions
  <What we learned, decisions made, open questions that remain>

  ## Artifacts
  <List of files written: research/<topic>.md, brainstorm/<topic>.md, prototypes/<name>/>
  ```

  **explore-skipped.md template:**
  ```markdown
  # Explore Skipped

  ## Scope
  <scope>

  ## Reason
  <Why exploration was skipped — what context already exists>
  ```

  **Research mode behavior:**
  - Ask the user: "What topics do you want to research? List them and I'll investigate in parallel."
  - For each topic, spawn a sub-agent (`model: "opus"`) with instructions to:
    - Search the codebase (Grep/Glob/Read) for relevant existing code or patterns
    - Use WebSearch or Context7 for external knowledge (libraries, APIs, domain concepts)
    - Write findings to `<research-path>/<topic-slug>.md` with a summary at the top
  - After all sub-agents return, briefly summarize findings to the user

  **Brainstorm mode behavior:**
  - Ask the user: "What do you want to explore or think through?"
  - Have an open conversation — ask follow-up questions, surface trade-offs, explore options
  - At a natural stopping point, offer to write up what was discussed
  - Write a structured summary to `<brainstorm-path>/<topic-slug>.md` capturing: options considered, trade-offs, decision made (if any), open questions

  **Prototype mode behavior (project-level only):**
  - Ask: "What do you want to prototype? Describe the approach."
  - Create directory `.project/prototypes/<name>/`
  - Run the session interactively — write prototype files into that directory
  - On completion, write `summary.md` in the prototype directory: what was tried, what was learned, verdict (promising / not worth pursuing / needs more exploration)

  **state.md and flow-log.jsonl formats** — embed the same format as in project-status/references/status-logic.md (so this skill is independently self-contained):
  - state.md 4-section format
  - flow-log.jsonl entry format with timestamp generation command

- [ ] Keep under 3KB — this file is a reference, not documentation

### Success Criteria
- `references/explore-logic.md` exists and is self-contained
- Path mapping covers all three scope types
- Both output templates are present
- Research, brainstorm, and prototype behaviors are clearly specified
- Under 3KB

### Verification
- `wc -c ~/.claude/skills/explore/references/explore-logic.md` — confirm under 3072 bytes
- Read the file: could an implementer follow it to implement each mode correctly?

---

## Phase 2: Write SKILL.md

Write the skill at `~/.claude/skills/explore/SKILL.md`. Read `~/.claude/skills/start-project/SKILL.md` and `~/.claude/skills/project-status/SKILL.md` as style references.

### Tasks

- [ ] Create `~/.claude/skills/explore/SKILL.md` with YAML frontmatter:
  - `name: explore`
  - `description:` — cover what it does AND when to invoke it. E.g., "Run an iterative research/brainstorm/prototype loop scoped to the project, a slice, or a side quest. Use when you need to investigate unknowns, explore options, or try approaches before committing to a plan or architecture."

- [ ] Write the skill body with these steps in order:

  **Step 1 — Load explore logic**
  Read `references/explore-logic.md` using the Read tool. Use the path mapping and templates from this file throughout.

  **Step 2 — Determine scope**
  - If an argument was passed (e.g. `/explore vertical-slices/03-explore`), use it directly
  - Otherwise, read `.project/state.md`. If Active Slice is set (not "none"), use that as the scope
  - Otherwise, scope is project-level
  - Announce: "Scope: **<scope>**. Continuing?" — wait for confirmation before proceeding

  **Step 3 — Offer skip**
  Ask: "Do you already have enough context to skip exploration and move straight to planning? If so, I'll write `explore-skipped.md` with your reasoning."
  - If yes: ask for the reason, write `explore-skipped.md` using the template, update state.md and flow-log.jsonl, stop
  - If no: continue to the loop

  **Step 4 — Exploration loop**
  Each iteration:
  1. Offer mode selection. For project-level scope, offer all three: **Research**, **Brainstorm**, **Prototype**. For slice/quest scope, offer only **Research** and **Brainstorm**. If the user asks for Prototype at slice/quest scope, explain it's project-level only.
  2. Run the selected mode as specified in `references/explore-logic.md`
  3. After each mode completes, ask: "Keep exploring, or are we done?"
     - "Keep exploring" → loop back to step 1 of this iteration
     - "Done" → exit loop, proceed to Step 5

  **Step 5 — Write explore-complete.md**
  Using the template from `references/explore-logic.md`, write `explore-complete.md` to the correct path for the active scope. Include:
  - What was explored (list of research topics and brainstorm sessions)
  - Key conclusions and decisions
  - List of artifact files written
  Use the Write tool.

  **Step 6 — Write back state**
  Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`
  Update `.project/state.md` using the 4-section format from `references/explore-logic.md`. Set:
  - Current Phase: `explore complete — <brief summary>`
  - Active Slice: unchanged from before
  - Work Stack: unchanged
  - Next Step: appropriate recommendation based on scope (e.g., `/define-architecture` for project-level, `/create-plan` for slice)
  Append to `.project/flow-log.jsonl`:
  ```bash
  echo '{"ts":"<timestamp>","phase":"explore","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
  ```

- [ ] Review SKILL.md size — must be under 500 lines

### Success Criteria
- `~/.claude/skills/explore/SKILL.md` exists with valid YAML frontmatter
- `~/.claude/skills/explore/references/explore-logic.md` exists
- Scope determination handles all three cases: explicit arg, state.md active slice, project-level fallback
- Prototype mode is only offered at project-level
- Skip path writes `explore-skipped.md` and stops cleanly
- Exit path writes `explore-complete.md` to the correct directory
- State and flow-log are updated on exit (both skip and complete paths)
- SKILL.md is under 500 lines

### Verification
- `wc -l ~/.claude/skills/explore/SKILL.md` — confirm under 500 lines
- `head -6 ~/.claude/skills/explore/SKILL.md` — confirm valid YAML frontmatter
- `ls ~/.claude/skills/explore/references/` — confirm explore-logic.md exists
- Read SKILL.md top-to-bottom: does each step unambiguously tell Claude what to do?

---

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer — not an autonomous task.**

### How to run

Run `/explore` in this repo twice:

**Test 1 — Project-level, skip path:**
- Run with no args and no active slice in state.md
- Confirm it announces "project-level" scope
- Choose to skip — provide a reason
- Verify `explore-skipped.md` was written at `.project/explore-skipped.md`

**Test 2 — Slice scope, full loop:**
- Set state.md Active Slice to `vertical-slices/03-explore`
- Run `/explore` with no args
- Confirm it announces the slice scope
- Run one Research iteration (pick a topic) and one Brainstorm iteration
- Exit and verify `explore-complete.md` written to `.project/vertical-slices/03-explore/explore-complete.md`

### What to verify
- [ ] Scope announcement is clear and confirmed before proceeding
- [ ] Skip path: `explore-skipped.md` written to correct location, state.md and flow-log updated
- [ ] Research mode: sub-agent spawned, output written to correct `research/` path
- [ ] Brainstorm mode: conversation captured, written to correct `brainstorm/` path
- [ ] Prototype mode offered at project-level, not offered at slice scope
- [ ] `explore-complete.md` written to correct location with useful summary
- [ ] state.md and flow-log.jsonl updated correctly on exit

### Verification commands
- `cat .project/explore-skipped.md` — check format matches template
- `ls .project/vertical-slices/03-explore/` — confirm explore-complete.md, research/, brainstorm/ exist
- `tail -3 .project/flow-log.jsonl` — confirm two new entries (one per test run)
