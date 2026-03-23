# Phase 3 Merged Review: assembleState & commitState

**Reviewers:** Generalist (8/10), Software Architecture (8/10), TypeScript (8/10)
**Consensus Score:** 8/10

## Important (3)

### 1. JSONL append bypasses write-ordering and atomicity guarantees
**Files:** `src/core/data/commit.ts` ~line 167-168
**Raised by:** All three reviewers

Two related problems with JSONL appends:

**(a) Write ordering violated.** The plan and architecture specify "JSON first, JSONL second." New JSONL files are correctly deferred to the flush phase, but JSONL *appends* (`appendFileSync`) execute inline during `diffTree` traversal — before collected JSON writes are flushed. A crash after an append but before JSON writes could leave the activity log referencing entity state that was never persisted.

**(b) Atomicity violated.** The architecture states "individual file writes are atomic (write to temp file, rename)." Appends use `appendFileSync` directly, so a crash mid-append could produce a partial line that `assembleState` would reject.

**Fix:** Collect append operations into the `jsonlWrites` array (flagged as append vs new-file) and execute them after JSON writes during the flush phase. For atomicity, consider read-existing + append + atomic-full-write (acceptable given small audit log sizes).

### 2. JSONL validation in commitState re-validates all entries, not just new ones
**Files:** `src/core/data/commit.ts` ~lines 136-148
**Raised by:** All three reviewers

`processJsonlEntry` validates every entry in `newContent` against the schema, including entries already present in `oldState` that were validated during `assembleState`. The code comment on line 151 acknowledges "existing entries are trusted unchanged per INV-003 reducer purity," but the validation loop doesn't honor this. For a 1000-entry JSONL with 1 new append, all 1001 entries are validated.

**Fix:** When `oldEntry` exists and is jsonl, validate only `newContent.slice(oldEntry.content.length)`.

### 3. `resolveProjectDir` not updated per plan
**Files:** `src/core/data/project.ts`
**Raised by:** Generalist

The plan explicitly includes "Update `resolveProjectDir()` in `src/core/data/project.ts` to work with the new tree model." The file is unchanged — still imports from the old `json.ts`.

**Fix:** Update now per plan, or document as intentionally deferred.

## Minor (4)

### 4. `GoodplanError` constructor inconsistency in JSONL append error path
**Files:** `src/core/data/commit.ts` ~line 170-175
**Raised by:** TypeScript, Software Architecture

The JSONL append error passes `String(err)` as `detail` and `err` as `cause`. The JSON write errors use `{ file: relativePath }` as a structured `detail` object. Should be consistent — use a `Record` detail with the file path.

### 5. Empty catch block in atomic write cleanup
**Files:** `src/core/data/commit.ts` ~lines 201-202
**Raised by:** Generalist

The catch block swallowing `unlinkSync` cleanup errors violates the "no empty catch blocks" convention. A debug log would satisfy both the convention and the intent.

### 6. Missing test: JSON parse failure in assembleState
**Files:** `tests/unit/data/assemble.test.ts`
**Raised by:** Generalist

No test for malformed JSON (syntax error in a registered `.json` file). The `readJsonFile` function handles this case, and the JSONL equivalent *is* tested, but the JSON path is not.

### 7. No round-trip determinism test (fitness function candidate)
**Files:** `tests/unit/data/commit.test.ts`
**Raised by:** TypeScript

The architecture lists "JSON round-trip produces deterministic output" as a priority-2 fitness function: `assembleState() -> commitState()` on an unchanged tree produces byte-identical files. No such test exists yet. Low-effort, high-value.

## Not Merged (informational only)

- **`_rootDir` unused parameter in `readFile`** (TypeScript): `assemble.ts:93` — underscore-prefixed, likely reserved for future use. Add a comment if keeping.
- **`assembleState` optional `projectDir` caller contract** (Software Architecture): `assemble.ts:30` — `undefined` means "zero state" not "auto-resolve." Clarify in docs or at RPC layer. Not a bug.
- **`commitState` writes JSON without validation when schema is missing** (Generalist): `commit.ts:100-101` — worth considering rejecting writes for unregistered paths, since the state machine should only produce known entries.
