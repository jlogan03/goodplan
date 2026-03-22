# Phase 5 Review: Refactor Init & Wire Full Stack

**Score: 9/10**

## Summary

Phase 5 successfully wires the full stack: `init` command calls `rpcInit` which orchestrates `assembleState -> reduce -> commitState`. The `status` command reads from the tree via `assembleState`. Old tracer bullet functions (`readEntity`, `writeEntity`, `readProject`, `writeProject`) are cleanly removed with no dangling references. Tests are comprehensive and all 256 pass. Conventions doc is updated. The implementation closely follows the plan.

## Critical (0)

None.

## Important (1)

1. **Unsafe cast in `rpc/init.ts` line 39: `result.code as GoodplanErrorCode`**
   `StateError.code` is typed as `string`, but the RPC layer casts it to `GoodplanErrorCode` without validation. Today only `STATE_ALREADY_INITIALIZED` flows through, which is a valid code. But as more events are added, a typo or new code in a transition handler would bypass the type system and produce a `GoodplanError` with an invalid code at runtime. Consider either: (a) narrowing `StateError.code` to `GoodplanErrorCode` in the schema, or (b) adding a runtime check/mapping in the RPC layer.

## Minor (2)

1. **`json.test.ts` file location mismatch** — The test file at `tests/unit/data/json.test.ts` now only tests `deterministicStringify`, which lives in `src/util/json.ts`. The file arguably belongs in `tests/unit/util/` to match the source layout. Low priority, but may cause confusion when someone looks for util tests.

2. **`buildStatusResult` TODO comment could reference the target slice** — The TODO at `status.ts:19` says "Replace this direct assembleState() call with RPC status() when that function is implemented in a later slice." Specifying which slice (or at minimum which epic phase) would help future developers find and resolve it.
