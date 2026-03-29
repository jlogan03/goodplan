# Plan: `/explore` Skill

Status: ✅ COMPLETE (Phases 1–2)
Completed: 2026-03-15
Note: Phase 3 is a manual end-to-end test to be run by the developer.

## Overview

Build the `/explore` Claude Code skill — an iterative brainstorm/research/prototype loop that can be scoped to the whole project, a specific slice, or a side quest. The user picks a mode each iteration (Research, Brainstorm, or Prototype), explores until satisfied, then exits and writes `explore-complete.md`.

This is the most conversational skill in the suite. It doesn't apply a state machine or produce a structured report — it facilitates open-ended investigation and captures whatever emerges.

## Important Context

**Skills are self-contained.** The skill runs in arbitrary target repos. All logic it needs at runtime must be embedded in the skill's own `references/` directory.

**Scope determination (Option C from goal.md):**
1. Explicit argument (e.g. `/explore vertical-slices/03-explore`) → use that, ignore state.md
2. Work Stack top in state.md → use that scope
3. Active slice/quest in state.md → use that scope
4. No active scope → project level
5. Always announce the inferred scope and confirm before proceeding

**Scope path mapping:**

| Scope | research/ path | brainstorm/ path | prototypes/ path | explore-complete.md |
|---|---|---|---|---|
| Project | `.project/research/` | `.project/brainstorm/` | `.project/prototypes/<name>/` | `.project/explore-complete.md` |
| Slice | `.project/vertical-slices/<name>/research/` | `.project/vertical-slices/<name>/brainstorm/` | N/A | `.project/vertical-slices/<name>/explore-complete.md` |
| Side quest | `.project/side-quests/<name>/research/` | `.project/side-quests/<name>/brainstorm/` | N/A | `.project/side-quests/<name>/explore-complete.md` |

**Three modes:**
- **Research** — user names topics → sub-agents investigate in parallel → each writes `research/<topic>.md`
- **Brainstorm** — interactive conversation → Claude captures output to `brainstorm/<topic>.md`
- **Prototype** — project-level only; interactive session to try an approach (UI mockup, algorithm, integration); output goes to `.project/prototypes/<name>/` with a `summary.md`

**Prototype mode is project-level only.** If the scope is a slice or side quest, offer only Research and Brainstorm. If the user asks for a prototype, explain that prototyping is project-level and offer to switch scope or skip it.

**Skip option:** Before entering the loop, offer to skip exploration entirely (write `explore-skipped.md` with a brief reason). Use this when the user already has enough context to move directly to planning or architecture.

**Reference artifacts in this repo (implementer context only):**
- `.project/skill-conventions.md` — state.md and flow-log.jsonl formats (canonical source for these formats)
- `~/.claude/skills/start-project/SKILL.md` — style reference
- `~/.claude/skills/project-status/SKILL.md` — style reference
- `.project/vertical-slices/03-explore/goal.md` — full goal for this skill

---

## Phase 1: Write `references/explore-logic.md`

Embed the path mapping, output templates, and research sub-agent behavior so SKILL.md stays lean.

### Tasks

