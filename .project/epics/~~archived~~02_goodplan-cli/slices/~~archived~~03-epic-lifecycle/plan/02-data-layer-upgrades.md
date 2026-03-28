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

- [ ] Create `src/core/data/load.ts` — `loadState(projectDir?)`: read `.state-cache.json`, validate version/format. If valid: do `readdirSync` walk of `.project/` directories to detect new files not in cache (LLM-written markdown, etc.). For each new file: fully read and parse it (not stubs), add to the cached tree as the appropriate entry type (MarkdownEntry for .md, JsonEntry for registered .json, etc.). Return the updated tree. On cache miss, version mismatch, or parse error: fall back to `assembleState()`.
- [ ] Define cache format: `{ version: 1, state: ProjectState }` serialized as JSON. Version field enables future format changes.
- [ ] Update `commitState()` in `src/core/data/commit.ts` — add concurrent modification detection: before writing each changed JSON file, read current on-disk content and compare against the corresponding entry in `oldState`. If they differ (another process or user modified the file), throw `GoodplanError` with code `DATA_CONCURRENT_MODIFICATION` and detail `{ file: <relative-path> }`. Skip check for new files (not in oldState). Skip check for JSONL (append-only semantics handle concurrent appends naturally).
- [ ] Update `commitState()` to write `.state-cache.json` as the last step after all entity JSON + JSONL writes complete. Use the new state tree as cache content.
- [ ] Add `.state-cache.json` to the skip list in `assembleState()` (already present from slice 02 future-proofing — verify it works)
- [ ] Write unit tests for loadState: cache hit returns cached state, cache miss falls back to assembleState, stale cache version triggers full assembly, new LLM-written file detected and fully read, corrupt cache falls back gracefully
- [ ] Write unit tests for concurrent modification: externally modify a JSON file between assembleState and commitState → throws DATA_CONCURRENT_MODIFICATION with file path, new files skip the check, JSONL files skip the check

### Verification
`bun test tests/unit/data/` passes. Create fixture, run loadState → cache written. Modify fixture, run loadState → cache detects changes. Externally modify file → commitState throws DATA_CONCURRENT_MODIFICATION.
