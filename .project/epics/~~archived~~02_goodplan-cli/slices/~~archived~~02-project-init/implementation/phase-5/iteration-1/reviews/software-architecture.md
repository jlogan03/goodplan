# Software Architecture Review — Phase 5: Refactor Init & Wire Full Stack

## Issues

**[IMPORTANT]** RPC init uses `assembleState()` instead of `loadState()` per architecture

The RPC layer API doc (`rpc-layer-api.md`) specifies that mutation operations should "Load state via Data Layer (`loadState()`)" and the Dependencies section says the RPC layer depends on `loadState()`, `commitState()`. However, `rpcInit()` calls `assembleState()` directly. While `loadState()` (the caching wrapper) is deferred to slice 03, the RPC function should be written against the target API name so it doesn't need to be revisited later. Currently the direct `assembleState()` call in `status.ts` has a TODO comment explaining this temporary arrangement, but the RPC function in `init.ts` does not — making it look intentional rather than temporary.

File: src/core/rpc/init.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Unsafe `as GoodplanErrorCode` cast on `StateError.code`

`StateError.code` is typed as `string` (from `state-events.ts`), and it is cast to `GoodplanErrorCode` with `result.code as GoodplanErrorCode`. If the state machine ever returns an unrecognized code string, this cast silently passes the type system and propagates a non-union-member error code. The fix is to either: (a) narrow `StateError.code` to `GoodplanErrorCode` in the schema definition, or (b) validate the code at the RPC boundary with a runtime check and fall back to `INTERNAL_ERROR` for unknown codes. Option (a) is architecturally cleaner since state error codes should be a known subset of the error code union.

File: src/core/rpc/init.ts:39
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `status.ts` directly calls `assembleState()` without TODO tracking the deviation

The `buildStatusResult()` function correctly has a TODO comment about replacing the direct `assembleState()` call with an RPC `status()` function. However, the architecture (`rpc-layer-api.md`) says read-only commands bypass RPC and go "directly from Commands to the Data Layer". The TODO suggests routing through RPC instead, which contradicts the architecture's statement that `status` and `list`/`show` are read-only and bypass RPC. The TODO should be reconciled with the architecture — either the architecture should be updated to route `status` through RPC (it is listed in the RPC Command-to-RPC Routing table), or the TODO should be removed since direct Data Layer access is the intended pattern for read-only commands.

File: src/commands/global/status.ts:18-19
Resolution: USER_INPUT

**[MINOR]** `InitResult` interface not exported from a barrel/index — no public API surface contract

The `InitResult` interface is defined locally in `src/core/rpc/init.ts`. As the RPC layer grows, each function defining its own result type in its own file will scatter the public API surface. The architecture mentions `BeginResult`, `SubmitResult`, `CompleteResult`, `StatusResult` as shared RPC types. Consider establishing a `src/core/rpc/types.ts` for RPC result types to keep the public API surface discoverable. Not urgent for a single function, but worth planning for.

File: src/core/rpc/init.ts:14-18
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation correctly follows the 4-layer architecture: Commands -> RPC -> State Machine + Data Layer -> Filesystem. Dependency direction is correct throughout. The state machine remains pure (no I/O). The `json.ts` and superseded functions in `project.ts` are cleanly removed with no dangling references. Test coverage is thorough, including tree structure verification and quiet mode. The `as GoodplanErrorCode` cast and the `assembleState` vs `loadState` deviation are the main items preventing a 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
