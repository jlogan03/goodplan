# TypeScript Review — Phase 2: Integration Tests (Iteration 1)

## Issues

**[IMPORTANT]** Unsafe property access on `result.json` without narrowing `unknown`

Throughout all test files, `result.json` is typed as `unknown` (per the `CommandResult` interface in helpers.ts), but tests cast it with `as Record<string, unknown>` or `as { error: { code: string } }` without runtime narrowing. If the binary's JSON output shape changes or the parse fails, the test will throw a confusing runtime error (cannot read property of undefined) rather than a clear assertion failure.

For success-path assertions like `(result.json as Record<string, unknown>).newStatus`, the cast hides whether `result.json` is actually defined. For error-path assertions like `(result.json as { error: { code: string } }).error.code`, a two-level deep property access on a blind cast is risky.

Recommendation: Assert `expect(result.json).toBeDefined()` before the cast, or use a narrowing helper. Several tests already do this (e.g., `workflow-init.test.ts` line 25), but the pattern is inconsistent. The chain-based tests in `workflow-epic.test.ts` and the full lifecycle tests in `workflow-slice.test.ts` and `workflow-quest.test.ts` consistently skip the `toBeDefined()` check before accessing `.json` properties on intermediate steps.

Files: tests/integration/workflow-slice.test.ts:36, tests/integration/workflow-quest.test.ts:21, tests/integration/workflow-epic.test.ts:22, tests/integration/error-transitions.test.ts:20
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `runner-modes.test.ts` — `epic:create` with `{}` stdin may not fail at validation

The test at line 47-60 sends `{}` as stdin to `epic:create --json` with no `GOODPLAN_DIR`. It expects exit code 2 and a `VALIDATION_*` error code. This relies on `validateInput` being called before `resolveProjectDir()`, which is currently true in the command implementation. However, the command calls `readStdin()` first (async), then `validateInput()`, then `resolveProjectDir()`. If `readStdin()` receives `{}` and the validation fires, that's exit code 2 with `VALIDATION_INVALID_INPUT`.

The concern: the test comment says "No GOODPLAN_DIR — but validation should catch bad input first." This is fragile — it depends on command ordering that isn't contractually guaranteed. If someone reorders the command to resolve the project dir first, this test breaks with a `DATA_NO_PROJECT` error (exit 1) instead. Consider either: (a) setting `GOODPLAN_DIR` to a temp dir so the test only exercises validation, or (b) documenting the ordering dependency in a comment.

File: tests/integration/runner-modes.test.ts:47
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `workflow-init.test.ts` does not use `withFixture` helper — manual cleanup pattern

The init tests use manual `try/finally` with `fs.rmSync` for cleanup. This is acceptable since `init` creates the `.project/` directory (no pre-existing fixture needed), but it's inconsistent with the other test files that use `withFixture`. Consider extracting a lighter `withTempDir` helper to reduce the boilerplate, or accept the inconsistency with a brief comment noting why `withFixture` isn't used here.

File: tests/integration/workflow-init.test.ts:14-36
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `withFixture` calls `buildBinary()` internally but tests also call it in `beforeAll`

In `helpers.ts` line 127, `withFixture` calls `buildBinary()` inside itself. But every test file also calls `buildBinary()` in `beforeAll` and passes `bin` to `runCommand`. Inside `withFixture`, the context object includes `bin` (line 129) but the tests ignore it — they use the outer `bin` variable instead. This is harmless (both resolve to the same path) but creates confusion about which `bin` to use. Either remove `bin` from `FixtureContext` or use `ctx.bin` inside `withFixture` callbacks.

File: tests/integration/helpers.ts:127-129, tests/integration/workflow-epic.test.ts:8-10
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `error-transitions.test.ts` — non-existent slice error may be `STATE_INVALID_TRANSITION` or something else

The test at line 11 expects that `slice:plan --slice nonexistent-slice` returns `STATE_INVALID_TRANSITION`. This depends on how the state machine handles a missing slice entity. If the RPC layer throws a `DATA_*` error for a missing entity before reaching the state machine, the error code would differ. The test name says "non-existent slice" but the asserted code is `STATE_INVALID_TRANSITION`. This is fine if the current implementation reaches the reducer and the reducer returns that code for a missing entity, but worth verifying that this won't become a `DATA_FILE_NOT_FOUND` in the future if error handling changes.

File: tests/integration/error-transitions.test.ts:11-24
Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Missing `import type` for type-only imports

The `helpers.ts` file imports `SpawnSyncReturns` from `node:child_process` which is only used as a type annotation (line 40). With `verbatimModuleSyntax: true` in tsconfig, this should use `import type` syntax. However, since tests are excluded from tsconfig (`"exclude": ["tests"]`), this may not cause a build error — but it's inconsistent with the project's strictness conventions.

File: tests/integration/helpers.ts:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Good integration test coverage of the core workflows, error paths, and runner modes. The tests correctly verify error codes against actual codebase values, stdin payloads match command schemas, and the fixture data is well-structured. The helpers API (`runCommand`, `runChain`, `withFixture`) is clean and the global setup for binary compilation is well-designed.

To reach 9+: Address the type safety of JSON assertions (the IMPORTANT issue) — either add `toBeDefined()` guards consistently before casting, or create a typed assertion helper. Fix the `import type` inconsistency.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
