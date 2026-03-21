# Architecture Refinement Goal

Good architecture for goodplan-cli means:

## Primary Quality Signals
- **Deep modules**: Each subsystem hides significant complexity behind a small interface. The state machine's single `reduce()` entry point is the gold standard.
- **Boundary quality**: Boundaries align with areas of likely change. Modifications in one subsystem don't ripple across others.
- **Pure state machine**: All transition logic is testable without I/O. Zero dependencies.
- **Simplicity**: Actively look for opportunities to simplify or reduce complexity. Every abstraction must earn its place.

## Secondary Quality Signals
- **Decision alignment**: Architecture respects all 13 active decisions in `.project/decisions/`.
- **Completeness**: Every capability in the design spec is addressed (entity CRUD, workflow transitions, context bundling, status).
- **Data flow clarity**: How state flows through load → reduce → commit is unambiguous.
- **Unidirectional dependencies**: No layer reaches upward.
