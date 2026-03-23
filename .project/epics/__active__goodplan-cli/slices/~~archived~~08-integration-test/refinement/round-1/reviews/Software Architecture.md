## Issues

**[IMPORTANT]** Plan references non-existent error codes in error-transitions.test.ts
The plan's Phase 2 error transition tests reference error codes that don't exist in the codebase. Specifically:
- `STATE_SLICE_NOT_FOUND` — not in `StateErrorCode` (the actual code for invalid transitions is `STATE_INVALID_TRANSITION`)
- `STATE_GUARD_FAILED` — not in `StateErrorCode` (the actual codes are `STATE_MISSING_VERIFICATIONS` for activation without verifications, or `STATE_INVALID_TRANSITION` for wrong-state transitions)

The plan says: "Attempt `epic:activate` without verification criteria -> STATE_GUARD_FAILED" and "Attempt `slice:plan` on slice that hasn't been created -> STATE_SLICE_NOT_FOUND". These should reference actual error codes from `src/schemas/state-events.ts` and `src/util/errors.ts`.

Fix: Replace `STATE_SLICE_NOT_FOUND` with `STATE_INVALID_TRANSITION` (attempting a transition on a non-existent entity). Replace `STATE_GUARD_FAILED` with `STATE_MISSING_VERIFICATIONS` (for the activation case). Add a task early in Phase 2 to verify actual error codes by reading `src/schemas/state-events.ts` and `src/util/errors.ts` before writing error tests.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fitness function tests import production modules directly, contradicting test boundary alignment
Phase 3 fitness functions (`data-determinism.test.ts`, `schema-validation.test.ts`, `tree-accuracy.test.ts`, `concurrent-modification.test.ts`) directly import and call `assembleState()` and `commitState()` from the Data Layer. This makes them unit-style tests that test internal module APIs, not fitness functions that verify architectural invariants from the outside. The plan's stated goal is integration tests that "spawn the compiled binary" plus fitness functions that "verify architectural invariants." The fitness functions should be structured as architectural property tests — some (purity, transition completeness, atomic writes) correctly use static analysis or code inspection, but the data layer ones are effectively additional unit tests for `assembleState`/`commitState`.

This is acceptable for INV-002, INV-005 because these invariants are about internal Data Layer behavior that can't be observed through the binary. But the plan should explicitly acknowledge this design choice — these fitness functions test at the module boundary, not the system boundary, and that's intentional because the invariants they guard are internal to the Data Layer.

Fix: Add a brief note in the Phase 3 overview (or in the tasks for these tests) stating: "Data Layer fitness functions import production modules directly because these invariants (deterministic serialization, schema validation, concurrent modification detection) are internal to the Data Layer and not directly observable through the CLI binary interface."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing vitest configuration for integration test timeouts
The research file notes "No vitest.config.ts exists" and "integration tests with binary compilation may need separate timeout config." The plan includes a `buildBinary()` helper called via `beforeAll` that compiles the binary, which could take several seconds. Without a vitest configuration or explicit `testTimeout` settings, the default 5-second timeout may cause flaky failures. The plan should include a task to create a vitest config (or vitest workspace config) that sets appropriate timeouts for integration tests.

Fix: Add a task in Phase 1 to create `vitest.config.ts` (or a vitest workspace config) that sets a longer timeout for `tests/integration/` and `tests/fitness/` test files (e.g., 30 seconds per test). This also ensures the "total under 30 seconds" constraint is about wall-clock time, not per-test timeout.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan says "No production code changes" but Phase 3 allows EVENT_TYPES export
The overview states "No production code changes in this slice" under Key Decisions, but Phase 3's transition-completeness task explicitly says "This may require creating the EVENT_TYPES export in `src/core/state/` if it doesn't exist — this is the one allowed production code change." This is a self-contradiction. The research file confirms no runtime `EVENT_TYPES` array exists. The plan should consistently state the exception.

Fix: Update the Key Decisions bullet to: "No production code changes except the `EVENT_TYPES` const array export in `src/core/state/` (a compile-time-validated constant, not behavioral change)."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan locates EVENT_TYPES in wrong module
The plan says to create `EVENT_TYPES` in `src/core/state/` but `StateEvent` is defined in `src/schemas/state-events.ts`, and `reduce.ts` imports types from there via `./types.js` (which re-exports from `../../schemas/state-events.js`). Adding an `EVENT_TYPES` runtime array alongside the `StateEvent` type in `src/schemas/state-events.ts` would be more cohesive — the type and its runtime representation live together. Alternatively, if it goes in `src/core/state/`, it should be in `reduce.ts` next to the `handlerRecord` that already has compile-time exhaustiveness via `satisfies`.

Fix: Specify the exact file: either `src/schemas/state-events.ts` (next to the `StateEvent` type definition) or `src/core/state/reduce.ts` (next to the exhaustiveness-checked `handlerRecord`). The latter is preferable since `handlerRecord` already provides compile-time exhaustiveness and `EVENT_TYPES` can be derived from `Object.keys(handlerRecord)` with a type assertion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Integration test for concurrent modification (error-concurrent.test.ts) may be fragile
The plan says: "Load state via one command, externally modify a JSON file, attempt another command -> DATA_CONCURRENT_MODIFICATION error." But the binary loads and commits state within a single command invocation. To trigger concurrent modification, you'd need to: (1) run a command that reads state, (2) externally modify a file between read and write, (3) have the command attempt to write. This isn't achievable by running two sequential binary commands — each command does its own fresh `assembleState()` + `commitState()` cycle. The concurrent modification check compares on-disk content against the `oldState` passed to `commitState()`, which is always fresh from the same process.

The fitness function in Phase 3 (`concurrent-modification.test.ts`) handles this correctly by directly calling `assembleState()` then modifying the file then calling `commitState()`. But the integration test in Phase 2 (`error-concurrent.test.ts`) can't reproduce this through the binary unless there's a way to inject a delay between read and write. This test should be removed from Phase 2 (binary-level integration tests) since the invariant is already covered by the Phase 3 fitness function.

Fix: Remove `tests/integration/error-concurrent.test.ts` from Phase 2. The concurrent modification invariant is properly tested in Phase 3's `tests/fitness/concurrent-modification.test.ts` which can call the Data Layer API directly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture generation approach may produce non-deterministic fixtures
Phase 1 says: "Generate by running `goodplan init` in a temp dir and copying the result." For `fresh-init`, this works. But for more complex fixtures (`epic-created`, `epic-activated`, `slice-in-progress`), the plan doesn't specify whether to generate them by running command sequences or by hand-crafting the JSON. Generated fixtures contain timestamps, which vary per run. Hand-crafted fixtures with fixed timestamps are more stable and inspectable.

Fix: Clarify that all fixtures beyond `fresh-init` should be hand-crafted with fixed timestamps (e.g., `2026-01-01T00:00:00.000Z`), consistent with the existing unit test pattern in `tests/unit/data/assemble.test.ts`. This ensures fixtures are deterministic and reviewable in git.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is well-structured with clear phase boundaries and good coverage of both integration tests and fitness functions. The test boundary choices (binary-level for integration, module-level for fitness functions) are architecturally sound. However, the incorrect error codes would cause test failures, the missing vitest timeout configuration could cause flaky tests, and the concurrent modification integration test is untestable at the binary level. Fixing these issues (correct error codes, add vitest config, remove the impossible concurrent mod integration test, clarify fixture generation, fix EVENT_TYPES location) would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
