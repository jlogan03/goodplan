# Phase 2 Review: Integration Tests

**Score: 9/10**

## Summary

Solid implementation. All 7 test files cover the plan-specified scenarios with good structure, consistent helper usage, and meaningful assertions. Tests are well-organized with proper cleanup and clear failure messages.

## Critical (0)

None.

## Important (2)

1. **Plan specifies `start-plan`, `start-refinement`, `start-implementation` commands but tests use different command names.** The plan (lines 72-75) says the slice lifecycle should use `start-plan`, `start-refinement`, `start-implementation` as shared commands. The actual tests use `slice:plan`, `submit-plan`, `slice:refine-plan`, `submit-refinement`, `slice:implement`, `submit-implementation` -- which are the correct real command names. This is a plan-vs-implementation mismatch where the implementation is correct and the plan was imprecise. No code change needed, but worth noting.

2. **Circuit breaker fixture starts at round 10/10 instead of round 9/10 as plan suggests.** Plan says "Use a fixture starting at a high refinement round (e.g., round 9 of 10) so only 1-2 spawns are needed." The fixture starts at round 10/10 with status `refining`, meaning it already completed 10 rounds of score history. This works correctly (submit-refinement sees round >= maxRounds and triggers the circuit breaker), but the fixture is arguably at a higher round than the plan suggested. Functionally fine -- the test exercises the exact right behavior.

## Minor (3)

1. **`workflow-init.test.ts` doesn't use `withFixture` helper.** It manually creates/cleans temp dirs. This is reasonable since init creates the `.project/` from scratch (no fixture to copy), but the pattern differs from other test files. Consider whether a `withEmptyDir` helper would reduce boilerplate, though the current approach is clear enough.

2. **`workflow-quest.test.ts` plan mentions `deferred` in stdin for `quest:complete` but test uses `architectureDelta` instead.** Plan line 75 says `{ "verificationPassed": true, "learnings": [], "deferred": [] }` but the test sends `{ "verificationPassed": true, "learnings": [], "architectureDelta": [] }`. The test passes, so the schema accepts this -- but it's a deviation from the plan's stated input shape.

3. **`error-transitions.test.ts` test for "slice:plan on non-existent slice" asserts `STATE_INVALID_TRANSITION`.** The plan says to test "slice:plan on a slice that hasn't been created" which should return `STATE_INVALID_TRANSITION`. The test actually tries a completely non-existent slice name (`nonexistent-slice`), which could arguably be a different error (not-found vs. wrong-status). It works because the system treats both as invalid transitions, but the semantic intent differs slightly.

## Strengths

- Consistent use of `buildBinary()`, `runCommand()`, `runChain()`, and `withFixture()` across all files
- Good error message context in assertions (e.g., `expect(r1.exitCode, \`submit-explore failed: ${r1.stderr}\`).toBe(0)`)
- Circuit breaker tests cover all three paths: blocked, --override bypass, passing-scores bypass (third case goes beyond plan requirements)
- Runner mode tests cover all 6 plan-specified scenarios including NO_COLOR
- JSON error structure validation is thorough -- checks both code and message fields
- On-disk verification (reading back JSON files) confirms state persistence, not just command output
