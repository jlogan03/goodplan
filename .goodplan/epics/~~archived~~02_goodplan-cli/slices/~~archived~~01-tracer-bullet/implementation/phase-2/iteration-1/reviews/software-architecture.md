# Software Architecture Review: Phase 2 — Schemas & Minimal Data Layer

## Issues

**[IMPORTANT]** GoodplanError code field should be a constrained union type, not a bare string

The `GoodplanError` class accepts `code: string`, which means any arbitrary string can be passed. Per INV-007, error codes are namespaced (DATA_*, STATE_*, VALIDATION_*) and map to specific exit codes (1/2/3). Without a constrained type, the exit code mapping in Phase 3 will rely on string prefix matching against untyped strings, which is fragile. A discriminated union or string literal type for error codes would make the exit code mapping type-safe and prevent typos in error codes (e.g., `DATA_FILENOT_FOUND` would be caught at compile time). This also helps Phase 3's error handler map codes to exit codes reliably.

Suggested fix: define a `GoodplanErrorCode` string literal union (or at minimum a `const` enum/object of known codes) in `errors.ts`, and type the `code` field to that union. Start with the DATA_* codes used in this phase and expand as new namespaces are added.

File: src/util/errors.ts:2
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `resolveProjectDir` returns the `.project/` path but `GOODPLAN_DIR` is not validated

When `GOODPLAN_DIR` is set, `resolveProjectDir` returns it directly without checking that it exists or is a directory. The walk-up path validates via `fs.existsSync` + `statSync`, but the env var path does not. This asymmetry means a typo in `GOODPLAN_DIR` will produce a confusing `DATA_FILE_NOT_FOUND` error from `readEntity` rather than a clear `DATA_NO_PROJECT` error from `resolveProjectDir`. The architecture doc says "resolved from the GOODPLAN_DIR environment variable if set" but does not say "blindly trust it."

Suggested fix: add existence and directory validation for the `GOODPLAN_DIR` path, throwing `DATA_NO_PROJECT` with a message mentioning the env var.

File: src/core/data/project.ts:20
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `writeEntity` uses `result.data` instead of `data` after validation — Zod 4 may strip or transform fields

Line 79 of `json.ts` serializes `result.data` (the Zod-parsed output) rather than the original `data`. This is actually correct behavior for ensuring only schema-valid data is written, but it has an architectural implication: if a Zod schema uses `.default()` or `.transform()`, the written data may differ from what the caller passed. This is fine architecturally (write what the schema says is valid), but the project should be aware and consistent. The `readEntity` function also returns `result.data` (line 61), so the read path is consistent.

However, this means that `writeEntity` is doing double duty: validation AND normalization. The architecture doc says "validates before writing — invalid data never reaches the filesystem" but does not mention normalization. If a future schema adds a `.default()` field, callers may be surprised that data they didn't provide appears in the file.

This is not a bug — it is the correct Zod behavior. But the project convention should be documented: schemas used with `readEntity`/`writeEntity` should not use `.default()` or `.transform()` to avoid silent normalization. Alternatively, explicitly document that normalization is intentional.

File: src/core/data/json.ts:79
Resolution: MINOR — no code change needed, but worth a code comment

---

**[MINOR]** `deterministicStringify` uses `localeCompare` for key sorting — should use plain comparison

`localeCompare` is locale-sensitive, meaning the sort order could vary across machines with different locale settings. For deterministic output (INV-002), a simple `a < b ? -1 : a > b ? 1 : 0` comparison or `a.localeCompare(b, 'en')` with an explicit locale would be more reliable. In practice, JSON keys are typically ASCII so this is unlikely to cause issues, but for a function whose entire purpose is determinism, this is worth tightening.

File: src/core/data/json.ts:22
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Test for `resolveProjectDir` with `GOODPLAN_DIR` does not verify it takes priority over a local `.project/`

The test at `project.test.ts:26` sets `GOODPLAN_DIR` and verifies it's returned, but there's no `.project/` directory in the test's tmpDir. A stronger test would create `.project/` in tmpDir AND set `GOODPLAN_DIR` to a different path, then verify `GOODPLAN_DIR` wins. This validates the documented priority: env var first, walk-up second.

File: tests/unit/data/project.test.ts:25
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `process.env.GOODPLAN_DIR = undefined` does not delete the env var

In `project.test.ts:12` and `:20`, setting `process.env.GOODPLAN_DIR = undefined` converts it to the string `"undefined"` in some runtimes (Node.js does this; Bun may or may not). The safe approach is `delete process.env.GOODPLAN_DIR`. This could cause `resolveProjectDir` to see `GOODPLAN_DIR = "undefined"` and return the literal string `"undefined"` as a path.

File: tests/unit/data/project.test.ts:12
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation that correctly establishes the Data Layer foundation. Module boundaries are clean — `json.ts` handles generic JSON I/O, `project.ts` provides entity-specific convenience, `errors.ts` provides structured errors, and schemas live in their own directory. The dependency direction is correct (data layer imports from schemas and util, not the reverse). Deterministic JSON and schema validation on both read and write paths satisfy INV-002 and INV-005. Test coverage is good with meaningful scenarios including round-trip determinism.

To reach 9+: address the untyped error code issue (IMPORTANT — this will compound as more error codes are added in later phases) and the `GOODPLAN_DIR` validation gap. The `localeCompare` issue and test improvements are minor polish.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
