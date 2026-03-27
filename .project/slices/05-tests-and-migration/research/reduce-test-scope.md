# Research: `reduce.test.ts` STATE_ALREADY_INITIALIZED Scope

## What Was Investigated

Whether the `STATE_ALREADY_INITIALIZED` test at line 84 of `tests/unit/state/reduce.test.ts` relates to `init` or `migrate`.

## Key Findings

**The test relates to `init` (INIT_PROJECT event), not migrate.** Keep as-is.

Lines 84-100 show:
- It uses `reduce(ZERO_STATE, { type: "INIT_PROJECT", ... })` to create initial state
- Then calls `reduce(initialState, { type: "INIT_PROJECT", ... })` a second time
- Asserts the result is a `StateError` with code `STATE_ALREADY_INITIALIZED`

This tests the state machine's guard: you cannot `INIT_PROJECT` on an already-initialized project. This is a pure reducer test for the init transition, not migration.

Migration (`rpcMigrate`) throws `STATE_ALREADY_INITIALIZED` separately (line 1003 of migrate.ts) via a filesystem check (`project.json` exists), but that is RPC-level logic that bypasses `reduce()` entirely (per the INV-001 exception documented at the top of the file).

## Recommendation

**No changes needed.** This test is purely about the `INIT_PROJECT` reducer guard and is unaffected by the entity-restructuring epic. It does not reference slice paths or epic paths.
