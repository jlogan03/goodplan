# Agent Skill Review: Initiatives Infrastructure

## Issues

**[CRITICAL]** State machine rows #5 and #7 overlap, creating ambiguous state resolution

The initiative state machine in Phase 1 has a conflict. Row #5 matches when `approved.md` **or** `architecture-proposal-skipped.md` exists (no sequencing). Row #7 matches when `architecture-proposal-skipped.md` exists. Since check order is first-match-wins and #5 comes before #7, row #7 is unreachable — any initiative with `architecture-proposal-skipped.md` will always match #5 ("Needs slice planning") first. Row #7 ("No arch changes needed") is dead code. The design spec confirms this: `architecture-proposal-skipped.md` means "advance to slice planning," which is what #5 already does. Row #7 should be removed entirely, or if a distinct "no arch changes needed" display state is desired, it must be checked before #5 and its condition must exclude the presence of `approved.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `/create-initiative` Mode B lacks guidance on what to do when an `__active__` initiative already exists

Phase 2 defines Mode B (new initiative on existing project) but does not specify what happens when `__active__` initiative already exists. The design spec explicitly allows multiple initiatives in exploration/proposal phases simultaneously, so Mode B should work fine — but the plan should state this explicitly: "Mode B creates a non-active initiative. This works regardless of whether an `__active__` initiative exists — multiple initiatives can be in exploration simultaneously." Without this, an implementer might add an unnecessary guard check.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `/start-initiative` Step 5 commits architecture changes to top-level, but the design spec says top-level updates happen at slice completion via `/complete`

Phase 3, Step 5 says: "Commit proposed architecture changes to top-level `.project/architecture/`." But the design spec's two-layer model says: "Side quests read both layers: top-level for planning against current reality, active initiative architecture for compatibility with the target" and "/complete (for slices and side quests) writes approved architecture updates to the top-level, keeping it in sync with reality." The top-level should reflect current reality, not the target. Committing the full proposal to top-level at approval time breaks the two-layer model — the initiative hasn't been built yet. The `approved.md` should record what was approved, but top-level architecture should only be updated incrementally as slices complete. Clarify that Step 5 writes `approved.md` only; top-level updates are deferred to `/complete`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** First initiative's state machine path is inconsistent with general state machine

Phase 1's "First Initiative Special Cases" says the first initiative "Skips `architecture-proposal/` and `approved.md`" and starts as `__active__initial/`. But the state machine rows #5 and #6 check for `approved.md` and `architecture-proposal/` respectively. For the first initiative (which has neither), the state machine would fall through to row #8 (needs architecture proposal) even after `/define-architecture` writes to `architecture/` — because row #8 checks for `explore-complete.md`/`explore-skipped.md` with "no proposal." The first initiative uses `architecture/` (not `architecture-proposal/`), so the state machine condition for "architecture done, move to slice planning" doesn't match. Add a condition that recognizes `architecture/` (without `architecture-proposal/`) as equivalent to "approved" for the first initiative, or add an `architecture-complete.md` marker that `/define-architecture` writes.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `complete-slice` and `refine-slices` are not in scope but will break when initiative slices are created

The research file correctly identifies that `complete-slice` resolves scope via `vertical-slices/` and `side-quests/` patterns, and `refine-slices` is entirely hardcoded to `.project/vertical-slices/`. The plan acknowledges this in the research but does not add a follow-up task or warning to any phase. Phase 6 (define-slices) creates slices inside `initiatives/__active__<name>/vertical-slices/`, and the very next workflow step after defining slices is to plan and implement them — which will eventually reach `/complete-slice`. The plan should add a verification step or note in Phase 6 that flags `complete-slice` initiative-awareness as a required follow-up quest, and ideally add minimal path-awareness to `complete-slice` scope resolution in this plan (even if the full feature is deferred).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 `/define-architecture` update lacks detail on how to detect "first initiative" vs "subsequent initiative"

Phase 5 says to detect "whether scope is an initiative" and branches on first vs subsequent, but doesn't specify the detection mechanism. Is it `__active__initial` by name? What if someone renames it? The convention file should define this formally. The design spec says the first initiative is "auto-named 'initial'" — the plan should specify that "first initiative" detection is `initiatives/__active__initial/` (name-based) or alternatively by checking whether top-level `architecture/_overview.md` has real content vs the scaffold placeholder.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing skill description update for several skills

Phase 2 correctly updates `/create-initiative`'s description and notes cross-references to update, but Phases 4-7 don't mention updating the `description` field in SKILL.md frontmatter for the skills they modify. For example:
- `/define-architecture` description says "Run after `/start-project`" — Phase 5 should update this to reference `/create-initiative` and mention initiative scoping
- `/define-slices` description says "Requires idea.md from /start-project" — Phase 6 should update this
- `/project-status` description doesn't need changes but its Step 1 message does (covered in Phase 4)

The description field is the primary trigger mechanism for skills. Stale descriptions reduce trigger accuracy and confuse users about prerequisites.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `/start-initiative` trigger list doesn't include initiative name as argument

The SKILL.md for `/start-initiative` should accept an optional initiative name/path argument (e.g., `/start-initiative realtime-collab`) for when multiple initiatives are in proposal-pending state. The current plan implies the skill auto-detects, but with multiple initiatives in exploration/proposal phases, the user needs a way to specify which one to activate. Add argument handling similar to other skills' scope resolution patterns.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 7 stale detection uses `git log` dates but doesn't handle the case where architecture files were never committed

The stale check compares `git log -1 --format="%ai"` on `.project/architecture/` vs `<scope>/goal.md`. If architecture files exist but have never been committed (only in the working tree), `git log` returns nothing. The plan should specify a fallback: use `stat` for modification time, or skip the check if git has no history for the path.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 Format B initiative reporting lacks a concrete template

Phase 4 describes what to show (active initiative and phase, initiatives in exploration/proposal, archived count) but doesn't provide a template like the existing Format A and Format B templates in the current SKILL.md. Providing a concrete template (even a sketch) reduces implementer ambiguity. Example sections like `**Active initiative**: <name> — <state>` and `**Initiatives**: N exploring, N archived` would help.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `state-and-flow-formats.md` scope value update is mentioned in research but missing from plan phases

The research file notes that `state-and-flow-formats.md` needs `initiatives/<name>/vertical-slices/<name>` added as a valid scope value. No plan phase includes this task. While it's a shared reference update, it affects how `state.md` and `flow-log.jsonl` entries are written by every skill. Add it to Phase 1 (convention file creation) or Phase 4 (project-status).

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has strong structural organization — phased approach, good sequencing (conventions first, then new skills, then existing skill updates), and thorough research backing. However, the state machine has a logical error (unreachable row #7), the two-layer architecture model is contradicted in Phase 3 (committing proposal to top-level at approval time), and the first initiative's state machine path has a gap where "architecture done" isn't recognized. These three issues together mean the core state machine — the foundation that every other skill relies on — would be implemented incorrectly. Fixing the critical state machine overlap, the `/start-initiative` top-level commit contradiction, and the first-initiative state detection gap would bring this to 8+. Adding the missing `complete-slice` follow-up tracking and description updates would bring it to 9+.

## Summary
- Critical: 1
- Important: 5
- Minor: 3
