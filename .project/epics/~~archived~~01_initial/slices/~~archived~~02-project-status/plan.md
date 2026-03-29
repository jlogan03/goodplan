# Plan: `/project-status` Skill

Status: ✅ COMPLETE (Phases 1–2)
Completed: 2026-03-15
Note: Phase 3 is a manual end-to-end test to be run by the developer.

## Overview

Build the `/project-status` Claude Code skill — a lightweight orientation tool that reads `.project/` state and tells any session exactly where the project stands and what to do next.

This skill is the recovery point after context compaction, long breaks, or any time the user needs to re-orient. It must work reliably with no pre-loaded context — just the `.project/` files on disk.

**This skill is read-only** — it does not modify the project. The only write-back is updating `state.md` with the inferred current phase (so the next session gets the fast path) and appending a single `flow-log.jsonl` entry. No CLAUDE.md update is needed.

## Important Context

**Skills are self-contained.** The skill runs in arbitrary target repos. It can only use files that exist in the target repo's `.project/` directory — it cannot reference files in the goodplan repo at runtime.

**State inference order:**
1. Read `state.md` first (fast path — may contain explicit resumption hints)
2. Read last few lines of `flow-log.jsonl` for recent history
3. Apply the file-existence state machine to verify/supplement (authoritative)

**Active scope resolution:**
- Work Stack top entry → Active Slice → project level

**File-existence state machine** (the authoritative source of truth — `state.md` may be stale or absent):

*Per slice/quest — check in this order (first match wins):*
- `abandoned.md` exists → abandoned (check this FIRST — takes precedence over all other states)
- `interrupted.md` exists → paused by a side quest
- `completion/learnings.md` exists → complete
- `after-implementation-fixes-and-polish.md` exists, no `completion/` → needs completion & propagation
- All implementation phases have passing `review.md` files, no `after-implementation-fixes-and-polish.md` → needs QA & polish
- `plan-refined.md` exists, not all implementation phases passing → needs implementation (check `implementation/` for progress)
- `plan.md` exists, no `plan-refined.md` → needs refinement
- `explore-complete.md` or `explore-skipped.md` exists, no `plan.md` → needs plan
- `goal.md` + files in `research/` or `brainstorm/` but no `explore-complete.md` → explore in progress
- Only `goal.md` → explore or plan writing

Side quests (`side-quests/<name>/`) follow the same state machine as vertical slices. When the active scope is a side quest path, apply the same rules.

*At the project level:*
- `idea.md` exists, no `architecture/` → explore or define architecture
- `explore-complete.md` or `explore-skipped.md` at `.project/` root → explore done
- `architecture/_overview.md` exists, no `vertical-slices/sequencing.md` → needs slice planning
- `vertical-slices/sequencing.md` exists → check slice statuses

**State-to-next-skill mapping:**

| State | Next Skill |
|---|---|
| No `.project/` directory | `/start-project` |
| Project-level: `idea.md` exists, no architecture | `/explore` or `/define-architecture` |
| Project-level: architecture done, no sequencing | `/define-slices` |
| Slice: explore in progress | `/explore <path>` |
| Slice: needs plan | `/create-plan <path>` |
| Slice: needs refinement | `/refine-plan <path>/plan.md` |
| Slice: needs implementation | `/implement-plan <path>/plan-refined.md` |
| Slice: needs QA & polish | (conversational — no skill) |
| Slice: needs completion | `/complete-slice <path>` |
| Interrupted work | Resume the work stack top entry first |

**Detecting a passing implementation review:**
A `review.md` file is "passing" if it contains the string "READY FOR IMPLEMENTATION" (case-insensitive search). This is the same verdict string used by the `/implement-plan` skill's review sub-agents (confirmed in `~/.claude/skills/implement-plan/references/sub-agent-prompts.md`). If the verdict is absent or the file contains "NEEDS CHANGES", the phase is not passing.

**Reference artifacts in this repo (implementer context only):**
- `workflow.md` — full workflow, file structure, state machine rules
- `.project/skill-conventions.md` — canonical state.md and flow-log.jsonl formats
- `.project/state.md` — example of state format
- `.project/flow-log.jsonl` — example of flow-log entries
- `~/.claude/skills/start-project/SKILL.md` — style reference: step-by-step format, bash code blocks, "Run:", "Use the Read tool" conventions
- `.project/vertical-slices/02-project-status/goal.md` — full goal for this skill

---

## Phase 1: Write `references/status-logic.md`

