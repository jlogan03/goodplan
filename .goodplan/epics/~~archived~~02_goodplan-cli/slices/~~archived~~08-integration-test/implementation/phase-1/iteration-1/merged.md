# Merged Review — Phase 1: Fixtures & Test Helpers

## CRITICAL Issues

None.

## IMPORTANT Issues

### I1: `withFixture` and `smoke.test.ts` create temp dirs inside source tree

**Files:** `tests/integration/helpers.ts:108`, `tests/integration/smoke.test.ts:26`
**Flagged by:** Generalist, TypeScript, Architecture (all three)

`mkdtempSync` uses `import.meta.dirname` as prefix, placing temp dirs inside `tests/integration/`. If a test crashes before cleanup (SIGKILL, Vitest timeout, debugger stop), stale dirs pollute the source tree and could be committed. Use `os.tmpdir()` instead:

```ts
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `goodplan-integration-${fixtureName}-`));
```

Same fix needed in `smoke.test.ts:26`.

**Resolution:** DIRECTLY_ACTIONABLE

### I2: Smoke test `init` bypasses `withFixture` isolation pattern

**File:** `tests/integration/smoke.test.ts:26-43`
**Flagged by:** Generalist

The `init` smoke test creates a temp dir manually without setting `GOODPLAN_DIR`. Since I1 places this dir inside the repo, the binary could potentially discover the repo's own `.project/` via cwd-based parent walking if `init` fails. Using `os.tmpdir()` (from I1) largely mitigates this, but the test should also set `GOODPLAN_DIR` to the temp dir for full isolation.

**Resolution:** DIRECTLY_ACTIONABLE

## MINOR Issues

### M1: `globalSetup` uses `stdio: "pipe"` — build errors silently swallowed

**File:** `tests/global-setup.ts:14`
**Flagged by:** TypeScript

`execFileSync` with `stdio: "pipe"` captures output. If `bun build` fails, the compiler error is buried in the thrown error's `stderr` property and may not be printed by Vitest's global setup handler. Use `stdio: "inherit"` so build errors are directly visible, or catch and log `e.stderr.toString()`.

**Resolution:** DIRECTLY_ACTIONABLE

### M2: `globalSetup` compiles binary for ALL test runs including unit tests

**File:** `vitest.config.ts:6`
**Flagged by:** TypeScript

The global setup compiles the binary before every `vitest` invocation, even unit-only runs, adding ~2-5s of unnecessary compilation. Consider a conditional check in global-setup to skip compilation when no integration tests are selected, or use Vitest workspaces.

**Resolution:** DIRECTLY_ACTIONABLE

### M3: No `teardown` in global-setup to clean up compiled binary

**File:** `tests/global-setup.ts`
**Flagged by:** Generalist, Architecture

The compiled `goodplan` binary (~57MB) is left in the project root after tests. A `teardown()` export that removes it would keep the working tree clean. Low priority if `.gitignore` covers it.

**Resolution:** DIRECTLY_ACTIONABLE

### M4: `withFixture` does not return `binPath` — callers must separately call `buildBinary()`

**File:** `tests/integration/helpers.ts:97`
**Flagged by:** Architecture

Every integration test needs both `buildBinary()` and `withFixture`. Consider returning a richer context `{ tmpDir, env, bin }` to reduce boilerplate as tests multiply.

**Resolution:** DIRECTLY_ACTIONABLE

### M5: `fresh-init` fixture missing `idea.md`

**Flagged by:** Generalist

Plan says fresh-init should contain `idea.md`. The fixture does not include it, and the production `init` command doesn't create one either — likely a plan inaccuracy. Confirm downstream tests (Phase 2 `init` test) won't expect it.

**Resolution:** DIRECTLY_ACTIONABLE

### M6: `import.meta.dirname ?? "."` fallback resolves incorrectly if undefined

**File:** `tests/integration/helpers.ts:15,101,108`, `tests/global-setup.ts:10`
**Flagged by:** Generalist

The `?? "."` fallback would resolve relative to cwd, not the file's directory. In practice `import.meta.dirname` is always defined in Vitest's module context, so this is cosmetic. Consider removing the fallback to avoid false safety.

**Resolution:** DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

1. I1 — Use `os.tmpdir()` for temp dirs in `withFixture` and `smoke.test.ts`
2. I2 — Set `GOODPLAN_DIR` in smoke test `init`
3. M1 — Use `stdio: "inherit"` in global-setup `execFileSync`
4. M2 — Skip binary compilation when only running unit tests
5. M3 — Add `teardown()` to global-setup or ensure `.gitignore` covers binary
6. M4 — Enrich `withFixture` return value with `binPath`
7. M5 — Confirm `idea.md` expectations for downstream tests
8. M6 — Remove `?? "."` fallback from `import.meta.dirname`

## RESEARCH_NEEDED

None.

## Contradictions Resolved

### TypeScript flagged SIGINT/cleanup as IMPORTANT; Architecture and Generalist did not

TypeScript reviewer flagged that `withFixture`'s `finally` block doesn't handle `SIGINT`/`SIGKILL` cleanup as IMPORTANT. However, the TypeScript reviewer's own resolution was "MINOR" (documenting in a comment), and the other reviewers didn't flag it. Given that this is a known limitation of `finally` blocks with no clean fix for test helpers, this is absorbed into the temp-dir issue (I1): using `os.tmpdir()` makes leaked dirs harmless regardless of cleanup reliability. Downgraded to non-issue — no separate item needed.

### TypeScript flagged `CommandOptions.env` type mismatch

TypeScript reviewer noted `Record<string, string>` is slightly misleading since the merged result includes `undefined` from `process.env`. The other reviewers did not flag this. Since it works at runtime and `SpawnSyncOptions.env` accepts `NodeJS.ProcessEnv`, this is cosmetic. Not included as a separate item — the type is correct enough for its purpose.

## Unresolved (USER_INPUT required)

None.
