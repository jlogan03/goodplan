# Architecture Alignment Review — Round 2

**Score: 9/10** | Critical: 0 | Important: 1 | Minor: 2

## Summary

The round-1 fixes were applied correctly. The dependency description for slice 03 now names the schema module explicitly. The architecture.md conventions note about command routing clarifies the RPC bypass for read commands. The `status()` function is now present in slice 04's scope. Status enum values in slice 03 align with the transition tables. The remaining issues are one important gap (a missing RPC function in slice 04's success criteria) and two minor scope clarity items.

## Issue Detail

### Important

**04-rpc-core/goal-refining.md: `status()` is mentioned in scope but not covered in success criteria or verification.**
The Behavior section (item 8) and Scope Boundaries now correctly include `status()`. However, the success criterion `status({ type: 'epic', name: 'test' }) returns current epic status without triggering state transitions` is the only coverage, and the Verification steps (1–5) do not include a step for `status()`. The architecture defines `status()` as the function the `status` CLI command routes through (`rpc-layer-api.md` Command-to-RPC Routing table: `status → status(...)`). Without a verification step, an implementer could deliver an untested `status()` path and the slice would still pass. Given that slice 05's `status` command depends entirely on this function being correct, this is a gap that could silently propagate.

### Minor

**03-state-machine/goal-refining.md: Architecture flag note references reconciliation work but names no owner or resolution path.**
The Architecture Flag note reads: "EpicStatus/SliceStatus/QuestStatus enum values must be reconciled across state-machine-api.md, transition-tables.md, and these slice goals before implementation begins. The `To` column values in transition-tables.md are the source of truth." This is appropriate — but the note provides no explicit statement that the goal-refining.md enum list has already been updated to match. A reviewer or implementer reading this in isolation cannot tell whether the reconciliation has been done or is still pending. The note should state either "reconciliation complete — see enum values below" or "pending — do not implement until resolved." The ambiguity could cause an implementer to skip reconciliation believing it was already done, or to re-litigate it unnecessarily.

**06-commands-mutate/goal-refining.md: Sub-agent commands in success criteria omit `submit-plan` between `slice:plan` and `slice:refine-plan` in the full slice lifecycle path.**
The round-1 review flagged this. The refining file's success criteria item 2 still lists: `slice:create → slice:plan → start-plan/submit-plan → slice:refine-plan → start-refinement/submit-refinement → slice:implement → start-implementation/submit-implementation → slice:complete`. The transition tables require `submit-plan` to trigger `COMPLETE_PLAN` (advancing to `plan-created`) before `BEGIN_REFINEMENT` can be called via `slice:refine-plan`. The lifecycle as written implies `submit-plan` is an alternative to `slice:plan` rather than a separate step that must precede `slice:refine-plan`. An implementer reading only the success criteria could write a lifecycle test that skips the `submit-plan` → `plan-created` intermediate state. The round-1 review noted this; it appears unaddressed.

## What Works Well

- **Round-1 important issues resolved.** Dependency underspecification (03's schema dependency), enum mismatch note (architecture flag added), missing `status()` mention (now present) — all addressed.
- **Routing clarification for slice 05 is correct.** The refining file now explicitly names which commands route to Data Layer directly versus through RPC, matching the architecture's Command Routing convention.
- **Schema ownership is unambiguous.** Slice 02 owns all Zod schemas in `src/schemas/`; slice 03 consumes them. This matches the architecture's shared module pattern and INV-005.
- **Dependency graph remains consistent with architecture.** 01 → 02 → 04; 01 → 03 → 04; 04 → 05 → 06. The unidirectional layer ordering is preserved.
- **Slice 08 fitness functions align with architecture fitness function candidates.** Every candidate fitness function listed in the architecture files (data-layer-api.md, rpc-layer-api.md, invariants.md) has a corresponding test in slice 08's scope.
- **Slice 07 soft dependency is correctly characterized.** No hard code dependency; completing after 06 avoids rework from command surface changes.
