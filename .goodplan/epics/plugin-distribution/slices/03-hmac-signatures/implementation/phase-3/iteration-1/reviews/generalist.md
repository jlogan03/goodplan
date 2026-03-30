# Phase 3 Review: Read Path Integration

**Reviewer:** Generalist
**Score:** 9/10
**Verdict:** PASS

## Summary

Phase 3 integrates HMAC verification into the read path cleanly and completely. All plan tasks are checked off and the implementation matches the specified behavior. The `serializeForHmac` rewrite to fully exclude markdown entries (rather than replacing with `true`) is a sound fix that prevents HMAC failures when `.md` files are written directly to disk between commits. Code quality is high, tests cover the three key scenarios (valid signature, tampered state, bootstrap/missing signature), and the error code is properly registered.

## Findings

### Important (0)

None.

### Minor (2)

1. **Double invocation in tampered-state test** (`tests/unit/data/load.test.ts` lines 251-259): The test calls `loadState()` twice -- once in `expect(() => loadState(...)).toThrow(GoodplanError)` and again inside a `try/catch` block to assert the error code and message. This is wasteful (reads from disk twice, computes HMAC twice) and could be simplified to a single call with Vitest's `toThrowError` or a single try/catch. Not a correctness issue, but unnecessarily verbose.

2. **Two unfixed fixtures lack `stateSignature`** (`tests/fixtures/pagination/.goodplan/project.json`, `tests/fixtures/slice-refining-max-rounds/.goodplan/project.json`): These fixtures were not updated with signatures while four others were. The bootstrap exception means this is not a test failure, but it creates an inconsistency -- some fixture repos behave as "pre-HMAC" while others behave as "post-HMAC." If any test later loads these fixtures through `loadState()`, it would silently skip verification. Consider adding signatures for consistency, or document the omission as intentional bootstrap-path coverage.

## Checklist vs. Plan

| Task | Status |
|---|---|
| Modify `loadState()` with HMAC on all non-cache-hit paths | Done -- `verifyHmac()` called on assembleState fallback (3 paths) and incrementalUpdate path |
| Bootstrap exception (missing signature skips verification) | Done -- `verifyHmac` returns early when `signature === undefined` |
| Cache-hit path skips verification | Done -- line 114 returns `cache.state` directly |
| `status.ts` switched to `loadState()` | Done -- import and call updated, comment updated |
| `state.ts` keeps `assembleState()` with inline HMAC check | Done -- inline verification added with correct bootstrap guard |
| `DATA_INTEGRITY_CHECK_FAILED` error code added | Done -- added to `DataErrorCode` union and `ALL_ERROR_CODES` array |
| Three load.test.ts HMAC tests | Done -- valid signature, tampered state, bootstrap |
| `vitest.config.ts` define (noted as "already done in Phase 2") | Confirmed present |

## Architecture Alignment

- The `verifyHmac` helper in `load.ts` is well-factored -- single responsibility, clear bootstrap exception logic, proper use of `GoodplanError` with the correct error code.
- The `state.ts` inline verification correctly mirrors the `verifyHmac` logic but stays independent (as specified -- ground-truth data via `assembleState`, not cached).
- The `serializeExcludingMarkdown` rewrite uses an exhaustive switch with `never` guard, matching codebase conventions.
- The `incrementalUpdate` internal fallback to `assembleState` (line 249) is still covered by HMAC verification because the caller (`loadState` line 120) verifies after the function returns. No gap.
