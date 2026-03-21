# Data Layer

## What We're Building
The complete data layer subsystem: the only code that touches the filesystem. Builds on the minimal data layer from slice 01 to add full state assembly (unified ProjectState from distributed JSON files), state cache (.state-cache.json), entity CRUD with Zod validation, JSONL read/append operations, concurrent modification detection, atomic writes, and structured debug logging.

## Behavior
1. `assembleState()` reads all JSON/JSONL files from `.project/`, computes `_derived` fields (file existence checks), and returns a unified `ProjectState` object.
2. `loadState()` reads the state cache if valid; falls back to `assembleState()` on miss or version mismatch. Always recomputes `_derived` fields.
3. `commitState(oldState, newState)` diffs the two states by key. For each changed key: verifies on-disk file matches `oldState` (concurrent modification detection), writes JSON files atomically (temp+rename), appends new JSONL entries. Updates cache last.
4. `readEntity(path, schema)` / `writeEntity(path, data, schema, expected?)` for individual JSON files with Zod validation on both read and write.
5. `readRecords(path, schema)` / `appendRecord(path, record, schema)` for JSONL files.
6. `readContent(path)` / `fileExists(path)` / `listDirectory(path)` / `directoryExists(path)` / `createDirectory(path)` for markdown and directory operations.
7. `GOODPLAN_DIR` environment variable overrides default `.project/` location.
8. When `--debug` or `GOODPLAN_DEBUG=1` is set, all data layer operations log to stderr: files read, files written, cache hits/misses, validation results.

## Success Criteria
- [ ] `assembleState()` on a fixture `.project/` with project.json, epic.json, slice.json, and learnings.jsonl produces a correctly-typed `ProjectState` with all keys
- [ ] `_derived` fields accurately reflect file existence — add a markdown file, reassemble, verify derived field updates
- [ ] `loadState()` returns cached state on second call (verify cache file exists). Delete cache, verify fallback to full assembly
- [ ] `commitState()` with a changed slice.json writes only that file — other files untouched (verify via mtime)
- [ ] `commitState()` throws `DATA_CONCURRENT_MODIFICATION` when on-disk file differs from oldState
- [ ] JSONL append adds one line without rewriting the file
- [ ] `writeEntity()` produces alphabetically-ordered JSON keys — round-trip test confirms byte-identical output
- [ ] `readEntity()` with malformed JSON throws with file path and Zod error details
- [ ] Atomic write: file is either old content or new content, never partial (test with large file)
- [ ] `GOODPLAN_DIR=/tmp/test goodplan status` reads from `/tmp/test/.project/`
- [ ] Debug logging outputs to stderr when `GOODPLAN_DEBUG=1` is set
- [ ] Binary regression: compiled binary `goodplan init` + `goodplan status --json` still works with the full data layer

## Verification
1. Create a fixture `.project/` directory with project.json, an epic, a slice, and some JSONL files.
2. Run unit tests: `bun test tests/unit/data/` — all state assembly, CRUD, JSONL, and cache tests pass.
3. Verify concurrent modification: programmatically modify a file between loadState and commitState calls — confirm the error is thrown.
4. Verify debug logging: set `GOODPLAN_DEBUG=1`, run `goodplan status`, inspect stderr for data layer trace output.
5. Verify GOODPLAN_DIR: `GOODPLAN_DIR=/tmp/test-proj goodplan init && GOODPLAN_DIR=/tmp/test-proj goodplan status --json` — verify it works against the alternate directory.
6. Binary regression test: compile binary, run `goodplan init` + `goodplan status --json` — verify tracer bullet commands still work with the full data layer.

## Scope Boundaries
**In scope:** Full Data Layer API (assembleState, loadState, commitState, entity CRUD, JSONL ops, content ops), all Zod schemas in `src/schemas/` (entity types, JSONL records, `ProjectState`), state cache, concurrent modification detection, atomic writes, deterministic key ordering, debug logging infrastructure, GOODPLAN_DIR support.
**Out of scope:** State machine (slice 03), RPC layer (slice 04), new CLI commands (slices 05-06). The tracer bullet's init/status commands continue to work but use the deeper data layer.
