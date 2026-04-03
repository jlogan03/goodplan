# Phase 1 Review: Shared Utilities Foundation

**Reviewer:** Generalist
**Score:** 7/10

## Summary

The shared utilities module extracts duplicated patterns from the 5 existing harness scripts into a well-structured `utils.ts`. The code is clean, typed, and tested (29 unit + 27 integration). However, there are several issues that will cause friction during Phase 3 migration and one correctness problem in the fixture creation.

## Critical Issues (1)

### C1: `gp()` missing `stdin` option — Phase 3 migration blocker

`gp()` hardcodes `input: ""` (line 79) and does not accept a `stdin` parameter. Both `harness.ts` and `validate.ts` pass `stdin` to their local `gp()` equivalents:

- `validate.ts:91` — `function gp(args, opts: { stdin?: string })`
- `harness.ts:70` — `function goodplan(args, opts: { cwd?, stdin? })`

These scripts use stdin to pass JSON payloads to commands like `epic:create`, `slice:create`, `quest:complete`, etc. Without `stdin` support in the shared `gp()`, Phase 3 cannot migrate these scripts without falling back to raw `execFileSync` calls, defeating the purpose of the extraction.

The plan does say "gp(args: string[], opts?: { cwd?: string, gpBin?: string })" — so the plan itself omitted `stdin`. But `createMinimalFixture` already works around this by calling `execFileSync` directly (lines 479, 500), proving `stdin` is needed. Add `stdin?: string` to the opts type and pass it through.

## Important Issues (3)

### I1: `createMinimalFixture` bypasses `gpBin` option for epic/slice creation

`createMinimalFixture` accepts no `gpBin` option and uses `DEFAULT_GP_BIN` directly for `epic:create` (line 479) and `slice:create` (line 500), while `gp init` on line 464 goes through the shared `gp()` helper. This means:
- If `GP_CLI_PATH` is set, `gp init` respects it but `epic:create`/`slice:create` do not
- There is no way for callers to override the binary path for fixture creation

Fix: either add `gpBin?: string` to `createMinimalFixture` opts and use it consistently, or route all CLI calls through the shared `gp()` function (which requires fixing C1 first for stdin support).

### I2: `DEFAULT_GP_BIN` hardcodes version `1.0.2` — fragile path

The fallback path `~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.2/binaries/macos-arm64/gp` hardcodes version `1.0.2`. The existing harness scripts use `~/bin/goodplan` instead. When the plugin version bumps, this path breaks silently. Consider using the same `~/bin/goodplan` path the existing scripts use, or at minimum document that `GP_CLI_PATH` must be set in CI.

### I3: `runSkillSession` violations are not accessible to callers

`runSkillSession` collects violations into a local array and logs them to console.warn, but never returns them. The existing `validate.ts` maintains a module-level `violations` array and generates a summary report. When Phase 3 migrates `validate.ts`, it will need access to violations for its summary. Either return `{ result: SDKResultMessage, violations: string[], cost: number }` or accept a `violations` array in opts.

Similarly, the cost tracker is internal and `total()` is never exposed. The existing scripts report cost at the end.

## Minor Issues (3)

### M1: `CliResult` interface drift from existing scripts

The new `CliResult` has `{ stdout, exitCode }` while the existing `validate.ts` `CliResult` has `{ ok, stdout, exitCode }`. The `ok` field is used in validate.ts for control flow (`if (!result.ok)`). Phase 3 migration will need to replace all `result.ok` checks with `result.exitCode !== 0`. Not a bug, but worth noting as migration friction.

### M2: Transcript buffer is module-level global state

`transcriptBuffers` (line 206) is a module-level `Map`. In unit tests, entries buffered by one test persist into subsequent tests unless explicitly flushed. The unit tests do call `flushTranscript` correctly, but there is no `clearTranscript` or reset mechanism for test isolation. The test for "filters out stream_event messages" (line 239) works only because the filtered message produces no buffer entries — if the test order changed or a prior test wrote to the same file path, it could produce false results.

### M3: `checkViolation` does not detect `sed`/`node -e` patterns

The Bash violation patterns check for `cat`, `echo >`, and `mv`, but miss `sed -i` on `.goodplan/` files and `node -e "fs.writeFileSync(...)"` patterns. These are edge cases but worth noting since the function is meant to be the single source of truth for violation detection going forward.

## Completeness vs Plan

All plan tasks for Phase 1 are implemented:
- All 16 exports listed in the plan are present in `utils.ts`
- Unit tests cover all specified functions (29 tests)
- Integration test exercises all exports including `createMinimalFixture` (27 checks)
- Plan checkboxes are correctly marked

Two plan-specified exports (`runSkillSession`, `createAskUserHandler`) are implemented but not unit-tested — the plan does not explicitly require unit tests for these (they need the Agent SDK query loop), and integration testing is deferred to Phase 2. This is acceptable.

## What Works Well

- Clean separation of concerns across utilities
- Inclusion-based transcript filtering (future-proof vs exclusion list)
- `FixtureSetupError` for distinguishing setup failures from test failures
- `gpForce` retry logic is simple and correct
- `verifyEntityStatus` returns data instead of throwing — good design for caller flexibility
- Test coverage is thorough for the pure-logic functions
