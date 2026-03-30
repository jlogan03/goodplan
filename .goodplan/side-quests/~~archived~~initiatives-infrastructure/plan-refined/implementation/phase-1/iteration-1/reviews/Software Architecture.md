# Software Architecture Review — Phase 1: Initiative Conventions

## Issues

**[IMPORTANT]** `status-logic.md` not updated to delegate initiative state to `initiative-conventions.md`
The new `initiative-conventions.md` defines a complete initiative state machine, but `status-logic.md` (the existing authoritative state machine reference consumed by `/project-status`) has no mention of initiatives. The plan overview states "Initiative state machine lives in a shared convention file, per-slice state machine stays in `status-logic.md`" — but without `status-logic.md` referencing or deferring to `initiative-conventions.md`, consumers of `status-logic.md` (currently `/project-status`) will not know the initiative state machine exists. This creates two disconnected sources of truth for state resolution. Phase 4 (project-status update) will presumably address this, but the convention file should be designed to be discoverable now — a cross-reference from `status-logic.md` to `initiative-conventions.md` for initiative-level state would prevent the gap from becoming a problem if phases are implemented out of order or a new skill is added before Phase 4.
File: /Users/iwhite/.claude/skills/project-status/references/status-logic.md:1
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No skills currently reference `initiative-conventions.md`
The file is created as a "single source of truth for initiative structure, consumed by all initiative-aware skills" but zero skill SKILL.md files reference it. The consumer guide table lists 15+ skills as readers/writers, yet none have been wired up. This is expected for Phase 1 (later phases wire skills), but the plan's Phase 1 verification section says to "confirm all sections present" and "cross-reference directory structure with design spec" — it does not call for verifying that at least the shared references README or any skill references the new file. If this file sits unreferenced, it is dead documentation until Phase 2+. Consider adding a line to `_shared/references/README.md` noting `initiative-conventions.md` and its purpose, so the file is at least discoverable from the shared references index.
File: /Users/iwhite/.claude/skills/_shared/references/README.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** State machine row 3 condition is underspecified: "All slices complete, no `completion/`"
Row 3 of the shared initiative state machine says the condition is "All slices complete, no `completion/`." But this is checked in priority order, so it runs after rows 1-2 but before row 4 which checks for `vertical-slices/sequencing.md`. If `vertical-slices/` does not exist yet (initiative is still in exploration or architecture phases), "all slices complete" is vacuously true (zero slices, all zero are complete), which would incorrectly resolve to "Needs initiative completion." The first-match-wins ordering saves this only because the subsequent-initiative path has row 5 checking for `approved.md` — but for the first initiative, if `architecture/_overview.md` does not yet exist and `vertical-slices/` does not exist, rows 5-8 would be checked. The vacuous truth issue is avoided in practice because row 4 requires `vertical-slices/sequencing.md` to exist, and row 3 implicitly requires slices to exist to be "all complete." However, the condition text should be explicit: "All slices in `vertical-slices/` complete AND `vertical-slices/sequencing.md` exists, no `completion/`" to eliminate ambiguity for implementers.
File: /Users/iwhite/.claude/skills/_shared/references/initiative-conventions.md:104
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** First initiative transition table shows `/create-initiative` but text says `/start-project`
The "First Initiative Special Cases" section says "Created as `__active__initial/` (starts active)." The directory structure section says "Created by `/start-project` as `__active__initial/`." But the state transition table for first initiatives shows the transition from (none) to ready-for-exploration triggered by `/create-initiative`. The plan overview clarifies this is intentional ("/create-initiative replaces /start-project"), but within `initiative-conventions.md` itself, one section says `/start-project` and the table says `/create-initiative`. This inconsistency will confuse implementers of later phases. Pick one name consistently within this document — since Phase 2 will rename the skill, using `/create-initiative` throughout (with a parenthetical noting it replaces `/start-project`) would be forward-looking.
File: /Users/iwhite/.claude/skills/_shared/references/initiative-conventions.md:12
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `state-and-flow-formats.md` update is minimal — no initiative-scoped `state.md` guidance
The update to `state-and-flow-formats.md` adds `initiatives/<name>/vertical-slices/<name>` as a valid scope value, which is correct. However, `state.md` format's "Active Slice" field currently only shows `<slice path>` — it does not document how to represent an active initiative-scoped slice (e.g., `initiatives/__active__initial/vertical-slices/01-setup`). The flow-log scope guidance is updated but the state.md section is not. Callers writing state.md for initiative-scoped work will need to know the path format.
File: /Users/iwhite/.claude/skills/_shared/references/state-and-flow-formats.md:12
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The convention file is well-structured and comprehensive — the state machine, transition tables, two-layer architecture model, and consumer guide are all clearly written and internally consistent. The architectural decisions (first-match-wins ordering, no unapproval, two-layer model) are sound and well-justified. However, the file exists in isolation: no existing skill or reference document points to it, and there are minor inconsistencies between sections (skill naming) and underspecified conditions (row 3 vacuous truth). To reach 9+: wire up discoverability (README entry, cross-reference from status-logic.md), fix the naming inconsistency, tighten the row 3 condition, and add state.md path format guidance for initiative-scoped slices.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
