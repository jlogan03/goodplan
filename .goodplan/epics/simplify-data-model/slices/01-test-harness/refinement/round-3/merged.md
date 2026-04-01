# Merged Review — Test Harness Foundation (Round 3)

## Scores

| Reviewer | Score |
|---|---|
| holistic | 9/10 |
| software-architecture | 9/10 |
| typescript | 9/10 |

## Summary

All round-2 IMPORTANT issues have been fully resolved. The plan is implementation-ready. The 3-phase structure (shared utils, simulated user + integration, migration) has clean boundaries with concrete verification at each stage. Module boundaries are clean: `utils.ts` is a deep module hiding query loop mechanics, `canUseTool` composition, transcript buffering, and fixture lifecycle behind a small public API. The remaining issues are all minor quality-of-life improvements or documentation clarity items — none are blockers.

**Critical: 0 | Important: 0 | Minor: 5**

---

## Issues

### [MINOR-1] Phase 3 `.project/` grep check needs semantic awareness

**Source:** holistic

Phase 3 task 6 uses `grep -rn "\.project/" tools/dogfood/*.ts` expecting zero matches. However, `test-migrate.ts` references `.project/` legitimately — it tests migration *from* `.project/` to `.goodplan/`, so some `.project/` references in fixture setup/verification are functionally correct. The zero-match assertion will fail unless these are exempted.

Three categories should be distinguished: (a) violation detection patterns → update to `.goodplan/`, (b) `AUTONOMOUS_PROMPT` text → remove entirely, (c) fixture verification paths in `test-migrate.ts` → exempt from grep or skip only that file.

Suggest: note in the task that `test-migrate.ts` `.project/` references in fixture setup/verification are correct and adjust the grep to exclude that file (e.g., `grep -rn "\.project/" tools/dogfood/*.ts --exclude=test-migrate.ts`).

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR-2] `writeTranscriptEntry` filter list may drift with SDK upgrades; discriminants need clarification

**Source:** holistic, typescript (merged — same subject, complementary angles)

Two related issues:

1. **Drift risk:** The filter list (`stream_event`, `SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`) is an exclusion list. The SDK's `SDKMessage` union has 20+ variants and new ones can be added. An inclusion-based approach (write only `assistant`, `user`, `result`, `system` types) would be more future-proof. At minimum, add a comment in the `writeTranscriptEntry` task noting the list should be reviewed on each Agent SDK upgrade.

2. **Discriminant ambiguity:** `SDKToolProgressMessage` and `SDKRateLimitEvent` are listed as TypeScript type names without specifying their runtime `type`/`subtype` discriminant values. `SDKPartialAssistantMessage` likely has `type: 'stream_event'`, meaning the single `stream_event` check may already cover it and the extra names are documentation only. If `SDKToolProgressMessage` and `SDKRateLimitEvent` use different discriminants, the implementer must verify at implementation time. The unit test for `writeTranscriptEntry` will catch any missed filtering, so the risk is low.

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR-3] `test-simulated-user.ts` needs an API key preflight check

**Source:** holistic

The Phase 2 test calls `simulatedUser.ask()` which makes a real `messages.create()` call to the Anthropic API. If `ANTHROPIC_API_KEY` is missing or invalid, the test fails with an opaque error. Add a preflight check (consistent with how integration tests typically gate on credentials) that skips gracefully with a clear message if the key is absent. Minor because this is a dev-only test script, but it prevents confusing failures.

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR-4] `runSkillSession` / `gpForce` missing narrowing helper and retry signal

**Source:** software-architecture, typescript (merged — related deepening opportunities on the same two functions)

Two related deepening opportunities:

1. **`runSkillSession` type guard:** Returns `Promise<SDKResultMessage>` (`SDKResultSuccess | SDKResultError`), explicitly does not throw on error. Every caller must write the discriminant check (`result.subtype === 'success'`). A one-line type guard exported from `utils.ts` (e.g., `isSuccess(result): result is SDKResultSuccess`) would prevent callers from accidentally checking `result.type` instead of `result.subtype`. Callers are few (5 scripts) so risk is low, but a guard is a negligible-cost deepening.

2. **`gpForce` retry signal:** Returns the failing `CliResult` as-is if `--force` also fails — identical shape to a first-attempt failure. Callers cannot distinguish "failed once, no retry" from "failed twice after retry." Matches existing `validate.ts` behavior so not a regression, but adding `retried: boolean` to the returned object would improve diagnostic logging during Phase 3 migrations.

3. **`CliResult` type definition:** Phase 1 specifies `gpForce(args: string[], opts?): CliResult` but does not define `CliResult`. The `gp()` function returns `{ stdout: string, exitCode: number }` which is presumably the same shape. Define `CliResult` as a named exported type alongside `gp()` to prevent drift.

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR-5] Phase 3 rollback guidance uses `git checkout --` (prefer `git restore`)

**Source:** software-architecture

Phase 3 rollback guidance says `git checkout -- tools/dogfood/<script>.ts`. The modern equivalent is `git restore tools/dogfood/<script>.ts`. Both achieve the same result, but `git restore` is the current convention and aligns with the harness environment's CLAUDE.md guidance to prefer non-destructive alternatives. Cosmetic but worth aligning.

Resolution: DIRECTLY_ACTIONABLE

---

## What Round 2 Resolved (for reference)

All of the following IMPORTANT issues from round 2 are confirmed resolved:

- Test file placement: moved to `tests/unit/dogfood/utils.test.ts` matching repo convention
- Phase 3 merged into Phase 2: plan is now 3 phases with integration test in Phase 2 verification
- `runSkillSession` error contract: returns `SDKResultMessage`, does not throw, callers inspect subtype
- `verifyEntityStatus` return vs throw: returns `{ ok: boolean, actual: string }`, does not throw
- Rollback guidance: added to Phase 3 (now updated to prefer `git restore` — see MINOR-5)
- Simulated user model default: uses `tierDefault("structural")` not a hardcoded string
- `harness.ts` LOG_DIR: Phase 3 task 5.7 explicitly moves it to `tools/dogfood/logs/`
- `@anthropic-ai/sdk` dependency: explicit install task added to Phase 2
- `runSkillSession` `canUseTool` composition: redesigned with `simulatedUser` + `checkViolations` params
- `createMinimalFixture` source scaffolding: optional via `withSource?: boolean` (default: false)
- `createAskUserHandler` blanket allow: documented as a limitation
- `writeTranscriptEntry` buffering: flush-on-close with `flushTranscript()` export and unit test coverage
