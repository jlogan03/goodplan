# Generalist Review: Phase 1 — Fixtures & Test Helpers

**Score: 8/10**

## Summary

Solid implementation that delivers all plan requirements. Fixtures are well-crafted with fixed timestamps, helper APIs match the spec, vitest config is clean, and smoke tests pass. A few issues worth addressing before moving on.

## Critical (0)

None.

## Important (2)

### I1: `withFixture` creates temp dirs inside `tests/integration/` instead of system temp

**File:** `tests/integration/helpers.ts:108`

`mkdtempSync` uses `import.meta.dirname` as the prefix, creating temp dirs inside `tests/integration/`. If a test crashes before cleanup, stale dirs pollute the source tree and could be accidentally committed. Use `os.tmpdir()` instead:

```ts
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `goodplan-integration-${fixtureName}-`));
```

Same issue in `smoke.test.ts:27` where `init` test creates a temp dir inside `tests/integration/`.

### I2: Smoke test `init` bypasses `withFixture` isolation pattern

**File:** `tests/integration/smoke.test.ts:26-43`

The `init` smoke test creates a temp dir manually and runs `init` with `cwd: tmpDir` but does NOT set `GOODPLAN_DIR`. This means the binary discovers the `.project/` directory via cwd-based lookup. If the test's temp dir happens to be a subdirectory of the repo (which it is, per I1), the binary could potentially find the repo's own `.project/` if `init` fails and it falls back to walking up. Low probability but exactly the scenario `withFixture`'s `GOODPLAN_DIR` pattern was designed to prevent.

## Minor (3)

### M1: `fresh-init` fixture missing `idea.md`

The plan says fresh-init should contain `idea.md` ("a minimal `.project/` with `idea.md`, `overview.json`, and `activity-log.jsonl`"). The fixture does not include it. The production `init` command does not appear to create `idea.md` either, so this is likely a plan inaccuracy rather than an implementation bug — but worth confirming that downstream tests (Phase 2 `init` test) won't expect it.

### M2: `global-setup.ts` uses `import.meta.dirname ?? "."` fallback

**File:** `tests/global-setup.ts:10`

The `?? "."` fallback would resolve incorrectly if `import.meta.dirname` were undefined (it would resolve relative to cwd, not the file's directory). In practice `import.meta.dirname` is always defined in Vitest's module context, so this is cosmetic. Same pattern appears in `helpers.ts:15,101,108`. Consider removing the fallback to avoid false safety.

### M3: No `teardown` in global-setup to clean up compiled binary

**File:** `tests/global-setup.ts`

The compiled `goodplan` binary is left in the project root after tests complete. A `teardown()` export that removes it would keep the working tree clean. Low priority since `.gitignore` presumably covers it.

## Plan Adherence

All 8 tasks marked complete. Fixture directories match the specified lifecycle states. Helper exports match the spec (`runCommand`, `runChain`, `withFixture`, `buildBinary`). `vitest.config.ts` has `testTimeout: 30_000` and `globalSetup`. Smoke test covers `--version`, `--help`, and `init` as required.

## Cross-File Integration

- `global-setup.ts` compiles to `./goodplan`; `helpers.ts` reads from the same well-known path. Correctly aligned.
- `withFixture` env injection (`GOODPLAN_DIR`) matches `src/core/data/project.ts` env var handling.
- Fixture JSON structures validate against production Zod schemas (`projectSchema`, `epicSchema`, `sliceSchema`, `overviewSchema`).

## Code Quality

- `json` field typed as `unknown` per plan spec — good.
- `CommandResult` / `ChainOptions` interfaces are clean and well-typed.
- `spawnSync` timeout of 15s per command is reasonable.
- Doc comment in helpers.ts covers how to run tests — satisfies the plan's Phase 3 doc comment task early.