Embed the status-reading logic as a reference file the skill loads at runtime, keeping SKILL.md under 500 lines.

### Tasks

- [x] Create `~/.claude/skills/project-status/references/status-logic.md` containing:
  - The complete file-existence state machine rules (per-slice/quest and project-level) from the "Important Context" section above — including the `abandoned.md` precedence rule
  - The scope resolution order (Work Stack > Active Slice > project level)
  - The state-to-next-skill mapping table from above
  - How to read `implementation/` to determine progress: check for phase directories, look for `review.md` files, search each for "READY FOR IMPLEMENTATION" (case-insensitive) to determine if passing
  - What to do when `.project/` does not exist at all: respond with "No `.project/` directory found — run `/start-project` to set up structured project planning."
  - Target under 4KB — be precise, not exhaustive. If content exceeds 4KB after compression, extending to 6KB is acceptable; do not omit states to hit the limit.

### Success Criteria
- `references/status-logic.md` exists and is self-contained — a Claude session with only this file could correctly apply the state machine
- All states from the "Important Context" section are covered, including `abandoned.md` precedence and the QA & polish state
- Under 4KB preferred; up to 6KB acceptable if needed to cover all states without omission

### Verification
- `wc -c ~/.claude/skills/project-status/references/status-logic.md` — confirm under 4096 bytes
- Read the file and mentally trace through a few scenarios: (1) a freshly started project with only `idea.md`, (2) a slice where `plan-refined.md` exists but implementation is incomplete, (3) an abandoned slice

---

## Phase 2: Write SKILL.md

Write the skill at `~/.claude/skills/project-status/SKILL.md`. Read `~/.claude/skills/start-project/SKILL.md` first as a style reference — follow its step-by-step format, bash code blocks, and "Use the Read/Bash tool" conventions.

### Tasks

- [x] Create `~/.claude/skills/project-status/SKILL.md` with YAML frontmatter:
  - `name: project-status`
  - `description:` — cover what it does AND when to use it. E.g., "Read .project/ state and report the current phase, recent activity, and what to do next. Use at the start of any session, after context compaction, or whenever you need to re-orient in a project."

- [x] Write the skill body with these steps in order:

  **Step 1 — Check for `.project/` directory**
  Run `ls .project/ 2>/dev/null`. If the directory does not exist, tell the user "No `.project/` directory found — run `/start-project` to set up structured project planning." Stop.

  **Step 2 — Load status logic**
  Read `references/status-logic.md` using the Read tool. Use the rules loaded here for all phase inference in subsequent steps.

  **Step 3 — Read state.md (if present)**
  Try to read `.project/state.md`. If it exists, extract: current phase, active slice, work stack entries, next step hint. If absent, note that and rely entirely on the file-existence state machine.

  **Step 4 — Read recent flow-log entries**
  Run `tail -5 .project/flow-log.jsonl 2>/dev/null`. Parse and summarize: what phases completed recently, in what scope, at what time.

  **Step 5 — Determine active scope**
  Using the scope resolution order from `references/status-logic.md`: check work stack for any entries → check active slice in state.md → fall back to project level.

  **Step 6 — Apply file-existence state machine**
  For the active scope, inspect the relevant files on disk to confirm/correct the phase. Check for `abandoned.md` first. The state machine is the authoritative source — `state.md` is an optimization hint, not the truth. Run `ls` commands as needed.

  **Step 7 — Check for interrupted work**
  If state.md has work stack entries, or if any `interrupted.md` files exist in slice directories, surface these clearly — they represent paused work.

  **Step 8 — Present status summary**

  Use the following output format. Omit sections that are empty (work stack, interrupted slices). Timestamps use human-readable short form (`Mon DD HH:MM`).

  **Format A — Active slice or quest in progress:**
  ```
  ## Project Status

  **Scope**: vertical-slices/02-project-status (active slice)
  **Phase**: refine-plan complete — plan ready for implementation

  **Recent activity**:
  - Mar 15 16:45 · refine-plan · 02-project-status · complete
  - Mar 15 15:28 · implement-plan · 01-start-project · complete
  - Mar 15 15:12 · refine-plan · 01-start-project · complete

  **Work stack**:
  - side-quests/setup-test-infra (interrupted vertical-slices/03-explore at explore phase)

  **Next**: `/implement-plan .project/vertical-slices/02-project-status/plan.md`
  ```
  *(Omit the Work stack block entirely when empty. Show the last 3–5 flow-log entries in Recent activity, most recent first.)*

  **Format B — Between work items (no active slice or quest):**

  Use this format when the work stack is empty AND no slice is currently in progress (e.g., just completed a slice or side quest, or at the very start of the project). Show the next 3 vertical slices in sequencing order and all defined side quests.
  ```
  ## Project Status

  **Scope**: project level — no active slice

  **Recent activity**:
  - Mar 15 16:45 · complete-slice · 01-start-project · complete
  - Mar 15 15:28 · implement-plan · 01-start-project · complete
  - Mar 15 15:12 · refine-plan · 01-start-project · complete

  **Up next** (vertical slices):
  - `02-project-status` — plan.md exists, needs refinement → `/refine-plan .project/vertical-slices/02-project-status/plan.md`
  - `03-explore` — not started
  - `04-define-architecture` — not started

  **Side quests**:
  - `setup-test-infra` — plan complete, needs refinement → `/refine-plan .project/side-quests/setup-test-infra/plan.md`

  **Next**: `/refine-plan .project/vertical-slices/02-project-status/plan.md`
  ```
  *(Omit Side quests block entirely if no side quests exist. Show "(none defined)" only if the user would benefit from knowing side quests are possible.)*

  **Step 9 — Write back state**
  Update `.project/state.md` with the inferred current phase, active scope, work stack, and Next Step — using the 4-section format defined in `references/status-logic.md` (all four sections required). Even if unchanged, rewriting it refreshes the fast path for the next session. Append one entry to `.project/flow-log.jsonl`:
  ```bash
  echo '{"ts":"<timestamp>","phase":"project-status","scope":"project","status":"complete","summary":"Ran /project-status: <one-sentence summary of current state>"}' >> .project/flow-log.jsonl
  ```

  **Step 10 — Offer detail**
  After presenting the status report, offer: "Want me to show the full flow-log or all slice statuses?"
  Only expand if the user asks. Format B already shows an overview when between work items — don't repeat it unprompted.