- [x] Create directory: `mkdir -p ~/.claude/skills/explore/references/`
- [x] Create `~/.claude/skills/explore/references/explore-logic.md` containing:

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

  *User interaction:*
  1. Ask the user: "What topics do you want to research? List them and I'll investigate in parallel."
  2. Show a confirmation with each topic, its computed output path, and the topic slug. Wait for user OK before proceeding.
  3. Show progress as each sub-agent completes: one-line confirmation per topic (e.g., "Wrote research/auth-providers.md")
  4. After all complete, summarize findings and report partial results if any failed (e.g., "4 of 5 topics researched; <topic> failed — retry?")

  *Implementation notes:*
  - Cap parallel sub-agents at 5; queue the rest sequentially
  - For each topic, compute the full absolute output path before spawning. Spawn a sub-agent (omit model parameter — defaults to current session model) with instructions that include:
    - Brief context: "This is a goodplan-managed project. The `.project/` directory contains project state and artifacts. You are researching a specific topic for the `/explore` skill."
    - Search the codebase (Grep/Glob/Read) for relevant existing code or patterns
    - Use WebSearch or Context7 for external knowledge (libraries, APIs, domain concepts)
    - `mkdir -p <research-path>` before writing
    - Write findings to `<research-path>/<topic-slug>.md` with a summary at the top (topic slug: 2-4 words, kebab-case). If a file already exists at the computed path, append a numeric suffix (e.g., `api-design-2.md`)
    - **Sub-agent must NOT modify any files other than its designated output file**
  - On sub-agent failure, write a stub file noting the failure

  **Brainstorm mode behavior:**
  - Ask the user: "What do you want to explore or think through?"
  - Have an open conversation — ask follow-up questions, surface trade-offs, explore options
  - When the conversation reaches a natural stopping point (repetition, convergence on a decision, or the user seems satisfied), offer to capture a write-up or keep going. If capturing: show an outline of what the write-up will include and wait for explicit approval before writing.
  - Backstop: after 8-10 exchanges, gently nudge: "We've been at this a while — want me to capture what we have so far?"
  - `mkdir -p <brainstorm-path>` before writing
  - Derive a slug from the topic (2-4 words, kebab-case). Show it to the user and confirm before writing (e.g., "I'll save this as `brainstorm/auth-approach.md` — OK?")
  - Write a structured summary to `<brainstorm-path>/<topic-slug>.md` capturing: options considered, trade-offs, decision made (if any), open questions. If a file already exists at the computed path, append a numeric suffix (e.g., `api-design-2.md`)

  **Prototype mode behavior (project-level only):**
  - Ask: "What do you want to prototype? Describe the approach."
  - `mkdir -p .project/prototypes/<name>/`
  - Run the session interactively — write prototype files into that directory
  - On completion, write `summary.md` in the prototype directory: what was tried, what was learned, verdict (promising / not worth pursuing / needs more exploration)

  **state.md and flow-log.jsonl formats** — embed the same format as in project-status/references/status-logic.md (so this skill is independently self-contained):
  - state.md 4-section format
  - flow-log.jsonl entry format with timestamp generation command

- [x] Keep under 4KB — this file is a reference, not documentation. Optionally split into two files (`explore-logic.md` for modes/templates, `formats.md` for state.md/flow-log formats) if more natural — name the second file `formats.md` to match `start-project` convention.
- [x] Add a sync comment at the top of the state.md/flow-log section: `<!-- Synced from .project/skill-conventions.md — update if that file changes -->`

### Success Criteria
- `references/explore-logic.md` exists and is self-contained
- Path mapping covers all three scope types
- Both output templates are present
- Research, brainstorm, and prototype behaviors are clearly specified
- Under 4KB (or split across two reference files, each under 4KB)

### Verification
- `wc -c ~/.claude/skills/explore/references/explore-logic.md` — confirm under 4096 bytes (check `formats.md` too if split)
- Read the file: could an implementer follow it to implement each mode correctly?

---

## Phase 2: Write SKILL.md

Write the skill at `~/.claude/skills/explore/SKILL.md`. Read `~/.claude/skills/start-project/SKILL.md` and `~/.claude/skills/project-status/SKILL.md` as style references.

### Tasks

- [x] Create `~/.claude/skills/explore/SKILL.md` with YAML frontmatter:
  - `name: explore`
  - `description:` — cover what it does AND when to invoke it, in third person. Include natural-language trigger phrases. E.g., "Runs an iterative research/brainstorm/prototype loop scoped to the project, a slice, or a side quest. Invoked when the user needs to investigate unknowns, explore options, or try approaches before committing to a plan or architecture. Common triggers: 'I need to research X', 'let's brainstorm', 'what are my options for...', 'let's explore', 'what should I use for...', 'compare X vs Y', 'help me decide between...', 'I'm not sure which approach...', 'skip exploration'."

