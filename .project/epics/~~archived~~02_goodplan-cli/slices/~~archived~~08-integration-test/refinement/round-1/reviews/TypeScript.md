# TypeScript Review — Integration Tests & Fitness Functions

## Issues

**[CRITICAL]** Plan references non-existent error codes in Phase 2 error transition tests
The plan's `error-transitions.test.ts` tasks reference error codes `STATE_SLICE_NOT_FOUND` and `STATE_GUARD_FAILED`, but neither exists in the codebase. The actual `StateErrorCode` union in `src/schemas/state-events.ts` contains: `STATE_ALREADY_INITIALIZED`, `STATE_INVALID_TRANSITION`, `STATE_EPIC_ALREADY_ACTIVE`, `STATE_MISSING_VERIFICATIONS`, `STATE_VERIFICATION_FAILED`, `STATE_SLICE_NOT_READY`, `STATE_CONTENT_MISSING`, `STATE_MAX_ROUNDS_REACHED`, `STATE_QUEST_ALREADY_ACTIVE`, `STATE_DUPLICATE_DECISION`. The plan should reference actual error codes. For "slice not found" scenarios, the state machine returns `STATE_INVALID_TRANSITION`. For "activate without verification", it returns `STATE_MISSING_VERIFICATIONS`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 fitness test `transition-completeness.test.ts` can use existing `handlerRecord` keys instead of a new `EVENT_TYPES` export
The plan proposes adding an `EVENT_TYPES` const array to production code as the "one allowed production code change." However, `handlerRecord` in `src/core/state/reduce.ts` already uses `satisfies { [K in StateEvent["type"]]: Handler<K> }` for compile-time exhaustiveness. The fitness test can instead: (a) extract event type keys from the `handlerRecord` object (which would require exporting it, a smaller change), or (b) parse the `StateEvent` type from the source file at test time. Either approach is simpler than maintaining a separate `EVENT_TYPES` array that could drift. If the team still prefers an explicit `EVENT_TYPES` array, it should be derived from the `handlerRecord` keys (`Object.keys(handlerRecord) as StateEvent["type"][]`) to prevent drift from the exhaustiveness-checked record.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fitness test `state-machine-purity.test.ts` should scan `src/core/state/` not just for direct I/O imports but also re-export chains
The plan says to verify no I/O modules are imported in `src/core/state/`. Currently `src/core/state/reduce.ts` imports from `./types.js` which re-exports from `../../schemas/state-events.js` and `../tree.js` (via `../tree.js` path). The `tree.ts` file is in `src/core/data/` not `src/core/state/` -- but `reduce.ts` imports `ProjectState` from `../tree.js` which is `src/core/tree.js` or similar. The fitness test should clarify: scan only files *within* `src/core/state/` for direct `import` statements containing I/O module specifiers. Transitive dependencies (e.g., type-only imports from schema files) are acceptable since they are `import type` and produce no runtime I/O. The test should use `import type` awareness -- `import type` from any module is safe; only value imports of I/O modules violate purity.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No vitest configuration for integration test timeouts
The research file notes "integration tests may need separate timeout config" and no `vitest.config.ts` exists. Binary compilation in `buildBinary()` (via `beforeAll`) could take several seconds. Individual integration tests spawning the binary also need more time than pure unit tests. The plan should include a task to either: (a) create a `vitest.config.ts` with a higher default timeout for integration tests, or (b) use Vitest's `testTimeout` in a vitest workspace config separating unit and integration test projects. Without this, tests will use the default 5s timeout and likely flake.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `withFixture` helper should use `import type` for type-only imports and handle `GOODPLAN_DIR` env var
The plan describes `withFixture(fixtureName, fn)` copying fixtures to a temp dir. The existing codebase uses `GOODPLAN_DIR` env var to override the `.project/` location (documented in conventions). The helper should set `GOODPLAN_DIR` in the spawned process environment to point to the copied fixture's `.project/` directory -- or the tests should pass the fixture path as cwd. The plan's task description is ambiguous about this. Since integration tests spawn the binary, the helper needs to either: (a) set `cwd` to the parent of `.project/` when spawning, or (b) set `GOODPLAN_DIR` env var. This distinction matters for correctness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan references `Bun.spawnSync` in helpers but should use `child_process` for compiled binary testing
The plan task says "Uses `Bun.spawnSync` or Node child_process." For compiled binary testing, `node:child_process` (`execFileSync` or `spawnSync`) is more appropriate and portable. The compiled binary is a standalone executable, not a Bun script. Existing unit tests already import from `node:fs` and `node:path`, so `node:child_process` is consistent. The plan should specify `node:child_process` definitively rather than leaving it ambiguous.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 workflow tests assume CLI command names without verifying against actual command surface
The plan references commands like `epic:create`, `slice:plan`, `slice:refine-plan`, `slice:implement`, `slice:complete`, `quest:create`. These match the repo structure in `src/commands/` but the actual CLI dispatch uses citty subcommands with colon-separated names. The plan should note that integration tests must use the exact command syntax the binary accepts (which may differ from the internal file structure). A quick smoke test of the command surface in Phase 1 would catch any naming mismatches early.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `data-determinism.test.ts` imports `assembleState` and `commitState` directly -- this is not an integration test
Phase 3 fitness tests like `data-determinism.test.ts`, `schema-validation.test.ts`, `tree-accuracy.test.ts`, and `concurrent-modification.test.ts` import and call functions directly (`assembleState()`, `commitState()`) rather than spawning the binary. This is fine for fitness functions (they test architectural properties, not end-to-end behavior), but the plan should explicitly acknowledge this distinction. These are property-based unit tests in a `tests/fitness/` directory, not integration tests. This is a naming/organizational clarity point, not a functional issue.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers good ground -- the three-phase structure (fixtures/helpers, integration tests, fitness functions) is sound and the test targets align well with the architectural invariants. However, incorrect error code references (CRITICAL) would cause tests to assert on non-existent values, leading to false passes or confusing failures. The missing vitest timeout configuration would cause flaky tests in CI. The ambiguity around `GOODPLAN_DIR` usage and `Bun.spawnSync` vs `child_process` leaves implementation details underspecified. To reach 9+: fix the error codes, clarify the helper's environment/cwd strategy, add vitest timeout config, and resolve the `EVENT_TYPES` approach to avoid unnecessary production code changes.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
