# Merged Feedback — Initiatives Infrastructure (Round 2)

Reviewers: Holistic (8/10), Software Architecture (8/10), Agent Skill (8/10)

## Important Issues

### I1. Phase 8 `/complete-slice` architecture update semantics are wrong/ambiguous

Raised by: All three reviewers (Holistic, Software Architecture, Agent Skill)

Phase 8 says "/complete-slice should update the initiative's own architecture if needed, not the top-level." This contradicts the two-layer model:

- Initiative `architecture/` = target state (shouldn't change as slices land)
- Top-level `architecture/` = current reality (updated incrementally as slices complete)

Fix: When completing an initiative slice, `/complete-slice` should: (a) compare implementation against the initiative's `architecture/` (the target), (b) propose updates to top-level `architecture/` (current reality reflecting what was built), (c) leave the initiative's `architecture/` unchanged. Top-level updates via `/complete` at initiative completion handle the final merge, but per-slice incremental updates to top-level are also needed per the design spec.

---

### I2. Phase 5 `/define-architecture` output path mechanism is underspecified

Raised by: Holistic, Software Architecture

The plan says `/define-architecture` should "accept an output path parameter" and "callers pass the output path," but doesn't specify the actual mechanism. The skill is user-invoked (not programmatic), and currently takes no arguments. Three options exist (CLI argument, derived from state.md, calling skill sets it up) but none is chosen.

Fix: Specify explicitly that `/define-architecture` reads state.md to detect the active initiative and derives the output path from the convention file. If no active initiative exists, it defaults to `.project/architecture/`. This means the skill contains initiative-type detection logic (delegated to convention lookup) — state this explicitly so the implementer knows.

---

### I3. Phase 8 `/complete-slice` auto-detect scan missing initiative paths

Raised by: Agent Skill

Phase 8 adds argument-based and state.md-based scope resolution for initiative slices, but doesn't extend the auto-detect scan (Step 2.3). Currently auto-detect globs `.project/vertical-slices/` and `.project/side-quests/` for completion-ready slices. Without extending to `.project/initiatives/__active__*/vertical-slices/*/`, running `/complete-slice` with no argument while an initiative slice is ready would fail to find it.

Fix: Add task: "Extend the auto-detect scan (Step 2.3) to also glob `.project/initiatives/__active__*/vertical-slices/*/` using the same completion-readiness criteria."

---

### I4. Phase 8 `/refine-slices` scope exclusion clause actively rejects initiative slices

Raised by: Agent Skill

The current `refine-slices` SKILL.md has an explicit "Scope Exclusion" that says: "Only vertical slice goal files under `.project/vertical-slices/` are in scope." Phase 8 adds initiative awareness but doesn't mention updating this clause. The unchanged text would explicitly reject initiative slices even after the other fixes.

Fix: Update scope exclusion to: "Only vertical slice goal files under `.project/vertical-slices/` or `initiatives/__active__*/vertical-slices/` are in scope."

---

## Minor Issues

### M1. Phase 7 stale detection scaffold skip needs a concrete detection mechanism

Raised by: Holistic, Software Architecture, Agent Skill

The scaffold skip condition says "contains only a pointer to the active initiative's architecture" but doesn't specify how to detect this. String matching on content is fragile.

Fix: Use a robust marker — e.g., write `<!-- scaffold -->` as a marker comment in the scaffold `_overview.md`, or check for a `scaffold: true` YAML frontmatter. Reference this marker from Phase 7's stale detection task.

---

### M2. Phase 1 transition table mixes first-initiative and subsequent-initiative transitions

Raised by: Holistic, Agent Skill, Software Architecture

The transition table uses a single linear sequence that mixes both paths without labels. First initiatives never enter `needs-architecture-proposal`, and the table is missing `needs-architecture -> /define-architecture -> needs-slice-planning` for the first-initiative path.

Fix: Either split the transition table into first/subsequent sections (matching the state machine), or add a column indicating which initiative type each transition applies to. Add the missing first-initiative transitions.

---

### M3. Phase 5 `/explore` scope resolution missing `explore-logic.md` update task

Raised by: Holistic

Phase 5 mentions updating scope resolution in SKILL.md but doesn't include a task to add the "Initiative" row to `explore-logic.md`. The skill loads this file as its authoritative scope path reference.

Fix: Add explicit task to update `explore-logic.md` with an Initiative scope row.

---

### M4. Phase 8 `/refine-slices` run directory path not specified

Raised by: Agent Skill, Software Architecture

The current run directory is `.project/vertical-slices/slices-refining/` (hardcoded). For initiative slices, this should be `.project/initiatives/__active__<name>/vertical-slices/slices-refining/`. The plan mentions updating "working dir, run dir, manifest" but doesn't specify the actual initiative-scoped run directory path.

Fix: Explicitly specify the run directory for initiative-scoped refinement.

---

### M5. Phase 6 missing `references/guidance.md` update for `/define-slices`

Raised by: Holistic

`define-slices/references/guidance.md` has hardcoded paths (`ls .project/vertical-slices/sequencing.md`, CLAUDE.md line template) that need updating for initiative-scoped paths.

Fix: Add explicit task to update `references/guidance.md` alongside SKILL.md.

---

### M6. Phase 2 Mode B doesn't inform user about existing active initiative

Raised by: Holistic

Mode B creates a non-active initiative but doesn't warn the user that their new initiative won't be buildable until the current active initiative completes.

Fix: Add user notification about existing active initiative in Mode B flow.

---

### M7. Phase 1 first-initiative state machine has edge case with empty `architecture/` directory

Raised by: Holistic

If `/define-architecture` is interrupted after `mkdir -p` but before writing content, the state machine would incorrectly advance to "Needs slice planning." The check should verify content exists (e.g., `_overview.md` present), not just directory existence.

Fix: Add "with content" qualifier or check for a specific file like `_overview.md` within `architecture/`.

---

### M8. Phase 4 Format B template missing side quest section

Raised by: Holistic

The template sketch shows initiative sections but omits the `## Side Quests` section that current Format B includes.

Fix: Add side quest section to the Format B template.

---

### M9. Phase 6 stale CLAUDE.md references for existing projects

Raised by: Software Architecture

Existing projects with `.project/vertical-slices/sequencing.md` in CLAUDE.md will have stale references when slices move inside initiatives. This is a migration concern.

Fix: Note as a migration concern — either Mode A handles it or `/project-status` detects and reports the stale reference.

---

### M10. Phase 3 `/start-initiative` single-proposal auto-select behavior is implicit

Raised by: Agent Skill

When no argument is provided and exactly one initiative is in `proposal-pending` state, the behavior should be explicit: auto-select and confirm with user.

Fix: Make explicit: "If exactly one initiative is in proposal-pending state, select it automatically and confirm with the user."

---

### M11. Phase 1 `abandoned.md` ordering difference from design spec is intentional but undocumented

Raised by: Software Architecture

The plan puts `abandoned.md` as row #1 (structural precedence), while the design spec lists it later with a parenthetical "(takes precedence)." The plan's approach is better but the convention file should note this intentional difference.

Fix: Add a note in the convention file explaining the ordering difference.

---

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| Holistic | 8/10 | 0 | 3 | 6 |
| Software Architecture | 8/10 | 0 | 3 | 4 |
| Agent Skill | 8/10 | 0 | 3 | 4 |

**Merged: 0 Critical, 4 Important, 11 Minor**

All round-1 critical and important issues are resolved. The dominant theme in round 2 is Phase 8 gaps — the new phase addressing `complete-slice` and `refine-slices` has three of the four important issues. The `/complete-slice` architecture update direction (I1) is the highest-priority fix as it contradicts the two-layer model. Fixing the four important issues would bring all reviewers to 9+.
