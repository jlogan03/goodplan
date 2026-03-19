# Holistic Review — Initiatives Infrastructure (Round 2)

## Issues

**[IMPORTANT]** Phase 5 `/define-architecture` output path parameter design is underspecified

Phase 5 says `/define-architecture` should "Accept an output path parameter (provided by the calling context or derived from state.md)." But `/define-architecture` is a user-invoked skill, not a programmatic function. The "calling context" is the user typing `/define-architecture`. The plan says "Callers pass the output path" but doesn't specify how the skill determines the path when the user invokes it directly. Either: (a) the skill itself must detect whether an active initiative exists and whether it's the first initiative (to choose `architecture/` vs `architecture-proposal/`), making it internally branch on initiative type contrary to the stated design; or (b) the user must pass the path explicitly, which is error-prone. The plan should clarify the actual mechanism — likely the skill reads state.md to determine the active initiative and uses the convention file to derive the correct output path. That IS branching on initiative type internally, just delegated to a convention lookup. State this explicitly so the implementer knows the skill must contain initiative-type detection logic.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 8 `/complete-slice` architecture update scope is ambiguous

Phase 8 says "When completing an initiative slice, `/complete` (called at initiative completion) handles top-level architecture updates. `/complete-slice` should update the initiative's own architecture if needed, not the top-level." But the existing `/complete-slice` SKILL.md Step 6 compares what was built against `.project/architecture/` and writes updates there. For initiative slices, the plan says it should update the initiative's architecture instead. However, the two-layer model says the initiative's architecture is the *target* — it shouldn't change as slices land. What should change is the top-level architecture (current reality reflecting what's been built). This task contradicts the two-layer model from Phase 1 and the design spec. Clarify: when completing an initiative slice, `/complete-slice` Step 6 should compare against the initiative's architecture (target) and update the TOP-LEVEL architecture (current reality) with what was actually built — not update the initiative's architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 state machine first-initiative row 6 has a gap with `/define-architecture` output

First initiative state row 6: "`explore-complete.md` or `explore-skipped.md`, no `architecture/` -> Needs architecture". But Phase 5 says `/define-architecture` for the first initiative writes to `initiatives/__active__initial/architecture/`. If the user skips explore (writes `explore-skipped.md`) and then runs `/define-architecture`, the state machine checks for `architecture/` — but it needs to check for `architecture/` with non-scaffold content, not just its existence. The `mkdir -p` in Step 8b of `/define-architecture` creates the directory before writing files. If `/define-architecture` is interrupted after creating the directory but before writing content, the state machine would incorrectly advance to "Needs slice planning" (row 5). Add "with content" qualifier or check for a specific file like `_overview.md` within `architecture/`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 explore scope resolution mechanism is vague

Phase 5's `/explore` update says "When active scope is an initiative (detected from state.md or argument), use the initiative's research/, brainstorm/, prototypes/ directories." But the `explore-logic.md` scope path mapping table currently has three rows (Project, Slice, Quest). The plan says a fourth "Initiative" row is needed (per research file) but Phase 5 doesn't include a task to update `explore-logic.md`. It only mentions "Update scope resolution" in SKILL.md. Since the skill loads `explore-logic.md` as its authoritative reference for scope paths, that file needs an explicit update task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 transition table `needs-architecture-proposal` is specific to subsequent initiatives but table doesn't distinguish

The transition table lists `needs-architecture-proposal -> /define-architecture -> proposal-pending`. But for first initiatives, the state is `needs-architecture` (not `needs-architecture-proposal`) and the transition goes to `needs-slice-planning` (not `proposal-pending`). The table mixes first-initiative and subsequent-initiative transitions without labels, making it unclear which rows apply to which variant. Since the state machine itself is split into first/subsequent sections, the transition table should either be similarly split or have a column indicating which initiative type each transition applies to.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Mode B doesn't specify what to do if a `__active__` initiative already exists

Phase 2 says Mode B creates a new initiative without making it `__active__`. But it doesn't say what to tell the user about the existing active initiative. Should Mode B warn "Initiative X is currently active — this new initiative will start in exploration state"? The existing active initiative constraint is only checked in Phase 3 (`/start-initiative`), but the user should be informed at creation time that their new initiative won't be buildable until the current one completes.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 7 stale detection scaffold skip condition needs the exact scaffold marker

Phase 7 says to skip stale detection "If top-level `_overview.md` is a scaffold (contains redirect text)." But it doesn't specify the exact text or pattern to match. Phase 5 provides example scaffold text ("Architecture is being defined in the active initiative"). The stale detection task should reference the exact marker or pattern from Phase 5 so the implementer doesn't have to guess. A simple check like "contains 'active initiative'" or a structured marker comment would work.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 Format B template doesn't show side quest reporting

Phase 4's Format B template sketch shows "Active Initiative", "Other Initiatives", and "Archived" but doesn't show where side quests appear. The current Format B shows side quests. The template should include a `## Side Quests` section to make clear that side quest reporting is preserved alongside the new initiative reporting.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 doesn't mention updating `references/guidance.md` for `/define-slices`

The research file identifies that `define-slices/references/guidance.md` has hardcoded `ls .project/vertical-slices/sequencing.md` (line 10) and a CLAUDE.md line template (line 39) that both need updating. Phase 6 has tasks for SKILL.md but no explicit task for `references/guidance.md`. Since the skill loads this reference file, it needs the same path updates.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Round 2 is substantially improved from Round 1. The state machine split into first/subsequent is clearer, the top-level commit was correctly removed from `/start-initiative`, and Phase 8 addresses the `complete-slice`/`refine-slices` gap. The remaining issues are: Phase 8's architecture update direction contradicts the two-layer model (IMPORTANT), `/define-architecture`'s output path mechanism needs clarification (IMPORTANT), and the first-initiative state machine has an edge case with empty `architecture/` directories (IMPORTANT). Several reference file updates are missing from task lists (MINOR). To reach 9+: fix the three IMPORTANT issues (especially the Phase 8 two-layer contradiction) and add the missing reference file update tasks.

## Summary
- Critical: 0
- Important: 3
- Minor: 6
