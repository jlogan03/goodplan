# Phase 3: Command Framework — Generalist Review

**Score: 9/10**

## Summary

Solid implementation that faithfully follows the plan and architecture docs. The code is clean, well-structured, and properly separates concerns. The custom runner in `src/index.ts` is thoughtfully designed — pre-parsing global flags to enable `badcommand --json`, pre-validating subcommands before citty dispatch, and mapping error types to correct exit codes. All verification criteria from the plan pass per the build report.

## Critical (0)

None.

## Important (1)

1. **`output()` function signature diverges from architecture spec** (`src/util/output.ts`)
   - The architecture (`commands-api.md` line 268) specifies `output(data, args: { json?: boolean; quiet?: boolean; query?: string })` — including `query` in the signature. The current `OutputArgs` interface only has `json` and `quiet`. While `--query` is deferred to Phase 5, the `output()` function is the central output path and its signature should match the architecture from the start, even if query handling is a no-op initially. This prevents a signature change when Phase 5 adds query support, and keeps the function aligned with the `globalArgs` definition in `main.ts` which will gain `query` in Phase 5.

## Minor (4)

1. **`globalArgs` in `main.ts` does not include `query`** — The architecture (`commands-api.md` Global Flags table) lists `--query` as a global flag. It is not present in `globalArgs`. Acceptable for this slice since Phase 5 adds it, but worth noting for completeness tracking.

2. **`outputError` detail field uses conditional spread** (`src/util/output.ts:36`) — The pattern `...(error.detail !== undefined ? { detail: error.detail } : {})` works correctly but is slightly more complex than needed. Since `deterministicStringify` will omit `undefined` values anyway (JSON.stringify drops them), you could simplify to `detail: error.detail` and let serialization handle it. However, this matters for the `ErrorOutput` type since `exactOptionalPropertyTypes` distinguishes between absent and `undefined`. The current approach is actually the safer one given the TypeScript config — this is more of a documentation note than a change request.

3. **No test for `outputUnexpectedError` in human mode** (`tests/unit/util/output.test.ts`) — The test file covers JSON mode for `outputUnexpectedError` but not the stderr human-readable path. The human mode path for `outputError` is tested, so the pattern is established — this is just a gap in `outputUnexpectedError` coverage.

4. **`isCLIError` type guard checks `error.name === "CLIError"`** (`src/index.ts:25`) — This relies on citty's internal error naming convention. A comment explaining this is a duck-type check because citty doesn't export `CLIError` would help future maintainers. The function's JSDoc partially covers this but could be more explicit about the fragility and what to check if citty behavior changes.

## Cross-File Integration

- `src/index.ts` correctly imports from `commands/main.ts`, `util/errors.ts`, and `util/output.ts` — all dependencies are properly wired.
- `output.ts` correctly imports `deterministicStringify` from `core/data/json.ts` and `ErrorOutput` from `schemas/error-output.ts` — reuses existing infrastructure rather than reimplementing.
- `errors.ts` is cleanly shared across `stdin.ts`, `validate.ts`, `output.ts`, and `index.ts` with consistent error code usage.
- The `GoodplanErrorCode` union type in `errors.ts` includes all codes referenced across all files — no orphan or missing codes.

## Code Reuse

Good. `deterministicStringify` from Phase 2's data layer is properly reused for JSON output formatting rather than creating a separate serializer. Error handling is centralized through `GoodplanError` and the `exitCodeForError` mapping.

## Completeness vs Plan

All plan tasks for Phase 3 are addressed:
- [x] `src/commands/main.ts` — citty main command with global flags
- [x] `src/util/output.ts` — output/error formatting with JSON/human modes
- [x] `src/util/stdin.ts` — TTY detection, JSON parsing, size limit, unit tests
- [x] `src/util/validate.ts` — merge semantics, Zod validation, unit tests
- [x] `src/index.ts` — custom runner with `runCommand`, error mapping, global flag pre-parsing
- [x] Unknown command handling with exit 2 and VALIDATION_UNKNOWN_COMMAND
- [x] Uncaught error wrapping with exit 1

The `--help` and `badcommand` verification criteria are confirmed passing in the build report.
