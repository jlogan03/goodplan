# Software Architecture Review — Phase 1: Fixtures & Test Helpers

## Issues

**[IMPORTANT]** Temp directories created inside source tree by `withFixture` and `smoke.test.ts`

`withFixture` creates temp directories inside `tests/integration/` (line 108: `path.join(import.meta.dirname, ...)`) and `smoke.test.ts` creates them inside `tests/integration/` (line 26: `path.join(import.meta.dirname, "smoke-init-")`). If a test crashes before the `finally` block runs (e.g., SIGKILL, Vitest timeout), these temp dirs persist inside the source tree. They could be accidentally committed or clutter `git status`. Use `os.tmpdir()` instead, which is the standard location for ephemeral test artifacts and is already outside the repo.

File: tests/integration/helpers.ts:108
File: tests/integration/smoke.test.ts:26
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `withFixture` copies entire fixture but does not pass `binPath` — callers must separately call `buildBinary()`

The `withFixture` API gives callers `(tmpDir, env)` but not the binary path. Every integration test will need both `buildBinary()` and `withFixture`. Consider having `withFixture` accept the bin path and include it in the env merge, or return a richer context object `{ tmpDir, env, bin }`. This is minor because the current pattern works and is explicit — but as tests multiply, the boilerplate adds up.

File: tests/integration/helpers.ts:97
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `globalSetup` does not clean up the compiled binary

`global-setup.ts` compiles the binary to project root (`./goodplan`) but provides no teardown to remove it. This leaves a ~57MB binary in the project root after test runs. It should be gitignored and/or cleaned up via a `teardown` export from the global setup module.

File: tests/global-setup.ts:9
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `epic-activated` fixture slice overview status is `created` but slice.json is also `created` — expected for activated epic with defined slices, but epic has `sliceSequence: ["test-slice"]` implying slices were already defined

The `epic-activated` fixture has epic status `activated` with `sliceSequence: ["test-slice"]`, but the slice overview shows status `created` and the slice.json shows status `created`. This is internally consistent (a slice starts at `created` status even in an activated epic), so this is not a bug — but it's worth noting that the fixture name suggests a more progressed state than the slice actually has. Future tests that need to exercise slice transitions from this fixture will need to drive the slice through additional transitions first.

File: tests/fixtures/epic-activated/.project/slices/overview.json:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is well-structured and closely follows the plan. The four-layer architecture is respected — test helpers use `node:child_process` to spawn the compiled binary (not importing core modules directly), which validates the system through its public CLI interface. Fixture structures match the real `.project/` directory layout from the data model. The `GOODPLAN_DIR` env var isolation is correctly applied. The `globalSetup` / `buildBinary()` split properly separates one-time compilation from per-test binary resolution. The main issue dragging the score down is temp dirs inside the source tree — using `os.tmpdir()` and ensuring the compiled binary is gitignored or cleaned up would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
