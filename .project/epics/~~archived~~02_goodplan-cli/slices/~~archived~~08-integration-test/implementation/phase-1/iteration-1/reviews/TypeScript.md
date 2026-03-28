# TypeScript Review — Phase 1: Fixtures & Test Helpers

## Issues

**[IMPORTANT]** Temp directories created inside source tree without gitignore coverage
`withFixture` creates temp dirs inside `tests/integration/` (line 108: `path.join(import.meta.dirname ?? ".", ...)`) and `smoke.test.ts` line 26 does the same inside its own directory. If a test is interrupted before cleanup (kill signal, debugger stop), these leftover directories will show up in `git status`. The existing unit tests (`commit.test.ts`, `assemble.test.ts`, `load.test.ts`) have the same pattern, so this is a pre-existing convention -- but integration test fixtures are larger and more noticeable. Consider using `os.tmpdir()` instead, or add a gitignore pattern.
File: tests/integration/helpers.ts:108
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `withFixture` does not handle `SIGINT`/`SIGKILL` cleanup
The `finally` block in `withFixture` (line 121) handles normal exits and thrown errors, but if the process is killed externally (Ctrl+C during debugging), temp dirs leak. This is a known limitation of `finally` blocks with process signals. For test helpers this is acceptable, but worth documenting in a comment.
File: tests/integration/helpers.ts:111
Resolution: MINOR

**[MINOR]** `globalSetup` uses `stdio: "pipe"` -- build errors are silently swallowed
In `tests/global-setup.ts` line 14, `execFileSync` with `stdio: "pipe"` captures stdout/stderr. If `bun build` fails, `execFileSync` throws with a generic message. The actual compiler error output is in the thrown error's `stderr` property but may not be printed by Vitest's global setup handler. Consider `stdio: "inherit"` so build errors are directly visible, or catch the error and log `e.stderr.toString()`.
File: tests/global-setup.ts:14
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `vitest.config.ts` applies `globalSetup` (binary compilation) to ALL test runs including unit tests
The global setup compiles the binary before every `vitest` invocation, even when only running unit tests (`bun test tests/unit/`). This adds ~2-5 seconds of unnecessary compilation. Consider using Vitest's project/workspace feature or a conditional check in global-setup to skip compilation when no integration tests are selected.
File: vitest.config.ts:6
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `CommandOptions.env` merges with `process.env` but type is `Record<string, string>`
`process.env` values are `string | undefined`, but the spread `{ ...process.env, ...options?.env }` produces `Record<string, string | undefined>` which is then passed to `spawnSync`'s `env` option. This works at runtime but is technically a type mismatch. The `env` option on `SpawnSyncOptions` accepts `NodeJS.ProcessEnv` which allows `undefined` values, so this is safe, but the explicit `Record<string, string>` type on `CommandOptions.env` is slightly misleading since the merged result includes `undefined` values from `process.env`.
File: tests/integration/helpers.ts:26
Resolution: MINOR

## Score: 8/10

Solid implementation. The helpers are well-typed with proper `node:child_process` usage, fixtures comply with the Zod schemas (verified against `projectSchema`, `epicSchema`, `sliceSchema`, `overviewSchema`, `activityEntrySchema`), JSON keys are alphabetically ordered per INV-002, and the `vitest.config.ts` correctly wires global setup. The two IMPORTANT items (temp dir location, global setup applying to all tests) are the main things holding this below 9. Fixing the temp dir location (use `os.tmpdir()`) and making `stdio: "inherit"` on the global setup would bring it to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
