# Software Architecture Review — Round 3

## Issues

**[IMPORTANT] Phase 1 Step 2 missing explicit wrong-status guidance for intermediate statuses**
The plan lists explicit wrong-status remedies for `activated`, `created`, `explored`, and `slices-defined`, then has a generic "Any other status" catch-all. However, several intermediate statuses have obvious next-step guidance that should be explicit rather than relying on `nextCommands` lookup:
- `exploring` -- "Exploration is in progress. Run `/gp:explore` to continue."
- `defining-architecture` / `architecture-defined` / `refining-architecture` / `architecture-refined` -- "Architecture work is in progress. Run `/gp:create-epic` to continue."
- `defining-slices` / `refining-slices` -- "Slice work is in progress. Run `/gp:create-epic` to continue."
- `completed` -- "This epic is already completed."
- `abandoned` -- "This epic has been abandoned."

Without these, the implementer will need to decide whether to add them (risking inconsistency with the plan) or rely on the generic fallback (degraded UX). The `completed` and `abandoned` cases are especially important since they are terminal states that should never suggest running another skill.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Bug C verification assessment scope ambiguity**
The plan says "the existing completion-epic agent reads the epic's verification criteria (from `gp epic:show --json`) and independently assesses whether each criterion is met." The completion-epic agent is already spawned in Step 4 for cross-slice analysis. It's unclear whether Bug C intends the same agent spawn to also handle verification assessment, or whether a second spawn is needed. The current Step 7 runs after Step 4's agent has already returned. Given the orchestrator pattern's flat hierarchy and single-purpose agent spawns, this likely requires re-spawning the agent (or spawning a lighter-weight agent) specifically for verification assessment. The plan should clarify the spawn mechanics to avoid the implementer either (a) trying to combine two distinct tasks into one agent spawn or (b) breaking context discipline by having the orchestrator read verification artifacts itself.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound after two rounds of refinement. Module boundaries are respected: the start-epic rewrite correctly delegates to CLI commands (INV-001 compliant), the complete-epic fixes maintain context discipline, and the stale reference sweep correctly distinguishes between `/`-prefixed skill invocations and `$GP` CLI commands. The data flow for learnings rollup (Bug A) correctly matches the actual `learningInputSchema` and `completeEpicInputSchema` schemas verified against source. The quest creation syntax fix (Bug B) correctly uses stdin JSON matching the `createQuestInputSchema`. The architecture-proposal promotion concern from Round 1 is properly addressed -- `epic:activate` only transitions status, and the `create-epic` pipeline now handles architecture creation upstream.

The IMPORTANT issue is about explicit wrong-status handling completeness for a better implementation experience, not a structural concern. The plan would reach 10/10 with that clarification added.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
