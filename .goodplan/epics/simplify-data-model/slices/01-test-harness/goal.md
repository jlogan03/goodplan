# Test Harness Foundation

## What We're Building
Upgrade the Agent SDK test harness at `tools/dogfood/` to support the new consolidated skill model. The current harness auto-selects the first option for every AskUserQuestion and uses hardcoded models — this slice adds LLM-simulated contextual responses, per-test model selection, CLI-based phase verification, and shared utilities. These improvements are prerequisite tooling for validating all subsequent skill consolidation slices.

## Behavior
1. Replace the `canUseTool` interceptor's auto-first-option logic with an LLM call that reads the question, options, and fixture context to generate a contextually appropriate answer. Use haiku for structural tests, sonnet for quality tests.
2. If the LLM call fails (API error, timeout, empty response), fall back to selecting the first option with a warning logged.
3. Accept `--model` CLI argument in all harness scripts to override the default model per test tier (structural: haiku, pipeline: haiku, quality: opus).
4. Add `verifyEntityStatus()` function that queries CLI status (installed `gp` binary, or configurable via `GP_CLI_PATH` env var) and asserts expected status after each skill run. Example: run `test-plugin-skills.ts`, invoke `/gp:project-status`, assert the returned `status` field equals the expected value. Failure = status mismatch throws with expected vs actual.
5. Extract common patterns into `tools/dogfood/utils.ts`: `createMinimalFixture()`, `verifyEntityStatus()`, `simulateUserResponse()`, `createCostTracker()`, `createLogger()`.
6. Create a minimal fixture setup helper that runs `gp init` + `gp epic:create` + `gp slice:create` against a temp directory.
7. Update existing harness scripts (`validate.ts`, `test-plugin-skills.ts`, `test-onboard.ts`, `test-migrate.ts`) to use the shared utilities.

## Verification
- [ ] Run `bun tools/dogfood/test-plugin-skills.ts` — completes without errors, simulated responses appear in log output (not just "Proceed")
- [ ] Run `bun tools/dogfood/test-plugin-skills.ts --model claude-haiku-4-5` — uses the specified model override
- [ ] Run a harness script against a minimal fixture — `verifyEntityStatus()` correctly asserts entity status after skill run (e.g., invoke `/gp:project-status`, assert status equals expected value; intentionally wrong status throws error)
- [ ] Mock API client to throw connection error during a test — simulated response falls back to first option with a warning in the log

Run the updated `test-plugin-skills.ts` harness end-to-end. Verify that the log output shows contextual answers being selected (not just the first option every time). Run with `--model claude-haiku-4-5` and confirm the model override is respected. Create a minimal fixture in a temp directory using `createMinimalFixture()`, run a basic skill against it, and verify `verifyEntityStatus()` correctly reports the entity's post-run status.

## Scope Boundaries
**In scope:** `tools/dogfood/utils.ts` (new), updates to all existing harness scripts, `simulateUserResponse()` with LLM call + fallback, `--model` CLI arg parsing, `verifyEntityStatus()` via CLI, `createMinimalFixture()` helper, `createCostTracker()`, `createLogger()`
**Out of scope:** Per-skill test scripts (test-plan-slice.ts, test-create-epic.ts, etc.) — those are written in the slice that builds each skill. Orchestrator context discipline verification (added when first pipeline skill is built).
