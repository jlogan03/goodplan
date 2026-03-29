# Goal: Maturity Context Loading Across Skills

## What

Update all remaining skills to load and act on architectural maturity data. This is the integration layer that threads maturity awareness through the entire workflow.

## Why

Maturity tracking only works if every decision point in the workflow is aware of it. This quest ensures that when Claude is creating plans, defining slices, or completing work, it knows which subsystems are foundational (don't touch lightly) and which are experimental (change freely). Without this integration, maturity data sits in a file but doesn't influence behavior.

See "Maturity Integration Points" in `workflow.md` and `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md`.

## Key Design Decisions

### Two-Layer Architecture Awareness

With the two-layer architecture model (see initiatives-infrastructure goal), skills loading maturity data need to know which layer to read:

- **Side quests**: Load maturity from top-level `.project/architecture/` (current reality). Also reference active initiative architecture for compatibility awareness.
- **Initiative slices**: Load maturity from both the initiative's `architecture/` (target) and top-level (current reality). The target tells them where things are headed; current reality tells them what exists today.
- **`/create-plan` and `/refine-plan`**: Already have stale assumption detection (from initiatives-infrastructure quest). Maturity loading should use the same architecture sources.

## Success Criteria

1. `/create-plan` loads maturity table from the appropriate architecture source:
   - Plans involving maturing+ subsystems must reference architecture proposal justification
   - Plans must include fitness function update steps when changing maturing+ subsystems
   - Plans must include migration steps for dependents when changing contracts
2. `/define-slices` loads maturity table:
   - Slices touching maturing+ subsystems flagged in `goal.md`
3. Side quest planning (conversational, not a skill):
   - Guidance added to relevant references: if a side quest touches a maturing+ subsystem, suggest re-scoping as initiative
4. `/complete` (formerly `/complete-slice`) updated:
   - Suggests maturity promotions when subsystems have stabilized
   - Checks whether fitness functions were written/updated as planned
5. Implementation reviewer references updated:
   - Check that maturing+ subsystem changes match the plan (no ad-hoc changes)
   - Verify existing fitness functions still pass

## Dependencies

- Quest: initiatives-infrastructure (initiative directory structure must exist for initiative-scoped maturity checks)
- Quest: maturity-invariants-fitness (maturity conventions and reference files must exist before loading them)

## Out of Scope

- Defining the maturity conventions themselves (done by maturity-invariants-fitness quest)
- Initiative architecture proposals (done by initiatives-infrastructure quest)
