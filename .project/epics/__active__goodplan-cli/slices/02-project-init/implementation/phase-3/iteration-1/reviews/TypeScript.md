# TypeScript Review: Phase 3 — assembleState & commitState

## Issues

**[IMPORTANT]** JSONL validation in commitState re-validates all entries, not just new ones

In `processJsonlEntry`, the validation loop iterates over the entire `newContent` array (lines 137-148) before checking whether the file is an append case (line 150). For an existing JSONL file with 1000 entries where 1 new entry is appended, this validates all 1001 entries. Since existing entries were already validated during `assembleState` and the reducer is pure (INV-003), this is wasted work. More importantly, it creates an asymmetry: the plan says "existing entries are trusted unchanged per INV-003 reducer purity" (the comment on line 151 says exactly this), but the code validates them anyway. The implementation should validate only the new entries (those past `oldLength`) when appending to an existing file.

File: src/core/data/commit.ts:137
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** JSONL append bypasses the write-ordering guarantee

The architecture (data-layer-api.md) and the plan both specify: "Write ordering: JSON first, JSONL second." The implementation collects JSON and new-JSONL writes into separate arrays and flushes them in order (lines 39-44 of commit.ts). However, the JSONL *append* path (line 168, `fs.appendFileSync`) writes immediately inside `processJsonlEntry` rather than being deferred to the flush phase. This means JSONL appends can execute before JSON writes complete, violating the crash-safety ordering guarantee. If the process crashes after a JSONL append but before the JSON writes, the activity log could reference entity state that was never persisted.

Fix: collect append operations into the `jsonlWrites` array as well (with a flag distinguishing "write new file" from "append to existing"), and execute them all during the flush phase after JSON writes.

File: src/core/data/commit.ts:168
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `GoodplanError` constructor call in commit.ts JSONL append has wrong argument pattern

The `GoodplanError` constructor signature is `(code, message, detail?, cause?)` where `detail` is `string | Record<string, unknown> | undefined`. At line 171, the append error path passes `String(err)` as `detail` and `err` as `cause`. This works, but it differs from the JSON write path which passes `{ file: relativePath }` as detail. For consistency and for better structured error output, the JSONL append error should also pass a `Record` detail with the file path, matching the JSON error pattern.

File: src/core/data/commit.ts:171
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `_rootDir` unused parameter in `readFile`

The `readFile` function accepts `_rootDir` as its first parameter (prefixed with underscore to suppress the unused-variable warning). This parameter is genuinely unused. While the underscore prefix is a standard TypeScript convention for intentionally-unused parameters, it suggests this was kept for a future use case. If it is not needed, removing it would be cleaner. If it is reserved for concurrent-modification detection in slice 03, a comment explaining that would be helpful.

File: src/core/data/assemble.ts:93
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No test for round-trip determinism (fitness function candidate)

The architecture (`data-layer-api.md`) lists "JSON round-trip produces deterministic output" as a priority-2 fitness function: `assembleState() -> commitState()` on an unchanged tree produces byte-identical files. The commit test suite verifies deterministic key ordering on write, but there is no test that reads files with `assembleState`, writes them back with `commitState`, and confirms byte-identical output. This is a low-effort, high-value test and a documented fitness function candidate.

File: tests/unit/data/commit.test.ts
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is solid and correctly follows the architecture. Type safety is well-handled throughout (proper `noUncheckedIndexedAccess` compliance, `type` discriminant checks, safe array access via `.slice()` + `.map()`). The code uses `verbatimModuleSyntax` correctly with `import type` where appropriate. Zod validation is present on both read and write paths per INV-005. The JSONL write-ordering issue is the most significant finding; fixing it and the validation efficiency issue would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
