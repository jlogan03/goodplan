# Agent Skill Review: Initiatives Infrastructure (Round 3)

## Issues

**[MINOR]** Phase 6 does not address `explore-logic.md` Slice row behavior under initiatives

Phase 5 adds an "Initiative" row to `explore-logic.md` for initiative-level exploration. Phase 6 says "Per-slice explore phase removed" for initiative slices. However, neither phase updates the existing "Slice" row in `explore-logic.md`, which maps `vertical-slices/<name>/research/` etc. When `/explore` receives a path like `initiatives/__active__foo/vertical-slices/02-bar`, the scope resolution in `/explore` Step 2 currently tries to match `vertical-slices/` or `side-quests/` prefixes. The plan adds `initiatives/` prefix matching (Phase 5), but the Slice row in `explore-logic.md` still applies to initiative slices if someone passes a slice path directly. Phase 6 says to remove per-slice explore for initiative slices but doesn't specify the mechanism -- should `/explore` reject initiative slice paths with a message ("explore at initiative level instead"), or should `explore-logic.md` get a note that initiative slices are not valid explore scopes? Add a task to Phase 5 or 6: "Update `/explore` scope validation to reject initiative slice paths (paths matching `initiatives/*/vertical-slices/*`) with a message directing the user to explore at the initiative level instead."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Mode A `state.md` Next Step format unclear for initiative scoping

Phase 2 says state.md Next Step should be `/explore` scoped to the initiative, but doesn't specify the exact format. The current `/start-project` writes Next Step as `/explore or /define-architecture`. For Mode A, the initiative path is `initiatives/__active__initial` -- the Next Step should presumably be `/explore initiatives/__active__initial` or `/explore` (relying on scope resolution to find the initiative). The format matters because `/project-status` reads state.md to suggest next actions. Specify the exact Next Step value, e.g., `/explore` (letting scope resolution handle it) or `/explore initiatives/__active__initial` (explicit path).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 `/define-architecture` scaffold content should include `<!-- scaffold -->` marker for Phase 7 stale detection

Phase 5 says the scaffold `_overview.md` contains "a pointer to the active initiative's architecture" and "a `## Subsystem Maturity` header with an empty table." Phase 7's stale detection skips scaffold files "detected by the presence of a `<!-- scaffold -->` marker comment in `_overview.md`." Phase 5 should explicitly include the `<!-- scaffold -->` marker in the scaffold content description to ensure consistency with Phase 7's detection mechanism. Currently Phase 5 mentions the scaffold's content but doesn't explicitly list the marker -- the marker is only implied by Phase 7. Add `<!-- scaffold -->` to the scaffold content list in Phase 5 for clarity.

Resolution: DIRECTLY_ACTIONABLE

## Round 2 Fix Verification

| Round 2 Issue | Status | Notes |
|---|---|---|
| I1: `/complete-slice` auto-detect scan missing | FIXED | Phase 8 now includes "Extend auto-detect scan (Step 2.3)" task |
| I2: `/complete-slice` architecture update target ambiguous | FIXED | Phase 8 now specifies: compare against initiative `architecture/`, propose updates to top-level, leave initiative architecture unchanged |
| I3: `/refine-slices` scope exclusion clause | FIXED | Phase 8 now updates exclusion to include `initiatives/__active__*/vertical-slices/` |
| M1: Run directory path not specified | FIXED | Phase 8 specifies `.project/initiatives/__active__<name>/vertical-slices/slices-refining/` |
| M2: Transition table mixes first/subsequent | FIXED | Transition table now split into two separate tables |
| M3: Scaffold detection fragile | FIXED | Now uses `<!-- scaffold -->` marker comment |
| M4: Single-proposal auto-select implicit | FIXED | Phase 3 Step 1 now explicitly states auto-select with confirmation |

## Score: 9/10

All round 1 and round 2 issues have been addressed. The plan is thorough, well-sequenced, and accounts for the structural complexity of updating 8+ skills. The remaining minors are edge-case clarity issues that would not block implementation. The split state machines, explicit scaffold marker, auto-detect scan extension, and architecture update target specification make this implementable without ambiguity on the critical paths.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
