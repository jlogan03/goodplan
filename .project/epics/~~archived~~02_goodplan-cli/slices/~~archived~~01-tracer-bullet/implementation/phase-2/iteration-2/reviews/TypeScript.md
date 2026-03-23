# TypeScript Review: Phase 2 — Schemas & Minimal Data Layer (Iteration 2)

## Verification of Iteration 1 Fixes

All five issues from iteration 1 are confirmed resolved:

- **C1 (env var "undefined" bug)**: Fixed. Both `beforeEach` and `afterEach` now use `delete process.env.GOODPLAN_DIR` with inline biome-ignore comments explaining why. Correct.
- **I1 (writeEntity expected param)**: Fixed. Parameter added as `_expected?: T` with a JSDoc block documenting intent and rationale. The underscore prefix satisfies the linter for unused params.
- **I2 (GOODPLAN_DIR validation)**: Fixed. The docstring now explicitly states `GOODPLAN_DIR` must point to the `.project/` directory, not the project root. The error message echoes this expectation.
- **I3 (GoodplanError cause)**: Fixed. Constructor now accepts `cause?: unknown` and passes `{ cause }` to `super()` conditionally, preserving the error chain. The `cause !== undefined ? { cause } : undefined` guard is correct for `exactOptionalPropertyTypes`.
- **I4 (errorSchema exactOptionalPropertyTypes note)**: Fixed by documentation. A comment was added explaining why `detail: z.string().optional()` is acceptable for JSON output validation rather than being changed to match `GoodplanError.detail`. This is a valid resolution.

All 46 tests pass. TypeScript type check passes clean. Biome linter passes clean.

## Issues

**[MINOR]** Tab indentation in `deterministicStringify` — not verified as intentional in iteration 1, remains open

The `deterministicStringify` function uses `"\t"` for indentation (line 10 of `json.ts`). The iteration 1 review flagged this for verification. It has not been changed or documented. Biome's `indentStyle: "tab"` applies to source files, but JSON data files produced by this function are a separate concern — they live in `.project/`, which is explicitly excluded from Biome's `files.ignore`. Tab-indented JSON is unusual (most tooling defaults to 2-space or 4-space JSON), though it is valid. If this is intentional (matching the project's tab convention), a brief comment in `deterministicStringify` would close the question. If not, `2` or `"\t"` should be chosen deliberately.

File: src/core/data/json.ts:10
Resolution: USER_INPUT

**[MINOR]** `z.ZodType<T>` vs spec's `ZodSchema<T>` — minor naming divergence, no functional impact

The architecture spec (`data-layer-api.md`) uses `ZodSchema<T>` in the interface definition. The implementation correctly uses `z.ZodType<T>`, which is the actual Zod 4 export (`ZodSchema` is not exported from Zod 4). This is the right choice. The spec should be updated to say `z.ZodType<T>` to avoid confusion when future implementers consult it, but this is a documentation concern, not a code concern.

File: src/core/data/json.ts:34
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `resolveProjectDir` test at line 43 calls `resolveProjectDir()` with no `cwd` argument

The test "throws when GOODPLAN_DIR points to a non-existent path" sets `process.env.GOODPLAN_DIR` to a bad path and then calls `resolveProjectDir()` with no argument. This is fine because the env var check runs before the walk-up logic, so the bad path throws immediately. However, the test is subtly dependent on `GOODPLAN_DIR` being checked first — if the logic order changed, the test would silently start using the real `process.cwd()`. Passing `tmpDir` as the argument would make the test more robust and self-documenting. This is a low-severity style concern.

File: tests/unit/data/project.test.ts:43
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from iteration 1 are correctly resolved. The implementation is clean: generics are precise, type imports use `import type` where appropriate (satisfying `verbatimModuleSyntax`), Zod schemas infer their types rather than maintaining parallel type definitions, and the `exactOptionalPropertyTypes` interaction is handled correctly. Tests cover error paths thoroughly, including round-trip determinism. The remaining items are all minor — the tab indentation question is the only one that warrants user confirmation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
