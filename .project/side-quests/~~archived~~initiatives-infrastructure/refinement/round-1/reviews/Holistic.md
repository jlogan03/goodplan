# Holistic Review — Initiatives Infrastructure

## Issues

**[IMPORTANT]** State machine row 7 is unreachable due to row 5 overlap

Phase 1's state machine table has row 7: "`architecture-proposal-skipped.md` exists → No arch changes needed". But row 5 already catches this: "`approved.md` or `architecture-proposal-skipped.md`, no sequencing → Needs slice planning". If `architecture-proposal-skipped.md` exists and there's no sequencing, row 5 matches first (first-match-wins). Row 7 can never fire. The design spec also treats `architecture-proposal-skipped.md` as advancing to "needs slice planning" (not a separate state). Remove row 7 or clarify what distinct state it represents.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `complete-slice` is not updated but will break when slices move into initiatives

The research file explicitly identifies that `complete-slice/SKILL.md` hardcodes `vertical-slices/` in scope resolution and glob patterns (Step 2 line 24: `match vertical-slices/ or side-quests/`, Step 3 line 41: `.project/architecture/`, Step 6d line 114: `ls .project/vertical-slices/*/completion/learnings.md`). When slices live inside `initiatives/__active__<name>/vertical-slices/`, these globs miss them entirely. The research flags this as "not in plan scope" but the goal says "Done when all skills work within initiative scope." Either add a minimal phase/task to update `complete-slice` path resolution, or explicitly document it as out-of-scope with a follow-up quest reference (the goal's "Out of Scope" already mentions "complete-rename quest" but that's about the rename, not initiative-awareness).

Resolution: USER_INPUT

---

**[IMPORTANT]** `refine-slices` will also break but is not addressed

`refine-slices/SKILL.md` is hardcoded to `.project/vertical-slices/` for its working directory and run directory (line 24-25). The Scope Exclusion section (line 29-30) explicitly filters to `.project/vertical-slices/`. This will silently skip initiative slices. Same resolution needed as for `complete-slice` — either update or explicitly document as out-of-scope follow-up.

Resolution: USER_INPUT

---

**[IMPORTANT]** Phase 3 Step 5 says "Commit proposed architecture changes to top-level" but this conflicts with two-layer model

Phase 3 (`/start-initiative`) says on approval: "Commit proposed architecture changes to top-level `.project/architecture/`." But the two-layer architecture model (from the design spec and goal.md) says the initiative's `architecture/` is the *target* state, and top-level is *current reality* — updated incrementally as slices complete via `/complete`. Committing the entire proposal to top-level at approval time would make top-level reflect future intent rather than current reality. The design spec says: "Top-level `.project/architecture/` = current reality (what the repo looks like right now). Updated incrementally as slices and side quests complete." Clarify that `/start-initiative` approval does NOT copy architecture files to top-level — it only writes `approved.md` and renames the directory. Top-level gets updated slice-by-slice via `/complete`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 Mode A does not mention creating `initiatives/` directory

Phase 2 Mode A says "Create `initiatives/__active__initial/goal.md`" and separately lists "Create top-level directories: `brainstorm/`, `research/`, `prototypes/`, `decisions/`, `flow-log/`" and "Create `initiatives/` directory". Actually, reading again — it does mention "Create `initiatives/` directory" as a separate bullet. However, the `mkdir -p .project/{research,brainstorm,prototypes,...}` in `start-project` Step 2 currently creates `vertical-slices/` — the plan says "Do NOT create top-level `vertical-slices/`" but doesn't provide the replacement `mkdir` command. The task should explicitly say to replace `vertical-slices` with `initiatives/__active__initial` in the mkdir command (or equivalent).

Resolution: MINOR

---

**[MINOR]** Phase 1 transition table references `/complete` but the skill is still named `complete-slice`

The transition table (Phase 1, row: needs-completion → complete) references `/complete` as the skill. The actual skill directory is `~/.claude/skills/complete-slice/`. The goal's "Out of Scope" says initiative completion is handled by "complete-rename quest." The convention file should use the current skill name (`/complete-slice`) or note the rename dependency. Using a name that doesn't exist yet will confuse consuming skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 top-level scaffold content is vague

For the first initiative, `/define-architecture` should "Write top-level `.project/architecture/_overview.md` as a scaffold." The task provides example text but doesn't specify whether this is the entire file or whether it should include the maturity table headers (the maturity-conventions.md specifies format for `_overview.md`). Since `maturity-conventions.md` already exists and defines the `_overview.md` format, the scaffold should at minimum include the `## Subsystem Maturity` section header with an empty table, or explicitly say "no maturity table until first slice completes."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 7 stale detection uses `.project/architecture/` but first initiative has no meaningful top-level architecture

For the first initiative, top-level `.project/architecture/` is just a scaffold. Comparing its last-modified date against a slice's `goal.md` would always trigger a warning (the scaffold is newer than nothing). The stale detection should skip or behave differently when top-level is a scaffold. Add a condition: "If top-level `_overview.md` is a scaffold (contains redirect text), skip stale detection against top-level."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No task for updating `state-and-flow-formats.md` scope value examples

The research identifies that `_shared/references/state-and-flow-formats.md` has scope value examples (`vertical-slices/<name>`) and needs `initiatives/<name>/vertical-slices/<name>` added. No phase includes a task for this update.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 interrupted work scan is incomplete

Phase 4 mentions adding `initiatives/__active__*/vertical-slices/*/interrupted.md` to the interrupted work check. But `complete-slice` Step 7 in `project-status` currently checks both `vertical-slices/` and `side-quests/` for interrupted work. The plan should also note that side quests are unchanged (they remain at `.project/side-quests/`), for clarity.

Resolution: MINOR

---

**[MINOR]** Verification tasks are present but lack runtime verification

Verification in each phase is limited to "Read the file" and "Confirm sections present" — these are static checks. Since these are skill definition files (not executable code), runtime verification would mean actually running the skill after updating it. Consider adding at least one end-to-end smoke test per phase: "Run the skill in a test project directory and confirm it produces the expected directory structure." Without this, errors in path construction or state detection will only surface during real use.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 7/10

The plan is well-structured with clear phasing, good dependency ordering, and thorough codebase research. The phase decomposition is logical (conventions first, then new skills, then existing skill updates). However, there are several issues that would cause real problems during implementation: the state machine has an unreachable row, the two-layer architecture semantics are contradicted in Phase 3, two skills that will break are not addressed, and verification is limited to static file reads. To reach 9+: fix the Phase 3 architecture-commit contradiction, resolve the `complete-slice`/`refine-slices` gap (even if just documenting it as out-of-scope), clean up the state machine, and add at least lightweight runtime verification.

## Summary
- Critical: 0
- Important: 4
- Minor: 6
