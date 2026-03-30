# Integration Review: HMAC Signatures (All 4 Phases)

**Reviewer:** Generalist
**Score: 9/10**
**Critical: 0, Important: 1, Minor: 3**

## Goal Alignment

The implementation fully delivers on the plan's stated goals:

- **Every write signs:** `commitState()` calls `embedStateSignature()` after `diffTree()` but before flushing writes. The signature is always written to `project.json`, even when `diffTree` skipped it (the "create entry if missing" path at commit.ts:266-278). Correct.
- **Every read verifies:** `loadState()` calls `verifyHmacOrThrow()` on all non-cache-hit return paths (assembleState fallback, cache-read-error fallback, version-mismatch fallback, and incremental-update path). `state.ts` calls `verifyHmacOrThrow()` explicitly after `assembleState()`. `status.ts` was switched to `loadState()`. Correct.
- **Bootstrap works:** `verifyHmacOrThrow()` returns early when `stateSignature` is absent. First mutation via `commitState()` embeds the signature. Correct.
- **Verify commands work:** `gp verify` reads and checks, `gp verify --fix` recomputes and writes atomically. Both handle JSON/human output correctly. Correct.
- **Build defines:** Both `package.json` and `scripts/build-plugin.sh` inject `__GP_HMAC_KEY__` with dev fallback. `vitest.config.ts` and `tests/global-setup.ts` both define the key for their respective contexts. Correct.

## Cross-Phase Integration

The 4 phases connect correctly:

1. Phase 1 (hmac.ts) provides the core primitives. Phase 2 (commit.ts) calls `signStateTree()`. Phase 3 (load.ts) calls `verifyHmacOrThrow()` which calls `verifyStateTree()`. Phase 4 (verify.ts) calls both `signStateTree()` and `verifyStateTree()` directly, plus `atomicWrite()` exported from commit.ts.
2. The `embedStateSignature` function in commit.ts correctly injects the signature into the cached state too (lines 65-77), preventing cache/disk divergence where the cache lacks the signature.
3. The `verify --fix` path correctly bypasses `commitState()` and `loadState()` (using `assembleState()` directly), which is the intended escape hatch for broken signatures.
4. No orphaned code or dead imports across the 4 phases.

## Regressions

No regressions detected. Later phases did not break earlier phases:

- Phase 2's concurrent modification detection was updated to strip `stateSignature` from both sides of the comparison (commit.ts:336-360), preventing false concurrent-modification errors when the signature changes between reads and writes.
- Phase 3's `verifyHmacOrThrow` is a clean wrapper that doesn't interfere with the Phase 1 primitives.
- Fixture files were updated with precomputed `stateSignature` values, preventing test breakage from the schema change.

## Issues

### IMPORTANT

**1. Cache-hit path skips HMAC verification intentionally but documentation could be clearer about the security tradeoff**

`loadState()` line 92 returns cached state without HMAC verification when all directory mtimes match. The inline comment explains the tradeoff, but an attacker who modifies a JSON file's content without changing directory mtimes (possible on some filesystems, especially within the same second) would bypass verification until the next cache miss. The plan acknowledges this ("cache hit with matching mtimes -- trusted, no verification needed") and `gp verify` provides the explicit check, so this is a design decision not a bug. However, the `data-layer-api.md` documentation says "every read verifies" which is slightly misleading. Consider adding a note about the cache-hit exception to the architecture doc.

### MINOR

**2. `serializeForHmac` uses direct tree walking instead of `serializeStateTree` from the plan**

The plan specifies calling `serializeStateTree(state, { inline: false })` and then stripping `stateSignature`. The implementation instead walks the tree directly via a custom `serializeExcludingMarkdown()` function. This is actually a better approach -- it completely excludes markdown entries rather than replacing them with `true`, making the HMAC truly independent of markdown file presence/absence. The plan's approach would have been sensitive to markdown file additions/removals. The deviation is an improvement, but worth noting for plan/implementation traceability.

**3. `verifyStateTree` silently handles malformed hex input**

When `expectedSignature` is not valid hex, `Buffer.from(str, "hex")` silently produces a shorter buffer, and the length check at hmac.ts:103 returns `false`. This is correct behavior (malformed = mismatch), but the test at hmac.test.ts:137-140 only tests that malformed inputs return `false` without asserting the specific code path. Not a real issue -- just noting that the length-mismatch guard is the one doing the work for malformed inputs.

**4. `verify --fix` does not update the state cache**

The plan explicitly states this is intentional (cache staleness resolved on next `loadState()` via mtime invalidation). The implementation matches. Noting for completeness -- the next command after `--fix` will be slightly slower.

## Strengths

1. **Excellent test coverage**: 3 test files (unit/hmac, unit/verify, fitness/state-integrity) plus additions to unit/commit and unit/load. Tests cover the core invariant, tamper detection, bootstrap, markdown exclusion, write-read equivalence, and end-to-end via compiled binary.
2. **Clean separation of concerns**: `verifyHmacOrThrow()` as a reusable function keeps verification logic in one place. `embedStateSignature()` encapsulates the signing+embedding logic within commit.ts.
3. **INV-005 compliance**: Both the `commitState` path and the `verify --fix` path validate through `projectSchema.parse()` before writing. No bypass.
4. **Concurrent modification handling**: The `stateSignature`-stripping logic in `checkConcurrentModification` correctly prevents false positives from the new field.
5. **Timing-safe comparison**: HMAC verification uses `timingSafeEqual` with proper Buffer conversion and length check.
6. **Error messages**: The `DATA_INTEGRITY_CHECK_FAILED` error consistently directs users to `gp verify --fix`.
