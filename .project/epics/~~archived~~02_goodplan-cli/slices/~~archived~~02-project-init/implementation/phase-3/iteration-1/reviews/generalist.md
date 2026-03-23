# Phase 3 Review: assembleState & commitState

**Reviewer:** Generalist
**Score:** 8/10
**Verdict:** Solid implementation that faithfully follows the plan and architecture specs. A few issues worth addressing before moving on.

## Critical (0)

None.

## Important (3)

### 1. JSONL append bypasses atomic write / write-ordering contract
**Files:** `src/core/data/commit.ts` lines 167-168

The plan specifies write ordering: "JSON first, JSONL second (collect writes into two arrays, flush JSON array then JSONL array)." For new JSONL files this works correctly — they go into `jsonlWrites` and are flushed via `atomicWrite` after JSON. But JSONL appends (`appendFileSync` at line 168) happen inline during `diffTree` traversal, which means they execute *before* the collected writes are flushed. This breaks the crash-safety ordering guarantee: an appended JSONL could be written before its related JSON entity file.

**Fix:** Collect append operations into the `jsonlWrites` array (or a separate appends array) and execute them after JSON writes, alongside new JSONL writes.

### 2. JSONL validation runs on ALL entries for appends, not just new ones
**Files:** `src/core/data/commit.ts` lines 136-148

`processJsonlEntry` validates every entry in `newContent` against the schema, including entries already present in `oldState`. Per INV-003 (reducer purity) and the plan ("existing entries are trusted unchanged"), re-validating old entries is redundant work. For large JSONL files this could become a performance concern.

**Fix:** When `oldEntry` exists and is jsonl, only validate `newContent.slice(oldEntry.content.length)`.

### 3. `resolveProjectDir` not updated per plan task
**Files:** `src/core/data/project.ts`

The plan explicitly includes: "Update `resolveProjectDir()` in `src/core/data/project.ts` to work with the new tree model." The file is unchanged — it still imports `readEntity`/`writeEntity` from the old `json.ts`. While Phase 5 will eventually remove `readProject`/`writeProject`, the plan assigns this update to Phase 3.

**Fix:** Either update now per plan, or document as intentionally deferred.

## Minor (3)

### 4. `commitState` validates JSON even when schema is missing
**Files:** `src/core/data/commit.ts` lines 100-101

If `findSchema` returns `undefined`, the JSON entry is written without validation. The architecture says "Schema validation on every read and every write" (INV-005). While `assembleState` correctly skips unregistered JSON, `commitState` should arguably reject writes for unregistered paths since the state machine should only produce entries with known schemas.

### 5. Empty catch block in atomic write cleanup
**Files:** `src/core/data/commit.ts` lines 201-202

The `catch` block swallowing cleanup errors on `unlinkSync` is understandable (cleanup failure shouldn't mask the original error), but per conventions: "No empty catch blocks." A debug log would satisfy both the convention and the intent.

### 6. Missing test: JSON parse failure in assembleState
**Files:** `tests/unit/data/assemble.test.ts`

The plan calls for testing `.json` validation failure, which is covered. But there's no explicit test for malformed JSON (syntax error in a registered `.json` file, not just schema-invalid content). The `readJsonFile` function handles this case (line 130-133 of assemble.ts), but it's not tested. The JSONL equivalent *is* tested ("handles JSONL with invalid JSON on a line").

## Observations

- `deterministicStringifyCompact` for JSONL is a good addition — keeps lines readable while maintaining determinism.
- Debug logging is well-placed and informative without being noisy.
- The `GOODPLAN_DEBUG` env var is properly documented in `conventions.md`.
- Test coverage is thorough for the happy path and most error paths.
- The busy-wait in the "does not rewrite unchanged JSON" test (lines 214-217 of commit.test.ts) is fragile but acceptable for unit testing mtime resolution.
