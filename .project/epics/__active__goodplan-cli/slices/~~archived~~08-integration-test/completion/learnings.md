# Learnings — 08-integration-test

## Plans must verify CLI command names and error codes against source

The plan invented error codes (`STATE_SLICE_NOT_FOUND`, `STATE_GUARD_FAILED`) and used imprecise command sequences (mixing state-transition commands with subagent submission commands). Caught during refinement but would have wasted implementation time. Future plans referencing CLI commands should grep `src/commands/main.ts` and `src/util/errors.ts` during `/create-plan`.

## Binary-spawning tests require explicit stdin

Without `stdin: ""` piped to `spawnSync`, the compiled binary blocks indefinitely waiting for input. This pattern isn't documented and was discovered empirically. All future integration tests must pass `stdin: ""` even when no input is needed.

## GOODPLAN_DIR env var is essential for test isolation

cwd-based `.project/` discovery walks up the directory tree and finds the repo's own `.project/`. Setting `GOODPLAN_DIR` in the spawned process environment is the only reliable isolation mechanism for integration tests.

## Data Layer invariants require direct module imports, not binary spawning

Concurrent modification detection, deterministic serialization, and schema validation operate within single function calls (`commitState`, `assembleState`). These properties aren't observable through the CLI binary interface. Future fitness function plans should make the binary-vs-import distinction explicit per invariant.

## Vitest globalSetup is the right binary compilation strategy

Compiling once via `globalSetup` and sharing across files is simple (~1s overhead). Skip-compilation heuristics based on `process.argv` are fragile — just always compile.

## Exporting existing internals beats creating new production code for fitness tests

Instead of a new `EVENT_TYPES` array that could drift, exporting the existing `handlerRecord` and deriving event types via `Object.keys()` reuses the compile-time exhaustiveness check already in place.
