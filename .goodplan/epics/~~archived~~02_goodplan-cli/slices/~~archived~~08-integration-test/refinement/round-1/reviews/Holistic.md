# Holistic Review — Integration Tests & Fitness Functions (Slice 08)

## Issues

**[IMPORTANT]** Error code names in Phase 2 don't match actual codebase error codes
The plan references error codes that do not exist in `src/schemas/state-events.ts` or `src/util/errors.ts`:
- `STATE_SLICE_NOT_FOUND` — no such code. The state machine produces `STATE_INVALID_TRANSITION` when an event targets a nonexistent entity, or the data layer produces `DATA_FILE_NOT_FOUND`.
- `STATE_GUARD_FAILED` — no such code. Guard failures produce specific codes like `STATE_MISSING_VERIFICATIONS`, `STATE_SLICE_NOT_READY`, or `STATE_MAX_ROUNDS_REACHED`.
- `STATE_SLICE_NOT_READY` — this one does exist and is correct.

The error-transitions tests must assert against the actual error codes from `StateErrorCode` and `DataErrorCode`, not invented names. The test descriptions in the plan should specify which real error code is expected for each scenario.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fitness functions cover only 5 of 7 invariants — INV-004 and INV-006 are missing
The architecture defines 7 invariants (INV-001 through INV-007). Phase 3 covers INV-002, INV-003, INV-005, and INV-007 (partially via integration tests). It also covers concurrent modification and atomic writes (related to INV-001/INV-002). But two invariants have no fitness function:
- **INV-004** (every command is stateless — target flags required): No test verifies that mutation commands require explicit target flags and don't rely on ambient state.
- **INV-006** (schema output reflects actual command signatures): No test verifies that the `schema` command output matches actual command definitions.

The confirmed goal says "7 fitness functions" and the maturity table marks all subsystems as fitness function candidates. Add fitness tests for INV-004 and INV-006.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 workflow tests assume CLI command names that need verification
The plan uses command syntaxes like `slice:plan` (submit-plan), `slice:refine-plan` (submit-refinement), `slice:implement` (submit-implementation). The parenthetical hints suggest these are sub-agent commands, but the actual binary commands are organized differently — there are separate `slice:plan`, `start-plan`, `submit-plan` commands. The test scenarios need to be specific about which commands they invoke. For example, "slice:plan (submit-plan)" is ambiguous — `slice:plan` triggers the phase transition while `submit-plan` is the sub-agent content submission. An integration test chain for the full slice lifecycle needs both.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Missing vitest configuration for integration test timeouts
The research file notes "integration tests may need longer timeouts" but the plan has no task to configure this. Binary compilation in `buildBinary()` could take several seconds. A `vitest.config.ts` or `vitest.workspace.ts` that sets a longer timeout for `tests/integration/` and `tests/fitness/` would prevent flaky failures. This is noted in the research but not addressed in the plan.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "before" check is fragile
The before check `ls tests/fixtures/*.json 2>/dev/null || ls tests/fixtures/*/ 2>/dev/null` will show "only `.gitkeep` exists" but `.gitkeep` is a file, not a directory or JSON file, so both commands would return nothing — that's the right outcome but the description says "only `.gitkeep` exists" which is misleading. The check actually shows "nothing" rather than showing `.gitkeep`. Minor clarity issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fitness function count doesn't match the confirmed goal
The confirmed goal states "7 fitness functions" but Phase 3 lists 7 test files. With the missing INV-004 and INV-006 fitness functions added, the count would be 9. The goal text should either be updated or the plan should clarify which 7 are in scope and why 2 invariants are deferred.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks
The plan introduces a new test infrastructure (fixtures, helpers, integration tests, fitness functions) but includes no task to document how to run them, add them to CI, or explain the fixture generation approach. Even a brief note in the test conventions or a comment in the test helper would help future contributors.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good use of fixtures, and thoughtful fitness function coverage. However, the incorrect error code references (IMPORTANT) could lead to failing tests that need debugging, the missing 2 invariant fitness functions leave a gap against the stated goal, and the command name ambiguity in workflow tests risks confusion during implementation. Fixing the two IMPORTANT issues and addressing the timeout configuration would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
