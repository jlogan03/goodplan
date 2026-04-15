# Slice 03: Derived State + Core Commands

## Goal

Build the derived state computer that streams events to produce current state, and implement the core bootstrap CLI commands: `gp init`, `gp status --json`, `gp schema`, and the `gp migrate` skeleton (v1 detection only).

## In Scope

- `src/engine/derived-state/` -- stream events -> DerivedStateData
- Accessor functions: currentPhase, validTransitions, blockers, suggestedNextSteps
- `gp init` command -- bootstrap project with `events.jsonl`, `project-initialized` event, subsystem registration
- `gp status --json` -- derived state with suggestedNextSteps and `--query` support
- `gp schema` command -- dump event schemas, command schemas
- `gp migrate` skeleton -- v1 detection (checks for `.state-cache.json`), not full migration
- Unit tests in `tests/engine/` and integration tests in `tests/commands/`

## Out of Scope

- Refinement loop (slice 04)
- Entity lifecycle commands (slices 05-07b)
- Full `gp migrate` implementation (slice 12)
- Derived state caching/optimization

## Dependencies

- Slice 01 (event-engine) -- event log reader/writer
- Slice 02 (invariant-engine) -- invariant checks on event append

## Verification

1. Derived state computer produces correct state from a sequence of test events
2. `gp init` creates a new project with valid `events.jsonl` and `project-initialized` event
3. `gp status --json` returns correct derived state including suggestedNextSteps
4. `gp status --json --query '.phase'` returns filtered output
5. `gp schema` dumps event and command schemas
6. `gp migrate` detects v1 projects (presence of `.state-cache.json`) and reports status

## Estimated Sessions

1-2
