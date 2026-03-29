# TypeScript Review: Phase 3 — Command Framework

## Issues

**[IMPORTANT]** `INTERNAL_ERROR` is not a member of `GoodplanErrorCode`
In `outputUnexpectedError`, the error object is constructed with `code: "INTERNAL_ERROR"`, but this string literal is not in the `GoodplanErrorCode` union type. The `ErrorOutput` schema types `code` as `z.string()`, so it compiles — but the invariant INV-007 requires "a namespaced error code" for every error, and `INTERNAL_ERROR` is not namespaced (no `DATA_`/`STATE_`/`VALIDATION_` prefix). This also means there is no TypeScript-level exhaustiveness protection for this code path. Either add an `InternalErrorCode` to the union (e.g., `"INTERNAL_ERROR"`) or use a namespaced code like `"DATA_INTERNAL_ERROR"`. Adding a simple `"INTERNAL_ERROR"` literal to the union is fine since it is a catch-all for unexpected errors.
File: src/util/output.ts:53
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `output()` does not implement `--quiet` mode
The `OutputArgs` interface accepts `quiet?: boolean`, and the `globalArgs` definition in `main.ts` includes `--quiet`, but the `output()` function ignores the `quiet` flag entirely — it outputs the same content regardless. The commands-api.md specifies that `--quiet` should produce "minimal output (e.g., just the entity name or status)." Even if individual commands will format their own quiet output later, the `output()` utility should at minimum suppress output when `quiet` is true, or the contract should be documented. As-is, the flag is accepted but silently does nothing.
File: src/util/output.ts:16
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `ErrorOutput.detail` type is `string | undefined` but commands-api shows structured `detail`
The `errorSchema` defines `detail` as `z.string().optional()`, and the commands-api.md example shows `detail` as a structured object: `{ "slice": "01-auth", "currentStatus": "implementing", ... }`. The current schema only permits strings. This is fine for the tracer bullet (only string details exist today), but worth noting as a future mismatch. The comment in `error-output.ts` addresses `exactOptionalPropertyTypes` but not the type constraint itself.
File: src/schemas/error-output.ts:6
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--query` global flag not yet in `globalArgs`
The commands-api.md lists `--query` as a global flag, but it is not defined in `globalArgs` in `main.ts`. This is likely intentional for the tracer bullet (jqjs integration may come in a later phase), but it means the documented global flags and the implementation diverge. If this is deferred by design, no action needed — just flagging the gap.
File: src/commands/main.ts:7
Resolution: USER_INPUT

**[MINOR]** Tests don't clean up `process.exitCode`
In `src/index.ts`, `process.exitCode` is set on error paths but never reset. This is fine for the real CLI (process exits), but if `main()` were ever called from tests, the `exitCode` would leak. Not a problem today since the tests exercise utilities directly rather than the `main()` function, but something to be aware of for future integration tests.
File: src/index.ts:98
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation. Type safety is well-handled: tsconfig strict settings are all enabled and honored, the `GoodplanError` class uses a discriminated union for error codes, Zod is used correctly at validation boundaries with `z.infer` for type derivation. The `as const` on `globalArgs` is correct. The `readStdin` function properly handles TTY detection, size limits, and parse errors. The `validateInput` merge-and-validate pattern is clean and correct. Tests are well-structured with good edge case coverage. The two IMPORTANT issues (untyped `INTERNAL_ERROR` and inert `--quiet`) are what keep this from a 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
