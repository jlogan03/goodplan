# Agent Skill Review: Initiatives Infrastructure (Round 2)

## Issues

**[IMPORTANT]** Phase 8 `/complete-slice` scope resolution update is incomplete — missing auto-detect scan extension

Phase 8 adds `initiatives/__active__<name>/vertical-slices/<slice>/` as a valid scope for argument-based and state.md-based resolution. However, the current `complete-slice` SKILL.md Step 2.3 auto-detect scans `.project/vertical-slices/` and `.project/side-quests/` for slices where "implementation is complete but completion hasn't run." Phase 8 does not mention extending this auto-detect scan to also glob `initiatives/__active__*/vertical-slices/*/` for the same pattern. Without this, running `/complete-slice` with no argument while an initiative slice is ready for completion would fail to find it. Add: "Extend the auto-detect scan (Step 2.3) to also glob `.project/initiatives/__active__*/vertical-slices/*/` using the same completion-readiness criteria."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 8 `/complete-slice` architecture update target is ambiguous

Phase 8 says: "/complete-slice should update the initiative's own architecture if needed, not the top-level." But the current `complete-slice` SKILL.md Step 3 loads `.project/architecture/` for comparison (item 7 in the artifact list), and Step 4+ synthesizes learnings and proposes architecture updates. The plan doesn't specify: (a) which architecture files to load for comparison when completing an initiative slice (initiative's `architecture/` or top-level or both?), (b) where proposed architecture updates should be written. The design spec says `/complete` (initiative-level completion) handles top-level updates, but per-slice completion within an initiative needs clarity — should it propose updates to the initiative's `architecture/` directory? The current skill's architecture update protocol in `references/guidance.md` would need corresponding changes. Add explicit instructions: "When completing an initiative slice, load the initiative's `architecture/` for comparison (not top-level). Propose architecture updates to the initiative's `architecture/` directory. Top-level updates are deferred to initiative completion via `/complete`."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 8 `/refine-slices` scope exclusion clause needs updating

The current `refine-slices` SKILL.md has an explicit "Scope Exclusion" section that says: "Only vertical slice goal files under `.project/vertical-slices/` are in scope." Phase 8 adds initiative awareness but doesn't mention updating this exclusion clause. If this text remains unchanged, the skill will explicitly reject initiative slices even after adding the new scope resolution. Update the scope exclusion to: "Only vertical slice goal files under `.project/vertical-slices/` or `initiatives/__active__*/vertical-slices/` are in scope."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 8 `/refine-slices` run directory path not specified

The current `refine-slices` has `run_directory = .project/vertical-slices/slices-refining/`. Phase 8 says to resolve to the initiative's `vertical-slices/` but doesn't specify the new run directory path for initiative slices. Should it be `.project/initiatives/__active__<name>/vertical-slices/slices-refining/`? The working copy paths (e.g., `goal-refining.md` alongside originals) and manifest also depend on this. Specify the run directory for initiative-scoped refinement.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 state machine split into first/subsequent is good but transition table still uses generic paths

Round 1 C2 asked for splitting the state machine into first-initiative and subsequent-initiative sections. The plan now has two separate tables (rows 5-8 for first initiative, rows 5-9 for subsequent). This is good. However, the State Transition Table below the state machine still uses a single linear sequence that mixes both paths — e.g., `needs-architecture-proposal` appears as a state, but first initiatives never enter this state (they go from `exploring` to `needs-slice-planning` via `architecture/` existence). Consider adding a note in the transition table indicating which transitions apply to first vs subsequent initiatives, or split the table as well.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 7 stale detection scaffold skip condition could be more precise

The stale detection now includes a scaffold skip condition: "The top-level architecture is a scaffold (contains only a pointer to the active initiative's architecture, e.g., 'Architecture is being defined in the active initiative')." The detection mechanism is string matching on content, which is fragile. Consider using a more robust marker — for example, Phase 5 could write a `_scaffold: true` YAML front matter marker in the scaffold `_overview.md`, making detection unambiguous for the stale check.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `/start-initiative` now correctly accepts optional initiative name argument (M6 fix verified), but the workflow for "no argument + multiple proposals" could be clearer

Step 1 says "If initiative name argument provided, use it; otherwise scan for initiatives in proposal-pending state and select (or ask if ambiguous)." The "select" behavior when only one is found is implicit — it should be explicit: "If exactly one initiative is in proposal-pending state, select it automatically and confirm with the user. If multiple, use AskUserQuestion to choose."

Resolution: DIRECTLY_ACTIONABLE

## Round 1 Fix Verification

| Round 1 Issue | Status | Notes |
|---|---|---|
| C1: Row #7 unreachable | FIXED | Row #7 removed from subsequent-initiative table |
| C2: First/subsequent state machine conflation | FIXED | Split into two separate tables with distinct conditions |
| C3: `/start-initiative` commits to top-level | FIXED | Step 5 now writes `approved.md` only; top-level deferred to `/complete` |
| I1: `complete-slice` breaks for initiative slices | FIXED | New Phase 8 adds scope resolution (but see new issues above about auto-detect and architecture target) |
| I2: `refine-slices` breaks for initiative slices | FIXED | New Phase 8 adds scope resolution (but see new issue about scope exclusion clause) |
| I3: `/define-architecture` leaks initiative-type knowledge | FIXED | Phase 5 now uses caller-provided output path parameter |
| I4: Stale detection too coarse | FIXED | Per-file comparison added, scaffold skip added, `stat` fallback added |
| I5: No rollback path | FIXED | Rollback/Unapproval section added to Phase 1 conventions — abandonment is the path |
| I6: Mode B lacks concurrent guidance | FIXED | Explicit statement added about multiple initiatives in exploration |
| I7: Missing description updates | FIXED | Description update tasks added to Phases 4-7 |
| M1: `state-and-flow-formats.md` missing | FIXED | Added as task in Phase 1 |
| M2: Mode A `mkdir` underspecified | FIXED | Replacement command specified |
| M3: `/complete` vs `complete-slice` naming | FIXED | Transition table uses current name |
| M4: Consumer guide duplication | FIXED | `status-logic.md` references convention file |
| M5: Side quests unchanged note | FIXED | Note added to Phase 4 |
| M6: Initiative name argument | FIXED | Optional argument added to Phase 3 |
| M7: Format B template missing | FIXED | Template sketch added |
| M8: Scaffold content vague | FIXED | Scaffold includes `## Subsystem Maturity` header with empty table |
| M9: No runtime verification | PARTIALLY FIXED | Phase 1 has smoke test; other phases still static-only |

## Score: 8/10

All round 1 critical and important issues have been addressed. The new Phase 8 for `complete-slice` and `refine-slices` was the right call — both skills are now in scope. However, Phase 8 itself has gaps: the auto-detect scan for `/complete-slice` is missing, the architecture update target is ambiguous, and the `/refine-slices` scope exclusion clause would actively reject initiative slices even after the fix. These are implementation-blocking issues within the new phase. Fixing the three IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
