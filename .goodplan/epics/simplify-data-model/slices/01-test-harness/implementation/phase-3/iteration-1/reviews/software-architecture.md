# Software Architecture Review — Phase 3: Migrate Existing Harness Scripts

## Issues

**[CRITICAL]** Dropped stdin payloads in harness.ts — completePayload constructed but never passed
In `harness.ts`, multiple `gpLocalForce` calls construct a JSON payload variable (`completePayload`) but never pass it as `stdin`. The variable is dead code. This affects:
- Line 913-919: `slice:complete` — `completePayload` constructed but `gpLocalForce` called without `stdin`
- Line 957-960: `epic:complete` (phase2EpicComplete) — same pattern
- Line 1163-1168: `quest:complete` — same pattern

Additionally, `gpForce` in `utils.ts` does not accept `stdin` in its type signature (`opts?: { cwd?: string; gpBin?: string }`), so even if `stdin` were passed it would be silently ignored. The `gpLocalForce` wrapper in `harness.ts` also does not forward `stdin`.

These CLI commands require stdin payloads for `verificationPassed`, `learnings`, `architectureDelta`, and `verificationResults` fields. Without them, the commands will fail at runtime.
File: tools/dogfood/harness.ts:919
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Dropped stdin payloads in validate.ts — all gpForce calls lose their stdin data
In `validate.ts`, the migration replaced `gpForce(args, { stdin: JSON.stringify(...) })` with `gpForce(args, { cwd: PROJECT_DIR })`, dropping all stdin payloads. Affected calls:
- `epic:create` (line ~207): was `{ stdin: JSON.stringify({ name: epicName, goal }) }`, now `{ cwd: PROJECT_DIR }` — epic name and goal are lost
- `epic:add-verification` (line ~220): verification payload dropped
- `epic:complete` (line ~238): verificationResults payload dropped
- `slice:complete` (line ~281): verificationPassed/learnings payload dropped
- `quest:create` (line ~291): name and goal payload dropped
- `quest:complete` (line ~310): verificationPassed/learnings payload dropped
- `submit-refine-architecture` (line ~218): scores payload dropped
- `submit-refine-slices` (line ~259): scores payload dropped
- `submit-refinement` (line ~258): scores payload dropped

This is a systematic regression. The shared `gpForce()` utility does not support `stdin`, so the only fix paths are: (a) add `stdin` to `gpForce`'s type signature and pass it through, or (b) use `gp()` directly for calls requiring stdin and wrap the concurrent-modification retry manually.
File: tools/dogfood/validate.ts:207
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** gpForce utility missing stdin support — design gap in shared utils
The `gpForce()` function in `utils.ts` (line 149-159) does not accept `stdin` in its options type. Since several CLI commands require JSON payloads via stdin (`epic:create`, `quest:create`, `slice:complete`, `epic:complete`, `submit-refinement`, etc.), this is a gap in the shared utility API. Both `harness.ts` (via `gpLocalForce`) and `validate.ts` are affected.

Fix: Add `stdin?: string` to `gpForce`'s options type and pass it through to both the initial `gp()` call and the `--force` retry.
File: tools/dogfood/utils.ts:151
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Removed violation summary from harness.ts and validate.ts end-of-run reports
The original `harness.ts` printed an aggregate violation summary at the end of the run (count + details). The migrated version removes this entirely — violations are only logged inline by `runSkillSession` as they occur. For validate.ts, the original printed "VIOLATIONS: N" or "ZERO .project/ access violations" in the summary section; this is completely removed.

While violations are still detected and logged to individual log files, the removal of the aggregate summary at run completion makes it easy to miss violations in long harness runs. The inline `console.warn` during the run scrolls past quickly in hundreds of lines of output.

Consider adding a post-run violation count to the summary sections, sourced from `runSkillSession` results.
File: tools/dogfood/harness.ts:2001
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Dead code: unused `writeFileSync` import in test-migrate.ts
The `writeFileSync` import was removed from `test-migrate.ts`, which is correct since it's no longer used directly. However, `readFileSync` was also removed from the import list even though the `fs` import block retains other items. This is fine — just noting the import cleanup is consistent.
File: tools/dogfood/test-migrate.ts:14
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** harness.ts error handling changed from finally to catch — different semantics
The original `harness.ts` used `try { ... } finally { restoreSkillModels() }` which always ran cleanup. The migrated version uses `catch` instead of `finally`, swallowing errors to "fall through to summary." This is intentional (removing model patching makes `finally` unnecessary), but the catch block now silently absorbs all errors. If an unexpected error occurs, it's logged but the process exits with code 0. Consider whether `process.exit(1)` should be set after the summary when an error was caught.
File: tools/dogfood/harness.ts:1992
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** GOODPLAN_BIN still referenced in test-onboard.ts and test-migrate.ts
Both `test-onboard.ts` (line 38) and `test-migrate.ts` (line 41) still define `GOODPLAN_BIN = join(HOME, ".local/bin/goodplan")` and use it in post-run verification (`execFileSync(GOODPLAN_BIN, ...)`). While these are not broken (they work for the post-run CLI verification steps), they bypass the shared `gp()` utility's bin resolution logic (`GP_CLI_PATH` env var, plugin cache discovery). This creates two different code paths for finding the gp binary within the same script.
File: tools/dogfood/test-onboard.ts:38
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10
The deduplication pattern is sound and the shared utilities API is well-designed, but the two CRITICAL issues (dropped stdin payloads in both `harness.ts` and `validate.ts`) represent functional regressions that will cause runtime failures for any complete/create/score-submission CLI commands. The `gpForce` utility is missing `stdin` support, which is the root cause. Fixing the stdin plumbing and restoring the violation summary would bring this to 9+.

## Summary
- Critical: 2
- Important: 2
- Minor: 3
