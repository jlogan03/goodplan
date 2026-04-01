# Holistic Review — Test Harness Foundation (Round 3)

## Issues

**[MINOR]** Phase 3 cross-cutting `.project/` to `.goodplan/` cleanup needs semantic awareness

Phase 3 task 6 says "Update all remaining `.project/` references to `.goodplan/` across all harness scripts" and verifies with `grep -rn "\.project/" tools/dogfood/*.ts` expecting zero matches. However, `test-onboard.ts` (lines 198-254) and `test-migrate.ts` (lines 47-210) reference `.project/` as the **actual directory name in their test fixtures** — these scripts test against repos that may legitimately use the `.project/` name (pre-migration format). `test-migrate.ts` in particular tests migration *from* `.project/` to `.goodplan/`, so some `.project/` references are functionally correct. The cross-cutting task should distinguish three categories: (a) violation detection patterns (update to `.goodplan/`), (b) AUTONOMOUS_PROMPT text (removed entirely), (c) fixture verification paths (update only if the installed CLI now creates `.goodplan/` instead of `.project/`). The grep-for-zero-matches verification will fail unless category (c) is handled. Suggest: the task should note that `test-migrate.ts` `.project/` references in fixture setup/verification are correct (it tests the migration path) and exempt them from the grep check, or adjust the grep to exclude `test-migrate.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `writeTranscriptEntry` filter list may be incomplete for future SDK versions

The plan hardcodes a filter list of message types to exclude from the transcript: `stream_event`, `SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`. The SDK's `SDKMessage` union (from the agent-sdk-api research) has 20+ variants and new ones can be added. Rather than maintaining an exclusion list that drifts with SDK upgrades, consider an inclusion-based approach (write only `assistant`, `user`, `result`, `system` types) or at least document in the `writeTranscriptEntry` task that the filter list should be reviewed when upgrading the Agent SDK. This is minor because the current list covers the known high-volume types, but a note would prevent silent transcript pollution after SDK upgrades.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `test-simulated-user.ts` makes a real API call but has no cost/failure guard

The Phase 2 test calls `simulatedUser.ask()` directly, which makes a real `messages.create()` call to the Anthropic API. If the API key is missing or invalid, the test will fail with an opaque error. The test should check for `ANTHROPIC_API_KEY` availability before running and skip gracefully if absent (similar to how integration tests in CI often gate on credentials). This also has a (tiny) recurring cost each time the test is run. Minor because it is a dev-only test script, but worth a preflight check.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

All round-2 IMPORTANT issues have been resolved:
- **Test file placement**: Correctly moved to `tests/unit/dogfood/utils.test.ts` (nested path matching repo convention).
- **Phase 3 merged into Phase 2**: The plan is now 3 phases. The integration test (`test-integration.ts`) is in Phase 2's verification section, which gives a full-stack confidence checkpoint before Phase 3 migration. This is a clear improvement.
- **`runSkillSession` error contract**: Explicitly documented — returns `SDKResultMessage` (which is `SDKResultSuccess | SDKResultError`), does NOT throw on error, callers inspect the result subtype. This resolves the ambiguity that would have caused inconsistent error handling across migrated scripts.
- **`verifyEntityStatus` return vs throw**: Now returns `{ ok: boolean, actual: string }` and does NOT throw — caller decides. Consistent with existing `entityStatus()` pattern in validate.ts.
- **Rollback guidance**: Added to Phase 3 — revert script, file issue, continue with next.
- **Simulated user model default**: Uses `tierDefault("structural")` not hardcoded string.
- **`harness.ts` LOG_DIR**: Phase 3 task 5.7 explicitly moves LOG_DIR from `.goodplan/` to `tools/dogfood/logs/`.

The plan is implementation-ready. The 3-phase structure (shared utils, simulated user + integration, migration) has clean boundaries with concrete verification at each stage. Task granularity is appropriate — Phase 1 has detailed function signatures, Phase 2 has clear API boundaries, Phase 3 has ordered migration steps with rollback. The remaining minors are quality-of-life improvements, not blockers.

To reach 10: address the `.project/` grep verification nuance for `test-migrate.ts` and add an API key preflight check to `test-simulated-user.ts`.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