- [x] Write the skill body with these steps in order:

  **Step 1 — Load explore logic**
  Read `references/explore-logic.md` using the Read tool. Use the path mapping and templates from this file throughout.

  **Step 2 — Determine scope**
  - If an argument was passed, normalize it:
    - Full path (`.project/vertical-slices/03-explore`) → use as-is
    - Relative (`vertical-slices/03-explore`) → prepend `.project/`
    - Short name (`03-explore`) → search both `vertical-slices/` and `side-quests/`
    - Strip trailing slashes before processing
  - Otherwise, read `.project/state.md`:
    - Check Work Stack top first — if set, extract only the path portion (ignore any parenthetical metadata like "(interrupted ...)") and use that as scope
    - Else if Active Slice is set (not "none"), use that as the scope
  - Otherwise, scope is project-level
  - Validate the directory exists; if not, list available scopes and prompt user
  - Check for existing `explore-complete.md` or `explore-skipped.md` at that scope; if found, enumerate existing artifacts (e.g., "You have explore-complete.md referencing 3 research and 2 brainstorm files. Start a new exploration? (Prior research and brainstorm files will be kept.)") rather than a generic prompt
  - Check for existing `research/` and `brainstorm/` files without an `explore-complete.md` (indicates interrupted exploration). If found, summarize what's already been explored and offer to resume or start fresh.
  - Announce scope and offer the choice in a single prompt: "Scope: **<scope>**. Ready to explore, or skip exploration? (Skip if you already have enough context.)"

  **Step 3 — Handle skip (if chosen)**
  - Ask for the reason, write `explore-skipped.md` using the template
  - Update state.md: Current Phase → `explore-complete — skipped: <brief reason>`
  - Append flow-log.jsonl entry with `status: "complete"` and summary like `"Exploration skipped: <reason>"`
  - Set Next Step: same as complete path recommendation
  - Stop

  **Step 4 — Exploration loop**
  Each iteration:
  1. Offer mode selection with a consistent menu format:
     - Project-level: `Pick a mode: [R]esearch · [B]rainstorm · [P]rototype`
     - Slice/quest: `Pick a mode: [R]esearch · [B]rainstorm` — proactively note "(Prototype available at project-level scope)"
     - On subsequent iterations, show which modes have been used: e.g., `(already used: Research, Brainstorm)`
     - If the user asks for Prototype at slice/quest scope, offer: "Want to switch to project scope for this prototype, or pick Research or Brainstorm instead?"
  2. Run the selected mode as specified in `references/explore-logic.md`
  3. After each mode completes, show a brief tally of what's been accomplished so far (e.g., "So far: researched auth-providers, brainstormed API design"). If more than 4 artifacts, summarize as counts instead (e.g., "So far: 3 research topics, 2 brainstorm sessions."). Then ask: "Keep exploring, or are we done?" — at 5+ iterations, fold in a gentle nudge: "Keep exploring, or are we done? (You've done 5 rounds — no pressure to keep going.)"
     - "Keep exploring" → loop back to step 1 of this iteration
     - "Done" → exit loop, proceed to Step 5

  **Step 5 — Write explore-complete.md**
  Using the template from `references/explore-logic.md`, draft `explore-complete.md` content. Show the draft/outline to the user for approval before writing (this is a milestone artifact downstream skills depend on). Include:
  - What was explored (list of research topics and brainstorm sessions)
  - Key conclusions and decisions
  - List of all artifact files written (including any prior research/brainstorm files from earlier explorations — prior artifacts are preserved)
  If the user requests changes, revise and re-present until approved. Use the Write tool after approval.

  **Step 6 — Write back state**
  Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`
  Update `.project/state.md` using the 4-section format from `references/explore-logic.md`. Set:
  - Current Phase: `explore-complete — <brief summary>`
  - Active Slice: unchanged from before
  - Work Stack: unchanged
  - Next Step: appropriate recommendation based on scope (e.g., `/define-architecture` for project-level, `/create-plan` for slice)
  Append to `.project/flow-log.jsonl`:
  Scope value mapping: project-level → `"project"`, slice → `"vertical-slices/<name>"`, quest → `"side-quests/<name>"`.
  ```bash
  echo '{"ts":"<timestamp>","phase":"explore","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
  ```

- [x] Review SKILL.md size — must be under 500 lines

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

**Cleanup:** Remove `.project/explore-skipped.md` before proceeding to Test 2.

**Test 2 — Slice scope, full loop:**
- Set state.md Active Slice to `vertical-slices/03-explore`
- Run `/explore` with no args
- Confirm it announces the slice scope
- Run one Research iteration (pick a topic) and one Brainstorm iteration
- Exit and verify `explore-complete.md` written to `.project/vertical-slices/03-explore/explore-complete.md`

**Test 3 — Project-level, prototype mode:**
- Run `/explore` at project-level scope
- Select Prototype mode and run a brief prototype session
- Verify prototype directory and `summary.md` created under `.project/prototypes/`

**Test 4 — Explicit argument with scope normalization:**
- Run `/explore vertical-slices/03-explore` (relative path, no `.project/` prefix)
- Confirm scope resolves correctly to `.project/vertical-slices/03-explore`
- Also test with trailing slash: `/explore vertical-slices/03-explore/`

**Test 5 — Short-name resolution:**
- Run `/explore 03-explore` (short name only)
- Confirm it searches both `vertical-slices/` and `side-quests/` and resolves to `.project/vertical-slices/03-explore`

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
- `ls .project/prototypes/` — confirm prototype directory and summary.md exist
- `tail -5 .project/flow-log.jsonl` — confirm entries from each test run
