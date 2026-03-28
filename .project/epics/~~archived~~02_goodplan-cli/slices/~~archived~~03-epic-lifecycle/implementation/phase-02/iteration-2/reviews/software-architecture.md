# Software Architecture Review — Phase 02: Data Layer Upgrades (Iteration 2)

## Issues

**[MINOR]** State cache not Zod-validated on read (carried forward from iteration 1)
The `readCache` function (load.ts:98-113) uses a manual shape check and `as StateCache` cast rather than Zod validation. Per INV-005, schema validation should happen at every read boundary. The comment (lines 98-100) justifies this as acceptable for an internal-only format, which is a reasonable pragmatic choice. However, the `state` field (a full `ProjectState`) is trusted without any structural validation — a corrupted cache could inject arbitrary content. The risk is bounded by the fallback-to-assembleState behavior on any downstream error, but a malformed `state` that doesn't trigger errors could propagate silently. This remains a minor gap in defense-in-depth.
File: src/core/data/load.ts:98
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `writeStateCache` hardcodes `version: 1` instead of using `CACHE_VERSION` constant
`writeStateCache` in commit.ts (line 264) writes `version: 1` as a literal rather than referencing the `CACHE_VERSION` constant defined in load.ts. If the version is bumped in `CACHE_VERSION`, the cache writer would still produce version 1 caches. This is a minor manual-sync risk similar to the duplication issues fixed in this iteration.
File: src/core/data/commit.ts:264
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three IMPORTANT issues from iteration 1 are resolved correctly:
- **SKIP_NAMES** is now exported from `assemble.ts` and imported by `load.ts` — no duplication.
- **CACHE_FILENAME** is exported from `load.ts` and imported by `commit.ts` — single source of truth.
- **Validation divergence** is fixed: the incremental path now throws on schema validation failure, which triggers a fallback to `assembleState()` — both paths produce consistent behavior for corrupted files.

The two MINOR issues from iteration 1 are also addressed: `readCache` now throws on invalid shape (using the corrupt-cache debug path), and `checkConcurrentModification` uses single-serialization comparison.

Architecturally, the implementation is sound:
- **Dependency direction** is correct: commit.ts depends on load.ts (for `CACHE_FILENAME`, `collectDirMtimes`, `StateCache`), load.ts depends on assemble.ts (for `SKIP_NAMES`, `assembleState`). No circular dependencies.
- **Layering** is clean: load.ts and commit.ts are Data Layer with no business logic. The state cache is a transparent optimization that doesn't change the Data Layer's contract.
- **Crash safety** is correct: cache written last, stale cache triggers full assembly.
- **Module depth** is good: `loadState()` hides the full caching/mtime/incremental-update mechanism behind a single function call identical in signature to `assembleState()`.
- **Test coverage** is thorough: 27 tests passing across both files, covering cache hit/miss, version mismatch, corrupt cache, incremental file detection, concurrent modification detection, and the full round-trip path.
- **INV-001** (mutations through state machine): not violated — Data Layer only reads/writes.
- **INV-002** (deterministic key ordering): maintained — `deterministicStringify` used for all JSON writes.
- **INV-005** (schema validation at boundaries): enforced on all read/write paths. The cache is the one exception (documented, with fallback protection).
- **INV-007** (structured errors): `DATA_CONCURRENT_MODIFICATION` uses `GoodplanError` with proper code and detail.

The remaining two MINOR items are small consistency improvements that would bring this to a perfect score.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
