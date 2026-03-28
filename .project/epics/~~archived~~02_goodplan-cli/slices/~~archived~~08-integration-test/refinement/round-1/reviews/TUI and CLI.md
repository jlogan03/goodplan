# TUI and CLI Review — Integration Tests & Fitness Functions

## Issues

**[IMPORTANT]** Plan uses non-existent error codes in error-transitions tests

The plan references `STATE_SLICE_NOT_FOUND` and `STATE_GUARD_FAILED` in `error-transitions.test.ts` tasks (Phase 2). Neither code exists in the codebase. The actual `StateErrorCode` union in `src/schemas/state-events.ts` defines: `STATE_ALREADY_INITIALIZED`, `STATE_INVALID_TRANSITION`, `STATE_EPIC_ALREADY_ACTIVE`, `STATE_MISSING_VERIFICATIONS`, `STATE_VERIFICATION_FAILED`, `STATE_SLICE_NOT_READY`, `STATE_CONTENT_MISSING`, `STATE_MAX_ROUNDS_REACHED`, `STATE_QUEST_ALREADY_ACTIVE`, `STATE_DUPLICATE_DECISION`. The plan should use the correct codes — e.g., `STATE_INVALID_TRANSITION` for "slice not found" scenarios (the state machine returns this when the target entity doesn't exist), and `STATE_MISSING_VERIFICATIONS` or `STATE_INVALID_TRANSITION` instead of `STATE_GUARD_FAILED`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing vitest timeout configuration for integration tests

The codebase has no `vitest.config.ts`. Integration tests that compile the binary and spawn child processes will need longer timeouts than the Vitest default (5s). The plan's Phase 1 should include creating a vitest workspace or project config that sets an appropriate timeout (e.g., 30s) for `tests/integration/` and `tests/fitness/`. Without this, tests will intermittently fail on slower machines or CI. The research file (`_codebase-context.md`) explicitly flags this: "integration tests may need separate timeout config."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Error-concurrent test assumes wrong error propagation path

The `error-concurrent.test.ts` task says: "Load state via one command, externally modify a JSON file, attempt another command." But concurrent modification detection happens within a single `commitState()` call — it compares the on-disk content against the `oldState` snapshot taken at the start of the same RPC operation. Two separate binary invocations each get their own `assembleState()` snapshot. The test needs to either: (a) modify a file between a command's read and write within the same invocation (hard to control from outside), or (b) test this at the fitness function level (Phase 3 already has `concurrent-modification.test.ts` which correctly tests `assembleState()` then external modify then `commitState()`). The integration test should be redesigned or removed — it duplicates Phase 3's fitness function without being testable at the binary-spawn level.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan says `Bun.spawnSync` for binary spawning — should specify a single approach

The helpers task mentions "Uses `Bun.spawnSync` or Node child_process." The research file notes the latter is more standard for compiled binary testing. Since the compiled binary is a standalone executable (not a Bun module), Node's `execFile` / `execFileSync` from the `child_process` module is the appropriate API. The plan should commit to one approach to avoid implementer ambiguity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 exit code assertions could be more specific

The plan says `./goodplan badcommand` should exit 2, but the plan should also explicitly verify that `--json` error output goes to stdout (not stderr) per the architecture, and non-JSON errors go to stderr. The `runner-modes.test.ts` task mentions "JSON error to stdout, empty stderr" which is correct, but the non-JSON error case should verify output goes to stderr. This is partially covered but the plan could be more explicit about asserting the correct stream for each mode.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Circuit breaker test needs to know maxRounds value

The `error-circuit-breaker.test.ts` task says "Submit enough refinement rounds to hit maxRounds" but doesn't specify what maxRounds is or where it comes from. The test needs to either hardcode the expected value (fragile) or read it from the state/config. The plan should note where maxRounds is defined and how the test should discover it.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** No `NO_COLOR` / `FORCE_COLOR` testing

The plan doesn't include any tests verifying that the binary respects `NO_COLOR` and `FORCE_COLOR` environment variables. The codebase uses picocolors which automatically respects these, but an integration test confirming color-free output when `NO_COLOR=1` is set would be a valuable regression guard — especially since the conventions doc says "stderr for diagnostics, stdout for command output."

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is solid in structure and coverage breadth. The three IMPORTANT issues need attention: wrong error codes will cause test failures at implementation time, missing timeout config will cause flaky tests, and the concurrent modification integration test is not feasible at the binary-spawn level. Fixing these three issues and the minor items would bring it to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
