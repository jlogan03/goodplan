# Software Architecture Review — Phase 3: Migrate Existing Harness Scripts (Iteration 2)

## Issues

**[IMPORTANT]** Missing aggregate violation summary in harness.ts end-of-run report
The original `harness.ts` accumulated `directAccessViolations` across all skill runs and printed a summary at the end (count + per-violation details). The migrated version logs violations inline per-skill via `runSkillSession` but does not accumulate them for an end-of-run summary. In a long harness run (phases 2+3+4), inline warnings scroll past in hundreds of lines of output. The validate.ts script correctly addressed this by introducing `allViolations: string[]` at module scope and printing them in the summary section — harness.ts should follow the same pattern.

The fix: add a module-level `const allViolations: string[] = [];` in harness.ts, push to it in the `runSkill` function when `session.violations.length > 0`, and print the accumulated list in the HARNESS SUMMARY block alongside the existing cost/elapsed/friction-log lines.
File: tools/dogfood/harness.ts:291
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** harness.ts `logCliResult` uses `result.exitCode === 0` but CliResult only has `exitCode` — consistent but worth noting
The `logCliResult` helper in harness.ts checks `result.exitCode === 0` which is the correct pattern for the new `CliResult` type (no `.ok` field). This is correct. However, the original code also logged stderr content on failure, which is no longer available since `CliResult` only exposes `stdout`. If a CLI command fails with useful stderr output, that diagnostic information is lost. This is a conscious simplification at Experimental maturity — acceptable, but worth noting if debugging harness failures becomes difficult.
File: tools/dogfood/harness.ts:306
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All CRITICAL and IMPORTANT issues from iteration 1 are correctly fixed:
- `gpForce` in utils.ts now accepts `stdin` in its type signature and passes it through to both `gp()` and the `--force` retry
- `gpLocalForce` in harness.ts correctly forwards `stdin`
- validate.ts passes both `cwd: PROJECT_DIR` and `stdin: JSON.stringify(...)` to all `gpForce` calls
- validate.ts has an aggregate `allViolations` summary restored in the end-of-run report
- harness.ts error handling now sets `caughtError = true` and calls `process.exit(1)` after the summary
- GOODPLAN_BIN references removed from test-onboard.ts and test-migrate.ts, replaced with shared `gp()` / `gpJson()` utilities
- Unused imports cleaned up

The remaining IMPORTANT issue (harness.ts missing aggregate violation summary) is a parity gap with validate.ts — the same pattern exists and just needs to be applied. Fixing it would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
