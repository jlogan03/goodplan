# TypeScript Review: Phase 2 — Schemas & Minimal Data Layer

## Issues

**[CRITICAL]** Test sets `process.env.GOODPLAN_DIR = undefined` which assigns the string `"undefined"`
In `tests/unit/data/project.test.ts`, both `beforeEach` (line 12) and `afterEach` (line 20) set `process.env.GOODPLAN_DIR = undefined`. In Node.js/Bun, assigning `undefined` to a `process.env` property coerces it to the string `"undefined"`, which is truthy. This causes `resolveProjectDir()` to return the string `"undefined"` instead of walking up the directory tree, making 3 tests fail. The fix is to use `delete process.env.GOODPLAN_DIR` instead.
File: tests/unit/data/project.test.ts:12
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `writeEntity` signature omits `expected?` parameter from architecture spec
The architecture's `data-layer-api.md` defines `writeEntity<T>(path, data, schema, expected?)` for concurrent modification detection. The implementation omits the `expected` parameter. While the plan says "minimal data layer," the `writeProject()` convenience function calls `writeEntity()` directly — if the `expected` parameter is added later, the call sites won't need to change. However, this is acceptable for the tracer bullet if the concurrent modification detection is scoped to a later slice. Noting for awareness — no change needed now, but the gap should be tracked.
File: src/core/data/json.ts:69
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `resolveProjectDir()` returns the `.project/` directory path, not the project root
The function name says "resolve project dir" but it returns the path to `.project/` (e.g., `/foo/bar/.project`), not the project root (`/foo/bar`). The architecture says "The project root is resolved from the `GOODPLAN_DIR` environment variable." This is ambiguous — does `GOODPLAN_DIR` point to the root or to `.project/`? The current implementation returns `.project/` which is consistent internally (callers join `project.json` to it), but the naming is misleading. The function should either be renamed to `resolveProjectMetaDir()` or documented clearly. The `GOODPLAN_DIR` env var semantics should also be documented — users would likely set it to the project root, not the `.project/` subdirectory.
File: src/core/data/project.ts:18
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `GoodplanError` does not set `Error.cause` for wrapped errors
In `json.ts` lines 43 and 93, when catching errors and re-throwing as `GoodplanError`, the original error is stringified and passed as `detail`. Using `Error.cause` (standard since ES2022) would preserve the error chain for debugging. The constructor could accept an optional `cause` and pass it to `super(message, { cause })`.
File: src/util/errors.ts:5
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `errorSchema` uses `.optional()` for `detail` — potential `exactOptionalPropertyTypes` drift
With `exactOptionalPropertyTypes: true`, Zod's `.optional()` infers `detail?: string | undefined`. The `GoodplanError` class declares `detail: string | undefined` (always present, can be undefined). These are different types under `exactOptionalPropertyTypes`. If `ErrorOutput` is ever used to serialize a `GoodplanError`, the shapes won't align. Consider whether `detail` should be `z.string().optional()` (may be absent) or `z.union([z.string(), z.undefined()])` (always present, can be undefined) to match the class.
File: src/schemas/error-output.ts:6
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `deterministicStringify` uses tab indentation — verify this matches project convention
The function uses `"\t"` for indentation in `JSON.stringify`. The Biome config and codebase use tabs for source code, but JSON files conventionally use spaces. Since these JSON files are checked into git (project.json), verify this is intentional. Tab-indented JSON is unusual and may cause friction with other tools.
File: src/core/data/json.ts:10
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The code is well-structured and demonstrates good TypeScript patterns — Zod schema inference, proper generics, type guards, atomic writes. However, 3 out of 43 tests fail due to a straightforward env var bug, which is a blocking issue. The `resolveProjectDir` naming ambiguity could cause confusion as the codebase grows. Fixing the test bug (CRITICAL) and addressing the naming clarity (IMPORTANT) would bring this to 8+. Fixing the `expected?` gap documentation and the minor items would reach 9.

## Summary
- Critical: 1
- Important: 2
- Minor: 3