- [x] Note: format conventions for `state.md` and `flow-log.jsonl` are embedded inline in SKILL.md (Step 9 echo command). No separate `references/formats.md` is needed — the writes are simple enough not to warrant a template file.

- [x] Review SKILL.md size — must be under 500 lines. Move any verbose logic to `references/status-logic.md`.

### Success Criteria
- `~/.claude/skills/project-status/SKILL.md` exists with valid YAML frontmatter
- `~/.claude/skills/project-status/references/status-logic.md` exists
- Reading SKILL.md linearly: each step is unambiguous, a different session following it produces a consistent status report
- The skill never requires `workflow.md` to exist in the target repo — all needed logic is embedded in `references/status-logic.md`
- SKILL.md is under 500 lines
- Step 1 gracefully handles missing `.project/` directory

### Verification
- `wc -l ~/.claude/skills/project-status/SKILL.md` — confirm under 500 lines
- `head -6 ~/.claude/skills/project-status/SKILL.md` — confirm valid YAML frontmatter
- `ls ~/.claude/skills/project-status/references/` — confirm status-logic.md exists
- Read SKILL.md top-to-bottom: would following it produce a correct, useful status report in a fresh session?
- **Smoke test** (quick sanity check — not the thorough Phase 3 test): Invoke `/project-status` in this repo and confirm it runs without errors and produces roughly correct output. Phase 3 covers thorough verification.

---

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer — not an autonomous task.**

### How to run

Run `/project-status` in this repo (which has a rich `.project/` directory with real artifacts) and verify the output matches reality.

### What to verify

- [ ] Status report identifies the correct current phase (after `start-project` slice complete, currently at project level, working on `project-status` slice)
- [ ] Flow-log summary mentions recent `implement-plan` and `write-plan` entries
- [ ] Recommended next step is something reasonable (e.g., `/implement-plan` after this plan is refined)
- [ ] No mention of workflow.md or goodplan repo paths — skill is self-contained
- [ ] Interrupted work check: nothing should be surfaced (work stack is empty)
- [ ] Output is concise — not a wall of text
- [ ] `state.md` is updated after running (check that timestamp or content changed)
- [ ] `flow-log.jsonl` has a new entry with `"phase":"project-status"`
- [ ] Running it in a directory with no `.project/` responds gracefully (suggests `/start-project`)

### Verification commands
- `cat .project/state.md` — compare to what the skill reported, confirm it was written back
- `tail -6 .project/flow-log.jsonl` — confirm new entry was appended
- `grep "project-status" .project/flow-log.jsonl` — confirm the entry exists
