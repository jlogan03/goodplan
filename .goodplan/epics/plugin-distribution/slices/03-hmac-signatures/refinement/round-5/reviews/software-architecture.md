# Software Architecture Review — HMAC Signatures Plan (Round 5)

## Issues

**[MINOR]** Phase 2: `commitState()` now has two serialization concerns (tree diffing + HMAC signing) without a clear separation

Phase 2 adds five sub-steps to `commitState()`: compute signature, shallow-clone the project node, validate through `projectSchema.parse()`, serialize, and update or create the `jsonWrites` entry. This is the correct behavior, but `commitState()` is evolving from a pure "diff and flush" function into one that also computes derived metadata. The current plan inlines all this logic directly into `commitState()`. At Developing maturity this is acceptable, but the plan could note that if additional derived-metadata fields are added in the future (e.g., a checksum, a write counter), the metadata computation should be extracted into a helper function. This is not actionable now — just a future-proofing observation to include as a comment.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: `state.ts` inline HMAC verification duplicates the verification logic from `loadState()`

Phase 3 says `state.ts` should add inline HMAC verification: "check signature if present, throw `DATA_INTEGRITY_CHECK_FAILED` on mismatch." Meanwhile `loadState()` does the same check on its non-cache-hit paths. This means the verification logic (check if `stateSignature` exists, call `verifyStateTree`, throw `DATA_INTEGRITY_CHECK_FAILED` with the fix hint message) exists in two places. The plan should specify that the verification logic is extracted into a shared helper (e.g., `assertStateIntegrity(state: ProjectState): void` in `hmac.ts`) that both `loadState()` and `state.ts` call. This keeps the HMAC module as the single owner of verification behavior and avoids the two call sites drifting. Phase 4's `verify.ts` command also performs verification (via `verifyStateTree` directly, which is correct since it does its own pass/fail output), so it would not use this helper — but `loadState` and `state.ts` should share one.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `verify --fix` writes `goodplan.json` without updating the state cache, relying on mtime invalidation — but the known limitation in `loadState` means content-only changes may not invalidate

The plan correctly notes that `verify --fix` intentionally skips the state cache update, relying on mtime invalidation on next `loadState()`. However, `loadState`'s cache validation uses *directory* mtimes, not file mtimes (see `collectDirMtimes` which calls `fs.statSync` on directories). Rewriting `goodplan.json` changes the file's mtime but also changes the root directory's mtime (because a file in it was modified via rename — the atomic write pattern). So this should work in practice. But `load.ts` lines 10-13 document a known limitation: "manually edited JSON files (content changes without file addition/removal) are not detected by the cache." The atomic write via temp+rename does modify the directory mtime (rename changes directory entry), so it should trigger invalidation. The plan should add a brief note confirming that `atomicWrite` (temp+rename) does change directory mtime, making cache invalidation reliable for this case. Without this note, an implementer reading the `loadState` known-limitation comment might second-guess the approach.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All four issues from round 4 have been successfully resolved:
- The INV-005 compliance gap in Phase 2 is fixed with explicit `projectSchema.parse()` before serializing.
- The `status.ts` switch rationale now explains why `loadState()` preserves zero-state behavior.
- The `atomicWrite` export includes a JSDoc comment constraining its use.
- The `serializeForHmac` structural coupling is documented with a comment.

The plan is architecturally sound. Module boundaries are respected: HMAC logic lives in `src/core/data/hmac.ts` (Data Layer), `commitState()` owns the write-path integration, `loadState()` owns the read-path integration, and `verify.ts` provides the user-facing escape hatch. The INV-001 exception for `verify --fix` is properly documented. The bootstrap exception (missing signature = skip verification) is a clean on-ramp for existing repos. The three remaining issues are all minor — one is a future-proofing note, one is a DRY improvement for verification logic, and one is a documentation clarification. Addressing them would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
