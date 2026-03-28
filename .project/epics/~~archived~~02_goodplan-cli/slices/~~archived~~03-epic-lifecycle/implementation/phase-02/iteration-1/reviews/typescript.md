## Issues

**[IMPORTANT]** SKIP_NAMES duplicated between assemble.ts and load.ts
The plan explicitly states: "Do NOT duplicate the skip rules; import the shared helpers." However, `load.ts` defines its own `SKIP_NAMES = new Set([CACHE_FILENAME, "node_modules"])` (line 37) rather than importing from `assemble.ts`. The `assemble.ts` version is `const` (not exported), so both files maintain independent copies. If a new skip name is added to one, it will be missed in the other. Export `SKIP_NAMES` from `assemble.ts` and import it in `load.ts`.
File: src/core/data/load.ts:37
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** CACHE_FILENAME duplicated between load.ts and commit.ts
`CACHE_FILENAME` is defined as `".state-cache.json"` in both `load.ts` (line 34) and `commit.ts` (line 23). This is a single source of truth violation -- if the filename ever changes, both files must be updated in sync. Export it from `load.ts` (which owns the cache format) and import in `commit.ts`.
File: src/core/data/commit.ts:23
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `readCache` returns `undefined` for invalid shape instead of throwing
In `load.ts` lines 102-112, when the cache has an invalid shape, `readCache` returns `undefined`, which causes `loadState` to call `assembleState` (the "no cache found" path). Meanwhile, `JSON.parse` failures throw, which causes `loadState` to call `assembleState` via the catch block (the "cache read/parse failed" path). Both paths end at the same result, but semantically an invalid-shape cache is a corrupt cache (like the parse failure), not a missing cache. This is cosmetic -- the behavior is correct either way -- but the debug messages differ ("no cache found" vs. "cache read/parse failed"), which could confuse during debugging. Consider throwing from the invalid-shape branch to use the "cache read/parse failed" path consistently.
File: src/core/data/load.ts:110
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `collectDirMtimes` only skips `SKIP_NAMES` for child entries, not the root
If `projectDir` itself were named something in `SKIP_NAMES` (unlikely but theoretically possible for `node_modules`), the function would still walk it. This is a non-issue in practice since `projectDir` is always `.project/`, but worth noting for completeness.
File: src/core/data/load.ts:124
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation with good test coverage, correct concurrent modification detection, and clean separation of concerns. The type safety is strong -- `noUncheckedIndexedAccess` is respected (e.g., line 255 in `load.ts` uses `currentContents[name]` with proper `undefined` checks, line 398 uses `!` assertion only after bounds check). The `as StateCache` cast in `readCache` (line 114) is acceptable given the manual shape validation above it. The two IMPORTANT issues (SKIP_NAMES and CACHE_FILENAME duplication) are straightforward fixes that would bring this to 9+. The plan was explicit about not duplicating skip rules, so that one is a direct plan violation.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
