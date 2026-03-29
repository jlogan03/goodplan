# Software Architecture Review — Phase 02: Data Layer Upgrades

## Issues

**[IMPORTANT]** Duplicated SKIP_NAMES between assemble.ts and load.ts
The plan explicitly states "Do NOT duplicate the skip rules; import the shared helpers." However, `load.ts` defines its own `SKIP_NAMES` set (line 37) that must be kept manually in sync with `assemble.ts` (line 23). If a new skip name is added to one but not the other, the incremental path and full assembly path will diverge silently. The comment "must match assemble.ts SKIP_NAMES" acknowledges the coupling but does not enforce it.
Fix: Export `SKIP_NAMES` from `assemble.ts` and import it in `load.ts`.
File: src/core/data/load.ts:37
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `CACHE_FILENAME` defined in both load.ts and commit.ts
The constant `CACHE_FILENAME = ".state-cache.json"` is defined independently in both `load.ts` (line 34) and `commit.ts` (line 23). This creates the same manual-sync risk as the SKIP_NAMES duplication — if one is changed without the other, the cache written by `commitState` would not be found by `loadState`.
Fix: Export `CACHE_FILENAME` from `load.ts` (where the cache format is defined) and import it in `commit.ts`.
File: src/core/data/commit.ts:23
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Incremental loadState silently swallows validation errors; assembleState throws
`assembleState` collects all schema validation errors and throws a `DATA_VALIDATION_ERROR` if any are found (INV-005). The incremental path in `loadState` uses `safeParse` and silently skips files that fail validation (lines 322-325 for JSON, lines 352-354 for JSONL). This means a corrupted JSON file on disk would be detected by `assembleState` but silently ignored by the incremental cache path, producing different state trees for the same filesystem — a correctness divergence.
Fix: When the incremental path encounters a file that fails schema validation, either (a) fall back to full `assembleState()` which will surface the error properly, or (b) collect and throw errors consistent with `assembleState`'s behavior.
File: src/core/data/load.ts:322
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Concurrent modification check compares serialized JSON (double-serialization cost)
`checkConcurrentModification` reads the on-disk file, parses it, then re-serializes both old content and disk content via `deterministicStringify` to compare. This works correctly but does two unnecessary serialize operations. A simpler approach: compare the on-disk raw bytes against `deterministicStringify(oldContent) + "\n"` (since commitState writes with trailing newline). This would be a single serialize instead of two. Not a correctness issue — just unnecessary work on the hot path of every changed JSON file write.
File: src/core/data/commit.ts:257
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** State cache is not schema-validated on read
The cache reader (`readCache`) does a manual shape check (has `version`, `writtenAt`, `dirMtimes`, `state` properties) and then casts with `as StateCache`. Per INV-005, schema validation should happen at every read boundary. While the cache is an internal format and the fallback to `assembleState` handles corruption gracefully, a Zod schema for the cache would be consistent with the validation-at-boundaries pattern used everywhere else. The `state` field in particular is trusted without any validation — a corrupted cache could inject arbitrary content into the returned `ProjectState`.
File: src/core/data/load.ts:101
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation correctly separates `loadState` and `commitState` responsibilities, maintains the unidirectional dependency flow (commit.ts depends on load.ts but not vice versa, no circular dependency), and the crash-safety ordering (cache written last) is sound. The concurrent modification detection is well-placed and the test coverage is thorough. However, the duplicated constants (SKIP_NAMES, CACHE_FILENAME) directly contradict the plan's instruction to share skip logic, and the validation divergence between the incremental and full assembly paths risks silent correctness bugs. Fixing the two IMPORTANT duplication issues and the validation divergence would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
