# Software Architecture Review — Phase 3: Read Path Integration

## Issues

**[IMPORTANT]** Cache-hit path skips HMAC verification entirely
The mtime-based cache hit path (load.ts line 113-115) returns `cache.state` directly without calling `verifyHmac()`. This is documented as intentional in the plan ("cache hit with matching mtimes -- trusted, no verification needed"), and the security model is tamper-detection not access-control, so cached state that was verified on the previous non-cache-hit load is reasonable to trust. However, the known limitation in load.ts's header (line 10: "manually edited JSON files content changes without file addition/removal are not detected by the cache") now has a higher consequence: a manual edit that doesn't change directory mtimes will return tampered state without HMAC verification until the cache is invalidated. The `gp verify` command (Phase 4) partially mitigates this, but it's a manual step. Consider whether `commitState` should invalidate the cache on mtime collisions, or whether the HMAC check should run unconditionally on all `loadState` returns. The current approach is a defensible tradeoff for Developing maturity -- just ensure this is documented as a known gap.
File: src/core/data/load.ts:113
Resolution: USER_INPUT

**[MINOR]** Duplicated HMAC verification logic between load.ts and state.ts
The inline HMAC verification in `state.ts` (lines 67-77) replicates the same pattern as `verifyHmac()` in `load.ts` (lines 53-69): read project node, check if signature exists, call `verifyStateTree`, throw `DATA_INTEGRITY_CHECK_FAILED`. This is justified by the architectural decision that `state.ts` uses `assembleState()` for ground-truth data, and the duplication is small (10 lines). But if the verification pattern ever changes (different error code, different message, additional checks), both sites need updating. A shared `verifyHmacOrThrow(state)` exported from `hmac.ts` would eliminate this. Low priority given Developing maturity.
File: src/commands/global/state.ts:67
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test uses try/catch pattern instead of Vitest matchers
The tampered-state test (load.test.ts lines 236-259) first asserts with `expect(...).toThrow(GoodplanError)`, then calls `loadState()` again inside a try/catch to inspect the error properties. This invokes `loadState` twice on tampered state. Vitest's `toThrowError` or a single try/catch with explicit fail would be cleaner and avoid the redundant call. Not a correctness issue -- just test hygiene.
File: tests/unit/data/load.test.ts:251
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. The read-path integration is thorough -- all `loadState` non-cache-hit paths and the `state.ts` direct-assembleState path verify HMAC. The `serializeForHmac` change to fully exclude markdown (rather than replacing with `true`) is a correct improvement that makes the HMAC immune to sub-agent markdown writes between commits. The `serializeExcludingMarkdown` recursive walker is clean, uses exhaustive switch, and correctly unwraps JSON/JSONL content while filtering markdown at the directory level. The bootstrap exception (missing signature = skip) is correctly implemented in both `load.ts` and `state.ts`. Error code addition follows existing conventions. Fixture signatures were updated to match the new serialization. Tests cover the three key paths (valid, tampered, bootstrap). The one point deducted is for the cache-hit gap which, while defensible, should be explicitly documented as a known limitation.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
