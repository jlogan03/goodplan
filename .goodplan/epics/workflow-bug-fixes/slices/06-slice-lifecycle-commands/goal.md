# Slice 06: Slice Lifecycle Commands

## Goal

Implement the full `gp slice:*` command surface: 21 commands (19 mutating + 2 read-only) covering the complete TDD chunk model, code refinement, and landing, with context bundle integration for phase-starting commands.

## In Scope

- `src/commands/slice/` -- all slice lifecycle commands:
  - Management: `slice:create`, `slice:list`, `slice:show`, `slice:abandon`
  - Planning: `slice:plan-draft`, `slice:plan-shape-start`, `slice:plan-shape-revise`, `slice:plan-shape-approve`, `slice:plan-shape-auto`, `slice:plan-commit`
  - Implementation: `slice:implement-start`
  - TDD Chunk Cycle: `slice:chunk-start`, `slice:chunk-red-written`, `slice:chunk-red-failed`, `slice:chunk-green`, `slice:chunk-verify`, `slice:chunk-unverifiable`, `slice:chunk-decide`
  - Code Refinement: `slice:code-refine-start`, `slice:code-refine-commit`
  - Completion: `slice:land`
- Context bundle integration (phase-starting commands: `plan-draft`, `implement-start`, `code-refine-start` return ContextBundle)
- Invariant enforcement for the complete lifecycle ordering
- Integration tests covering per-phase and full lifecycle
- Fitness tests for command registration and invariant engine

## Out of Scope

- Epic lifecycle commands (slice 05 -- already done)
- Supporting commands (slice 07b)
- Skills that orchestrate slice execution (slice 10)

## Dependencies

- Slice 01-04 (engine + trust foundation)
- Slice 05 (epic-lifecycle-commands) -- slices exist within epics; need `epic:create` and `epic:activate`

## Verification

1. `gp slice:create` within an active epic produces valid events
2. Full lifecycle test: create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> chunk-red-written -> chunk-red-failed -> chunk-green -> chunk-verify -> code-refine-start -> code-refine-commit -> land
3. TDD chunk lifecycle: start -> red-written -> red-failed -> green -> verify (and unverifiable -> decide path)
4. `gp slice:show` displays correct derived state including chunk status and phase
5. `gp slice:land` triggers appropriate completion events with deferred/learnings/architectureDelta
6. Context bundle returned by phase-starting commands contains expected fields
7. Invariants enforce correct ordering (e.g., can't land without code-refinement-converged, can't green without red-failed)
8. All 21 slice commands registered in `gp schema --json`

## Naming Note

`code-refinement-converged` and `chunk-*` events do not use the `slice-` prefix unlike other slice events. This matches `architecture/commands.md` and is accepted as-is. Potential follow-up naming cleanup tracked separately.

## Verification Tier

**Tier: CLI binary integration tests**

Integration tests in `tests/integration/` exercising the command surface via direct module import (vitest) and the compiled `gp` binary (fitness tests). Pattern: create temp dir, init, create epic, then exercise slice commands through the full lifecycle.

At minimum, cover:
- Per-phase integration: management, planning, chunks, completion
- Full lifecycle: single test walking init through landing
- Negative invariant tests: out-of-order transitions produce INVARIANT_FAILED
- Command registration fitness: all 21 commands in schema
- Invariant engine fitness: all slice/chunk rules registered with correct domains

## Estimated Sessions

2-3
