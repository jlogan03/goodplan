# Slice 06: Slice Lifecycle Commands

## Goal

Implement the full `gp slice:*` command surface (~14 commands) including the chunk lifecycle (7 sub-commands), code refinement, and landing, with context bundle integration for phase-starting commands.

## In Scope

- `src/commands/slice/` -- all slice lifecycle commands:
  - Management: `slice:create`, `list`, `show`
  - Planning: `slice:plan-draft`, `plan-shape-*`, `plan-commit`
  - Implementation: `slice:implement-start`, `chunk-start`, `chunk-verify`, `chunk-complete`, `chunk-fail`, `chunk-skip`, `chunk-list`, `chunk-show`
  - Code refinement: `slice:code-refine-start`, `code-refine-commit`
  - Completion: `slice:land`, `abandon`
- Context bundle integration (slice phase-starting commands return ContextBundle)
- Integration tests in `tests/commands/`

## Out of Scope

- Epic lifecycle commands (slice 05 -- already done)
- Supporting commands (slice 07b)
- Skills that orchestrate slice execution (slice 10)

## Dependencies

- Slice 01-04 (engine + trust foundation)
- Slice 05 (epic-lifecycle-commands) -- slices exist within epics; need `epic:create` and `epic:activate`

## Verification

1. `gp slice:create` within an active epic produces valid events
2. Full lifecycle test: create -> plan-draft -> plan-commit -> implement-start -> chunk lifecycle -> code-refine -> land
3. Chunk lifecycle: start -> verify -> complete (and fail/skip paths)
4. `gp slice:show` displays correct derived state including chunk status
5. `gp slice:land` triggers appropriate completion events
6. Context bundle returned by phase-starting commands contains expected fields
7. Invariants enforce correct ordering (e.g., can't land without completing implementation)

## Verification Tier

**Tier: CLI binary integration tests**

Integration tests in `tests/commands/slice/` exercising the `gp` binary (resolved via absolute path) using `Bun.spawnSync` against a fixture repo. Pattern: create temp dir, init, create epic, activate, then exercise slice commands.

At minimum, cover:
- Slice creation within an active epic + list/show round-trip
- Full lifecycle: create -> plan-draft -> plan-commit -> implement-start -> chunk lifecycle -> code-refine -> land
- Chunk lifecycle paths: start -> verify -> complete, and start -> fail, and start -> skip
- Invariant enforcement: can't land without completing implementation, can't start chunk before implement-start
- Context bundle fields from phase-starting commands

## Estimated Sessions

2-3
