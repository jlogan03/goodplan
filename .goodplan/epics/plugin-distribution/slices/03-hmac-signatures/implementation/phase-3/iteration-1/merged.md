# Merged Review — Phase 3: Read Path Integration

**Score:** 9/10
**Verdict:** PASS
**Reviewers:** Generalist, software-architecture, typescript

## Summary

Strong implementation. Read-path HMAC verification is thorough and correct: all `loadState` non-cache-hit paths and the `state.ts` direct `assembleState` path verify HMAC. The `serializeForHmac` rewrite to fully exclude markdown (rather than replacing with `true`) is a sound fix that makes signatures immune to sub-agent markdown writes between commits. The exhaustive switch with `never` guard, bootstrap exception logic, error code registration, and fixture updates all follow codebase conventions. No critical issues.

---

## Issues

### Important (1)

**[IMPORTANT] Cache-hit path skips HMAC verification — document as known gap**
`load.ts:113-115` returns `cache.state` directly on mtime-based cache hits without calling `verifyHmac()`. This is intentional per the plan and defensible (state was verified on the prior non-cache-hit load; the security model is tamper-detection, not access control). However, the existing known limitation — that manual JSON edits that don't change directory mtimes bypass the cache — now carries higher consequence: tampered state can be returned without verification until the cache is invalidated. `gp verify` (Phase 4) partially mitigates this, but it's a manual step. No code change required at Developing maturity, but the known-gap comment in `load.ts` should explicitly call out the HMAC implication.
Resolution: USER_INPUT
File: `src/core/data/load.ts:113`

---

### Minor (3)

**[MINOR-1] Double invocation of `loadState()` in tampered-state test**
`tests/unit/data/load.test.ts:236-259` calls `loadState()` once inside `expect(...).toThrow(GoodplanError)` and again inside a manual `try/catch` to inspect `.code` and `.message`. This is wasteful (reads disk, computes HMAC twice) and — per the TypeScript reviewer — creates a subtle masking risk: if the first assertion passes but the second call doesn't throw (e.g., due to a caching side-effect), the property assertions silently never run. Fix: use a single `try/catch` with an explicit `fail()` fallback, or Vitest's `toThrowError()` matcher to inspect error properties in one call.
Resolution: DIRECTLY_ACTIONABLE
File: `tests/unit/data/load.test.ts:251`

**[MINOR-2] Duplicated HMAC verification logic between `load.ts` and `state.ts`**
The check pattern (get project node, check signature presence, call `verifyStateTree`, throw `DATA_INTEGRITY_CHECK_FAILED`) exists as `verifyHmac()` in `load.ts` and inline in `state.ts:68-77`. The duplication is small (~10 lines) and architecturally justified — `state.ts` uses `assembleState()` for ground-truth data rather than `loadState()`. Low priority, but extracting a shared `verifyHmacOrThrow(state)` from `hmac.ts` would eliminate dual maintenance if the verification pattern ever changes.
Resolution: DIRECTLY_ACTIONABLE
Files: `src/core/data/load.ts`, `src/commands/global/state.ts:67`

**[MINOR-3] `serializeExcludingMarkdown` returns `undefined` for unreachable markdown case instead of throwing**
`hmac.ts:74`: the `"markdown"` case returns `undefined`. The comment notes this branch is unreachable (markdown entries are filtered at the directory level before recursion). However, returning `undefined` means a top-level markdown entry passed directly would be silently dropped by `deterministicStringify`, while the `default` case throws. Returning `undefined` is purely theoretical given `ProjectState` is always a `DirectoryEntry`, but throwing here would be more consistent with the defensive `never` guard pattern used elsewhere.
Resolution: DIRECTLY_ACTIONABLE
File: `src/core/data/hmac.ts:74`

---

## What Reviewers Agreed On

- Implementation is complete and correct against the plan checklist
- `serializeForHmac` markdown-exclusion rewrite is the right approach
- Bootstrap exception (missing signature skips verification) is correctly implemented in both `load.ts` and `state.ts`
- Cache-hit skip is intentional and acceptable; needs documentation
- Double-invocation test issue is real (raised by all three reviewers; TypeScript reviewer elevated to Important due to masking risk)
- Duplication between `load.ts` and `state.ts` is minor and architecturally justified (raised by both architecture and TypeScript reviewers)

## Contradictions / Resolutions

- The double-invocation issue was Minor for the generalist and architecture reviewers, but Important for the TypeScript reviewer (masking risk argument). Merged as **Minor-1** — the masking scenario requires both a real race/cache-side-effect AND the first assertion passing, which is implausible in practice. Still worth fixing.
- The two unsigned fixtures (`pagination`, `slice-refining-max-rounds`) were flagged by the generalist as an inconsistency. Not raised by other reviewers. Not included as a standalone issue — the bootstrap path coverage interpretation is reasonable and the generalist explicitly noted it's not a test failure.
