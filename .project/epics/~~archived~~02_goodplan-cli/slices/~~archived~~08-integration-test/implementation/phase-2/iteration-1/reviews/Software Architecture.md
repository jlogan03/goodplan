# Software Architecture Review — Phase 2: Integration Tests (Iteration 1)

## Issues

**[IMPORTANT]** Duplicate test coverage between smoke.test.ts and other files

The `smoke.test.ts` file contains `--version`, `--help`, and `init` tests that are fully duplicated in `runner-modes.test.ts` and `workflow-init.test.ts`. This creates maintenance burden — if the behavior changes, two files must be updated. The smoke tests were appropriate for Phase 1 bootstrapping but now that the dedicated test files exist, the overlapping tests should be removed from `smoke.test.ts` (keeping only the `withFixture` infrastructure validation test, which is unique).

File: tests/integration/smoke.test.ts:14
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** workflow-init.test.ts does not use withFixture for isolation

The `workflow-init.test.ts` file manually creates temp dirs with `mkdtempSync` and does its own cleanup in `finally` blocks. This is understandable for `init` (which creates `.project/` from scratch) but it diverges from the `withFixture` pattern used everywhere else. More importantly, three of the four tests repeat identical boilerplate (tmpDir creation, GOODPLAN_DIR env, try/finally cleanup). A small helper or shared setup would reduce duplication and make the tests consistent with the rest of the suite.

File: tests/integration/workflow-init.test.ts:15
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** error-transitions.test.ts: "non-existent slice" test name is misleading

The test "slice:plan on non-existent slice returns STATE_INVALID_TRANSITION" is labeled as testing a non-existent slice, but the actual error path depends on `guardSliceStatus` returning STATE_INVALID_TRANSITION because the slice JSON is not found. This is correct behavior and the assertion is correct, but the test name suggests it is testing entity-not-found rather than invalid-transition. A clearer name would be: "slice:plan on unknown slice returns STATE_INVALID_TRANSITION" or similar. This is minor but matters for test readability.

File: tests/integration/error-transitions.test.ts:11
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing abandon workflow coverage

The transition tables define `ABANDON_SLICE`, `ABANDON_EPIC`, and `ABANDON_QUEST` transitions for all non-terminal states, including the cross-cutting behavior of clearing active pointers in `project.json`. None of the integration tests cover abandon paths. This is a gap in error/edge-case coverage — abandon is an important workflow for both humans and LLM orchestrators who need to recover from stuck states.

File: tests/integration/error-transitions.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing sequential slice enforcement test

The transition tables specify the `STATE_SLICE_NOT_READY` guard (previous slice must be completed/abandoned before next slice can begin planning). The `slice-in-progress` fixture exists and appears designed for this, but no test uses it. This is the only cross-cutting guard not covered by the integration tests.

File: tests/integration/workflow-slice.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification of activity-log.jsonl after workflow transitions

INV-001 states every state mutation goes through the state machine, and the RPC layer appends to the activity log on every transition. None of the workflow tests verify that `activity-log.jsonl` grows after a transition chain. A single assertion at the end of the epic or slice lifecycle test (e.g., checking that the JSONL file has N lines) would provide integration-level confidence that activity logging works end-to-end.

File: tests/integration/workflow-epic.test.ts:31
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** runner-modes.test.ts epic:create validation test lacks GOODPLAN_DIR

The test "epic:create with empty stdin and --json returns JSON validation error" (line 47) does not set `GOODPLAN_DIR`. The comment says "No GOODPLAN_DIR — but validation should catch bad input first." This works today because input validation runs before project resolution, but it creates a coupling to execution order. If project resolution ever moves earlier (e.g., for pre-flight checks), this test would break for the wrong reason. Setting GOODPLAN_DIR to a temp dir would make the test resilient to implementation reordering.

File: tests/integration/runner-modes.test.ts:47
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The test suite is well-structured with clean separation of concerns (workflow tests, error tests, runner tests), proper use of `withFixture` for isolation, correct transition assertions matching the transition tables, and no production code modifications. The helpers module (`runCommand`, `runChain`, `withFixture`) provides a solid foundation for test composability. The fixture data is accurate and internally consistent.

To reach 9+: eliminate the smoke test duplication, add abandon workflow coverage, and add the sequential slice enforcement test — these close the last meaningful gaps in cross-cutting guard coverage.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
