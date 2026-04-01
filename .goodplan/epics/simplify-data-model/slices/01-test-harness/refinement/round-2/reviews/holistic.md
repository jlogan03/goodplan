# Holistic Review — Test Harness Foundation (Round 2)

## Issues

**[IMPORTANT]** Phase 1 test file placement does not follow repo convention

The plan places tests at `tests/unit/dogfood-utils.test.ts` (flat file at the unit root). Every other unit test in the repo is in a subdirectory: `tests/unit/schemas/`, `tests/unit/state/`, `tests/unit/data/`, `tests/unit/commands/`, etc. The dogfood utils test should live at `tests/unit/dogfood/utils.test.ts` (or similar nested path) to match the established convention. This is a small fix but prevents setting a bad precedent for future test files.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 is thin — its only task could be absorbed into Phase 2 or Phase 4

Phase 3 ("Integration Verification") contains a single task: create `test-integration.ts` that exercises all shared utilities together. This is effectively the end-to-end test for Phases 1+2. But Phase 4 already includes running each migrated script end-to-end — the first migrated script (`test-plugin-skills.ts`) inherently validates the full stack. Phase 3's standalone integration test adds value only if it runs faster or tests a simpler scenario than Phase 4's migrations. The plan should either: (a) justify Phase 3's existence by specifying what it catches that Phase 4 would miss, (b) merge its task into Phase 2's verification, or (c) accept the slight redundancy and keep it as a confidence checkpoint. Currently, Phase 3 feels like an unnecessary phase boundary that adds overhead without clear incremental value.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `runSkillSession` return type assumes `SDKResultMessage` but sessions can error

The Phase 1 task specifies `runSkillSession()` returns `Promise<SDKResultMessage>`. But `SDKResultMessage` is `SDKResultSuccess | SDKResultError` (per the research). The plan should specify the error handling contract: does `runSkillSession` throw on `SDKResultError`, or does it return it and let the caller decide? The current harness scripts handle errors differently — `validate.ts` checks `message.subtype === "success"` and logs errors, while `harness.ts` has more elaborate error handling with phase-specific recovery. The shared utility should have an explicit contract documented in the task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `verifyEntityStatus` description says "throws on mismatch" but test says "passes on match, throws on mismatch"

The task description says the function "compares `.status` to expected. Throws with expected vs actual." But the return type is `{ ok: boolean, actual: string }` — which implies it returns rather than throws. These are contradictory. Pick one: either it returns a result object (and the caller throws), or it throws on mismatch (and doesn't need the return type). The existing `entityStatus()` in `validate.ts` returns a string and never throws — the caller compares. Suggest matching that pattern: return `{ ok: boolean, actual: string }` and let the caller decide.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 migration order rationale is good but missing rollback guidance

The plan migrates scripts from simplest to most complex, which is sound. However, there is no guidance on what to do if a migration breaks a script mid-Phase 4. Should the implementer revert that script and continue with others? Should they fix forward? For `harness.ts` (the most complex), a partial migration is plausible. A note like "if a migration breaks, revert that script to pre-migration state and file an issue" would help the implementer.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `createSimulatedUser` model default should use `tierDefault()` not hardcoded string

Phase 2 says the simulated user "uses haiku by default." Phase 1 defines `tierDefault()` which returns haiku for structural/pipeline tests. The simulated user's default model should call `tierDefault("structural")` rather than hardcoding `"claude-haiku-4-5"`, keeping the model selection centralized through the tier system defined in Phase 1.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `harness.ts` still references `.project/` in its LOG_DIR path

Line 43 of `harness.ts` sets `LOG_DIR = join(GOODPLAN_DIR, ".project/quests/dogfood-harness/harness-logs")`. The Phase 4 cross-cutting cleanup task says to update all `.project/` references to `.goodplan/`, but this particular case is a log output directory, not a state access — it may not even exist as a `.goodplan/` path. The plan should clarify whether this LOG_DIR path should be migrated to `.goodplan/` (if that path now exists) or moved to a non-state location entirely (e.g., `tools/dogfood/harness-logs/`). Writing logs into `.goodplan/` would itself be a violation of the state integrity model.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Round 1's critical issue (canUseTool vs hooks.PreToolUse conflation) has been fully resolved — the plan now consistently uses `canUseTool` with correct return types and naming (`createAskUserHandler`). The `.project/` to `.goodplan/` fix is explicitly called out in `checkViolation`. The `harness.ts` migration is broken into sub-steps with truncated verification. The Phase 2 integration test is now properly split (direct `ask()` test + deferred end-to-end). The `gpForce()` retry behavior is fully specified (1 retry, no delay, caller decides on second failure). The `createMinimalFixture` CLI invocations now specify stdin JSON patterns. Cleanup patterns (`finally { rmSync(...) }`) are documented. All round-1 CRITICAL and IMPORTANT issues appear addressed.

To reach 9+: resolve the `runSkillSession` error handling contract (important for downstream migration consistency), address the test file placement convention, and either justify Phase 3 or merge it.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
