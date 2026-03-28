# Software Architecture Review: Phase 3 — assembleState & commitState

## Issues

**[IMPORTANT]** JSONL append bypasses atomic write, creating inconsistency in write safety

`commitState` uses `atomicWrite` (temp + rename) for JSON files and new JSONL files, but uses `fs.appendFileSync` directly for JSONL appends (line 168 in commit.ts). If the process crashes mid-append, the JSONL file could end up with a partial line — a state that `assembleState` would then reject as invalid JSON on that line.

The architecture doc (data-layer-api.md) states: "Individual file writes are atomic (write to temp file, rename)." The current append path violates this for the append case. Since JSONL is append-only and the crash window is small, this is not critical — but it is an architectural inconsistency worth noting.

A possible fix: read existing content, append new lines, write atomically as a full file. The tradeoff is performance on large JSONL files vs crash safety. Given these are small audit logs, atomic full-write is likely fine.

File: src/core/data/commit.ts:167
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** JSONL validation in commitState validates ALL entries, not just new ones

In `processJsonlEntry` (lines 136-148), the schema validation loop iterates over the entire `newContent` array — including entries that already existed in `oldEntry.content` and were already validated during `assembleState`. For append-only semantics, only the new entries (indices `oldLength` to `newContent.length - 1`) need validation. This is both a correctness concern (re-validating already-persisted data) and a performance concern (O(n) on total entries instead of O(k) on new entries).

Fix: when `oldEntry` exists and is jsonl, validate only `newContent.slice(oldLength)`.

File: src/core/data/commit.ts:136
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `assembleState` signature diverges from architecture — `projectDir` is optional but architecture shows no default

The architecture doc (`data-layer-api.md`) defines `assembleState(projectDir?: string): ProjectState` with the note that undefined triggers zero state. The implementation matches this, but the caller contract is unusual — `undefined` means "no project" rather than "resolve project dir automatically." The `resolveProjectDir()` function exists in `src/core/data/project.ts` for automatic resolution. Consider whether the RPC layer or command layer should be responsible for calling `resolveProjectDir()` before passing to `assembleState`, and document that expectation. Currently it is unclear from the function signature alone.

This is a minor API design note, not a bug.

File: src/core/data/assemble.ts:30
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `GoodplanError` constructor call inconsistency in JSONL append error path

In the JSONL append error path (line 170-175), the `GoodplanError` constructor is called as:
```typescript
new GoodplanError("DATA_WRITE_ERROR", message, String(err), err)
```

The third argument is `detail` (typed as `string | Record<string, unknown> | undefined`), and the fourth is `cause`. Passing `String(err)` as `detail` and `err` as `cause` is valid but inconsistent with the JSON write error path (line 204) which uses the same pattern. Both should use a structured `detail` object with the file path for consistency with the JSON validation errors (which use `{ file: relativePath }`).

File: src/core/data/commit.ts:170
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation that faithfully follows the architecture. Module boundaries are clean — `assemble.ts` and `commit.ts` have narrow public APIs (one exported function each), depend only on the tree types, schema registry, and utilities, and have no upward dependencies. The recursive tree walk in assemble and recursive diff in commit are the right abstractions for this domain.

The JSONL append non-atomicity and over-validation are the two items preventing a 9. Both are straightforward fixes. The overall layering, separation of concerns, and data flow are correct.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
