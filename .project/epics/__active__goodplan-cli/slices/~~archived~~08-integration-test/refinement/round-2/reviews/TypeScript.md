# TypeScript Review (Round 2) -- Integration Tests & Fitness Functions

## Round 1 Issue Resolution Check

All six round-1 issues have been addressed:
- Error codes: Fixed to `STATE_INVALID_TRANSITION`, `STATE_MISSING_VERIFICATIONS`, `STATE_SLICE_NOT_READY` -- all verified present in `src/schemas/state-events.ts`.
- EVENT_TYPES: Replaced with `handlerRecord` export approach -- cleaner, no drift risk.
- `import type` awareness: Purity test now explicitly skips `import type` declarations.
- `withFixture` cwd: Now specifies setting `cwd` to the temp directory when spawning.
- vitest config: Task added to create config with ~30s timeout.
- `node:child_process`: Explicitly specified (`execFileSync`/`spawnSync`).

## Issues

**[IMPORTANT]** `handlerRecord` is currently `const` (not exported) -- plan should specify the exact production code change

The plan says "Export `handlerRecord` from `src/core/state/reduce.ts` (the one allowed production code change)" but `handlerRecord` is declared as `const handlerRecord` without `export`. The task in Phase 3 mentions this correctly, but the actual change required is adding `export` to the `const handlerRecord` declaration on line 69 of `reduce.ts`. The plan should be explicit that this is changing `const handlerRecord` to `export const handlerRecord` -- this is a minor clarification but prevents ambiguity during implementation. The `handlers` Map derived from it on line 111 should remain unexported.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** vitest config task is vague -- should specify workspace config or project-level config with glob-based timeout overrides

The plan says "Create a vitest config (or workspace config)" but leaves the choice open. Given the project has no existing `vitest.config.ts`, the simplest approach is a single `vitest.config.ts` at the root with `testTimeout: 30_000` scoped via Vitest's `test.testTimeout` for the whole suite (unit tests are fast enough that 30s won't mask issues) or using Vitest project/workspace config to separate `tests/unit/` (default 5s) from `tests/integration/` and `tests/fitness/` (30s). The plan should pick one approach. Recommendation: single `vitest.config.ts` with 30s global timeout is simplest and sufficient given the project's single-package structure.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `buildBinary()` helper should cache the binary path across test files in the same vitest run

The plan says `buildBinary()` compiles "once per test suite (via `beforeAll`)." But `beforeAll` scopes to a single test file. With multiple test files in `tests/integration/`, the binary would be compiled once per file. This is wasteful (each `bun build --compile` takes several seconds). Consider using Vitest's `globalSetup` to compile once and write the binary path to a known location, or a module-level singleton pattern in the helper that checks if the binary already exists before recompiling. This is a performance concern, not a correctness issue, but could push total test time close to or past the 30s target.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `runCommand` return type should handle `noUncheckedIndexedAccess` for JSON parsing

The plan describes `runCommand` returning `{ stdout, stderr, exitCode, json? }` where `json` is parsed when `--json` flag is present. Under `noUncheckedIndexedAccess: true`, any optional property access requires narrowing. The helper should type `json` as `unknown` (not `any`) when present, forcing callers to narrow properly. This aligns with the project's strict TypeScript settings and prevents silent type-safety escapes in test code.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `concurrent-modification.test.ts` calls `commitState()` which requires three arguments but the plan says "Run `assembleState()` (or `loadState()`)"

Looking at `commitState(projectDir, old, new)` in `src/core/data/commit.ts`, the test needs to: (1) assemble state, (2) externally modify a file, (3) call `commitState(dir, assembledState, assembledState)` passing the same state as both old and new (since we just want to trigger the concurrent modification check, not actual changes). The plan's parenthetical "(or `loadState()`)" is misleading since `loadState` returns a cached state and has different semantics. The plan should specify the exact call pattern: `assembleState()` for the initial read, then `commitState(dir, state, state)` after external modification.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 critical and important issues are resolved correctly. The plan is now solid on error codes, the `handlerRecord` approach, purity test `import type` handling, and `node:child_process` usage. The remaining issues are implementation-detail clarifications (vitest config specifics, build caching, exact production code change wording) rather than correctness problems. To reach 9+: specify the vitest config approach concretely and address the `buildBinary()` caching concern to ensure the 30s time budget is achievable.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
