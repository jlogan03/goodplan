# Goal: Architectural Maturity, Invariants, and Fitness Functions

## What

Establish the conventions and reference files for architectural maturity tracking, system invariants, and fitness functions. Update `/define-architecture`, `/refine-architecture`, and `/audit-architecture` to work with these concepts. Update plan refinement reviewers to check plans against invariants and fitness functions.

## Why

As the project evolves, subsystems accumulate confidence, investment, and dependents. Maturity tracking (experimental → developing → maturing → foundational) prevents casual changes to battle-tested foundations. Fitness functions are automated tests of architectural properties. System invariants are documented constraints that all plans must respect. Together, these prevent quality degradation as the system grows.

See `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` for full design.

## Key Design Decisions

### Architecture Location

With the two-layer architecture model (see initiatives-infrastructure goal), `/define-architecture` writes to the active initiative's `architecture/` directory — not top-level. The maturity table in `_overview.md` and `invariants.md` are created within the initiative. They get promoted to top-level as slices complete.

For the first initiative specifically, this is the only architecture — top-level starts as a scaffold.

## Success Criteria

1. Maturity table format defined and documented — lives in `architecture/_overview.md` with columns: Subsystem, Maturity, Dependents, Fitness Functions, Notes
2. `architecture/invariants.md` convention established — format, examples, how to add/amend
3. Fitness function convention established — how they're documented in architecture files, how they map to actual tests
4. `/define-architecture` updated to:
   - Create initial maturity table in `_overview.md`
   - Create initial `invariants.md`
   - Identify fitness function candidates for subsystems
   - Write to the active initiative's architecture directory (not top-level directly)
5. `/refine-architecture` updated to evaluate maturity levels and propose promotions/demotions
6. `/audit-architecture` updated to:
   - Compare fitness functions against actual code
   - Check if invariants are being respected
   - Suggest maturity promotions where appropriate
7. Plan refinement reviewer references updated to:
   - Check plans against system invariants
   - Verify plans don't violate existing fitness functions
   - Scrutinize changes to maturing+ subsystems more carefully
8. Shared reference file(s) created for maturity/invariants/fitness conventions (consumed by multiple skills)

## Dependencies

- None (can run in parallel with archived-prefix-migration and complete-rename)

## Out of Scope

- Loading maturity context into `/create-plan`, `/define-slices`, side quest planning (handled by maturity-context-loading quest)
- Initiative architecture proposals (handled by initiatives-infrastructure quest)
