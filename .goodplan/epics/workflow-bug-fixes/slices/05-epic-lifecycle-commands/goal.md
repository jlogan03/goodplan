# Slice 05: Epic Lifecycle Commands

## Goal

Implement the full `gp epic:*` command surface (~20 commands) covering the epic lifecycle from creation through completion/abandonment, including context bundle integration for phase-starting commands.

## In Scope

- `src/commands/epic/` -- all epic lifecycle commands:
  - Creation: `epic:create`, `goal-draft`, `goal-commit`, `set-steering`
  - Exploration: `epic:explore-start`, `explore-conclude`, `research-capture`, `brainstorm-capture`
  - Architecture: `epic:architecture-draft`, `architecture-commit`, `architecture-shape-*`
  - Pressure test: `epic:pressure-test-draft`, `pressure-test-commit`, `pressure-test-finding-disposition`
  - Slices: `epic:slices-draft`, `slices-commit`, `slice-set-shape-*`
  - Lifecycle: `epic:activate`, `pause`, `resume`, `complete`, `abandon`
  - Query: `epic:list`, `epic:show`
- `src/context/` -- build the Context Bundler module: ContextBundle type, TokenBudget logic, per-phase bundle specs, inline vs reference selection, and architecture-current vs architecture-target selection. This is the bundler's owning slice -- slices 06+ consume the bundler, they don't build it
- Integration tests in `tests/commands/`

## Out of Scope

- Slice lifecycle commands (slice 06)
- Side-quest commands (slice 07b)
- Skills that orchestrate epic creation (slice 09)
- Full reviewer registry (slice 07a -- uses bootstrap reviewers from slice 04)

## Implementation Order Within Slice

This is the densest slice in the epic. Recommended internal sequencing:
1. **Context Bundler module** (`src/context/`) — ContextBundle type, TokenBudget, per-phase specs. ~1 session. Testable via unit tests with mock DerivedStateData.
2. **Core epic commands** (create, goal-draft/commit, list, show, activate, abandon) — ~1 session. These exercise the event engine + invariants.
3. **Phase-specific commands** (explore-*, architecture-*, pressure-test-*, slices-*, shape-*) — ~1-2 sessions. These integrate the context bundler and extractors.

If the slice overflows 3 sessions, split at the boundary between step 2 and step 3 (core lifecycle vs phase-specific commands).

## Dependencies

- Slice 01-03 (engine foundation) — event log, invariants, derived state
- Slice 04 (refinement-loop-extractors) — extractors for commit commands, refinement loop for shape checkpoints

## Verification

1. `gp epic:create` produces valid events and `gp epic:list` shows the new epic
2. Full lifecycle test: create -> explore -> architecture -> pressure-test -> slices -> activate -> complete
3. `gp epic:show` displays correct derived state at each phase
4. Shape checkpoint commands (`architecture-shape-*`, `slice-set-shape-*`) emit correct events
5. Context bundle returned by phase-starting commands contains expected fields
6. `gp epic:pause` / `resume` / `abandon` work correctly with proper invariant enforcement

## Estimated Sessions

3-4
