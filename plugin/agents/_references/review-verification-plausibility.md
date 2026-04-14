# Verification Plausibility Review Criteria

Domain-specific evaluation criteria for the verification plausibility reviewer. Evaluates whether verification steps in plans are actually runnable, falsifiable, and would catch regressions. Does NOT evaluate the plan's structure or technical approach — plan and domain reviewers handle those.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Expected behavior checks — are they concrete commands or vague descriptions?
- Red/green test specifications — do they reference real test frameworks, real file paths, real commands?
- Verification types (structural, behavioral, test-based) — are they appropriate for the chunk?
- The project's existing test infrastructure — does the plan's verification align with it?

## Evaluation Criteria

1. **Runnability**: Can each verification step be executed as written?
   Consider: a check that says "verify the API returns 200" is only runnable if the plan specifies how to start the server, what endpoint to hit, and what request to send. A check that says "confirm the module exports correctly" needs a concrete command (e.g., `bun test src/foo.test.ts`). Checks that require manual inspection or subjective judgment are not runnable.

2. **Falsifiability**: Would each red/green check actually fail if the implementation is wrong?
   Consider: a red test that checks "file exists" will pass trivially if the file already exists before implementation. A green test that checks "no errors in console" passes vacuously if the code isn't exercised. Good checks have clear pass/fail criteria tied to the specific behavior being implemented.

3. **Regression coverage**: Would the checks catch future regressions?
   Consider: testing only the happy path misses edge cases. Testing only that a function exists doesn't verify it works correctly. Checks should cover the behavioral contract, not just structural presence.

4. **Verification type appropriateness**: Is the chosen verification type suitable for the chunk?
   Consider: a chunk that changes runtime behavior should have behavioral verification, not just structural. A chunk that adds a new file can use structural verification. A chunk that modifies an algorithm should have test-based verification with concrete inputs and expected outputs.

5. **Evidence quality**: Would the verification evidence be useful for debugging failures?
   Consider: a check that outputs "PASS" or "FAIL" with no detail makes debugging hard. Good checks capture actual vs. expected output, relevant state, and enough context to diagnose why something failed.

## Examples

**Good (no issues):**
- Red test: `bun test src/auth/jwt.test.ts` — expected to fail because `validateToken()` doesn't exist yet
- Green test: same command — expected to pass after implementing `validateToken()`
- Structural check: `test -f src/schemas/events/milestone.ts` with specific expected exports listed
- Behavioral check: `curl -s http://localhost:3000/api/health | jq .status` expecting `"ok"`

**Bad (CRITICAL):**
- "Verify the feature works correctly" — not runnable, not falsifiable
- Red test references a test file that doesn't exist and the plan doesn't create it
- Check requires a running database but the plan doesn't address setup

**Bad (IMPORTANT):**
- Check is runnable but tests presence rather than behavior (e.g., "file exists" when behavior matters)
- Green check would pass even without the implementation (false positive)
- Verification type is structural for a behavioral change

**Bad (MINOR):**
- Check is concrete but could be more specific (e.g., checks return code but not response body)
- Evidence format could be richer but is still debuggable
