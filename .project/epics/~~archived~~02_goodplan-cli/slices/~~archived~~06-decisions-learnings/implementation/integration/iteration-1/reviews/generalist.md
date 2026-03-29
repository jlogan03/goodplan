# Integration Review: Generalist

**Reviewer**: Generalist
**Score**: 9/10
**Findings**: Critical: 0, Important: 1, Minor: 3

## Summary

All 4 phases integrate cleanly. The implementation delivers all planned success criteria: 3 new state events with handlers, O(n^2) fix, 6 CLI commands (4 decision + 2 learning), full status command, universal `--query`, and schema command with INV-006 drift detection. tsc is clean, 702 tests pass.

## Goal Alignment

| Criterion | Status | Notes |
|---|---|---|
| 3 new state events (CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS) | Done | Wired in reduce.ts with exhaustiveness check |
| O(n^2) learnings rollup fix | Done | Both slice-complete.ts and quest-complete.ts use batch pattern |
| 6 CLI commands (4 decision, 2 learning) | Done | All registered in main.ts |
| Full status command | Done | Replaces stub with real artifact counts, recommendations, warnings |
| Universal --query | Done | Lifted to shared output() via globalArgs |
| Schema command (INV-006) | Done | Parallel registry with drift detection tests |

## Cross-Phase Integration

Phases integrate correctly:

- Phase 1 state events are consumed by Phase 2 CLI commands via RPC `begin()`.
- Phase 2 decision/learning commands use `loadState` (read-only) or `begin()` (write), matching the established pattern.
- Phase 3 status uses `assembleState` (correct for zero-state projects) and counts Phase 1's decisions/learnings.
- Phase 4 `--query` works across all commands from Phases 2-3 via shared `output()`.
- Schema registry includes all Phase 2 commands; drift detection tests ensure sync.
- No orphaned code found. All imports resolve. No dead exports.

## Regressions

No regressions detected. The O(n^2) fix in slice-complete.ts and quest-complete.ts preserves existing behavior (batch collect then single setEntry per scope). All 702 tests pass, including pre-existing tests.

## Findings

### Important

1. **`decision:create` uses `await begin()` but `decision:update` does not** (`src/commands/decision/create.ts:33` vs `src/commands/decision/update.ts:49`). `begin()` returns a synchronous result (not a Promise), so the `await` in create.ts is harmless but the inconsistency is a code smell. One of them should be updated to match the other.

### Minor

1. **Phase 4 plan tasks unchecked**: The plan file shows several Phase 4 verification items still unchecked (E2E walkthrough, binary regression, conventions update, architecture doc accuracy check). These are verification/documentation tasks, not code deliverables, but they should be completed for full plan compliance.

2. **`decision:update` schema accepts `id` in stdin but ignores it** (`src/schemas/commands/decision.ts:21`): The `updateDecisionInputSchema` has an optional `id` field in the stdin schema, but the command uses `args.id` (the `--id` flag) as authoritative. The stdin `id` is never used. This is documented in the schema description but could confuse consumers looking at the JSON Schema output from the `schema` command.

3. **Schema command human-readable mode bypasses `output()` for non-json/non-query** (`src/commands/global/schema.ts:408`): The schema command uses `process.stdout.write(JSON.stringify(...))` directly instead of routing through `output()` for the human-readable path. This means `--quiet` is not respected in the human-readable path (though `--quiet` on a schema command is an unlikely use case).

## Architecture Compliance

- State machine layer remains pure (no I/O imports in `src/core/state/`).
- Data Layer boundary respected: `countFiles` helper in `src/core/data/files.ts` keeps filesystem I/O out of commands.
- RPC layer correctly maps phases to events with exhaustive switch.
- Command layer follows established patterns (globalArgs spread, output() for all modes, readStdin + validateInput for stdin commands).
- ROLLUP_LEARNINGS handler includes deduplication logic for overlap with auto-rollup during COMPLETE_SLICE/COMPLETE_QUEST -- good defensive coding.
- `exactOptionalPropertyTypes` handled correctly in decision:update via conditional spread pattern.

## Test Coverage

Strong coverage across all phases:
- State: decision.test.ts (264 lines), rollup-learnings.test.ts (199 lines), slice-complete regression test (73 lines)
- Commands: decision-commands.test.ts (330 lines), learning-commands.test.ts (249 lines), status.test.ts expanded (326+ lines), schema.test.ts (256 lines) with INV-006 drift detection
- Utility: query.test.ts (39 lines), output-query.test.ts (68 lines)
