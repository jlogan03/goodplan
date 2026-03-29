# Phase 2: Data Layer Upgrades

Add loadState() with .state-cache.json caching and concurrent modification detection in commitState(). Independent from epic business logic — these are deferred improvements from slice 02.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/data/load.ts` — file not found
- [ ] `ls .project/.state-cache.json` after running `goodplan status` — file not found (no cache yet)

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/data/load.test.ts` — all cache tests pass
- [ ] `bun test tests/unit/data/commit.test.ts` — concurrent modification tests pass
- [ ] After running any command: `.project/.state-cache.json` exists

### Tasks

- [x] Create `src/core/data/load.ts` — `loadState(projectDir?)`: when `projectDir` is undefined, return `ZERO_STATE` directly with no cache interaction. Otherwise: read `.state-cache.json`, validate version/format. If valid: compare directory mtimes (cheap stat calls) to detect filesystem changes since cache was written. If mtimes unchanged, return cached state directly. If mtimes changed: do incremental `readdirSync` walk of changed directories to detect new/removed files not in cache (LLM-written markdown, etc.). For each new file: fully read and parse it (not stubs), determine the appropriate Zod schema via `findSchema()` from `src/core/data/schema-registry.ts`, and add to the cached tree as the appropriate entry type (MarkdownEntry for .md, JsonEntry for registered .json, etc.). The incremental path must import and use `assembleState()`'s existing skip logic (the `SKIP_NAMES` set from `assemble.ts` plus the schema registry lookup): unregistered JSON files are skipped, unknown file types are skipped, names in `SKIP_NAMES` are skipped — only recognized entry types are added to the tree. Do NOT duplicate the skip rules; import the shared helpers. Return the updated tree. On cache miss, version mismatch, or parse error: fall back to `assembleState()`. **Known limitation:** manually edited JSON files (content changes without file addition/removal) are not detected by the cache — only new/deleted files trigger incremental updates. Staleness is bounded: read-only commands may return stale data until the next mutation triggers `commitState()`, which always writes a fresh cache. The cache is rebuilt on next `commitState()` call.
- [x] Define cache format: `{ version: 1, writtenAt: string, dirMtimes: Record<string, number>, state: ProjectState }` serialized as JSON. `writtenAt` is ISO 8601 timestamp of cache creation. `dirMtimes` stores the mtime (ms since epoch) of each monitored directory at cache-write time, enabling comparison on next `loadState()` call. Version field enables future format changes.
- [x] Update `commitState()` in `src/core/data/commit.ts` — add concurrent modification detection: before writing each changed JSON file, read current on-disk content and compare against the corresponding entry in `oldState`. If they differ (another process or user modified the file), throw `GoodplanError` with code `DATA_CONCURRENT_MODIFICATION` and detail `{ file: <relative-path> }`. Skip check for new files (not in oldState). Skip check for JSONL (append-only semantics handle concurrent appends naturally).
- [x] Update `commitState()` to write `.state-cache.json` as the last step after all entity JSON + JSONL writes complete. Use the new state tree as cache content.
- [x] Add `.state-cache.json` to the skip list in `assembleState()` (already present from slice 02 future-proofing — verify it works)
- [x] Write unit tests for loadState: cache hit returns cached state, cache miss falls back to assembleState, stale cache version triggers full assembly, new LLM-written file detected and fully read, corrupt cache falls back gracefully
- [x] Write unit tests for concurrent modification: externally modify a JSON file between assembleState and commitState → throws DATA_CONCURRENT_MODIFICATION with file path, new files skip the check, JSONL files skip the check

### Verification
`bun test tests/unit/data/` passes. Create fixture, run loadState → cache written. Modify fixture, run loadState → cache detects changes. Externally modify file → commitState throws DATA_CONCURRENT_MODIFICATION.
