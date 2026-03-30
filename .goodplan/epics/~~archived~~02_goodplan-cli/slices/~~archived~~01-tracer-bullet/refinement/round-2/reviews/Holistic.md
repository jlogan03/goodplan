# Holistic Review: Tracer Bullet Plan (Round 2)

## Round 1 Fix Verification

All 18 round-1 issues (1 CRITICAL, 7 IMPORTANT, 10 MINOR) have been addressed in the current plan. Key fixes verified:

- C1 (runCommand not runMain): Phase 3 explicitly specifies `runCommand` with custom error handler, `process.exitCode` strategy, manual `--help` handling.
- I1 (--query replaces --smoke-jq): Phase 5 implements `--query <expr>` with `--json` requirement and goal.md correction noted.
- I2 (readEntity/writeEntity naming): Phase 2 uses architecture-aligned naming.
- I3 (directories): Phase 1 creates only needed directories, notes conventions.md discrepancy.
- I4 (merge semantics): Phase 3 specifies stdin-base, flags-override, Zod-validates.
- I5 (z.infer convention): Phase 2 establishes the pattern explicitly.
- I6 (StatusResult null pointers): Phase 2 documents the constraint.
- I7 (NO_COLOR): Both Phase 5 and Phase 6 include NO_COLOR verification.
- M1-M11: All minor issues addressed (build script moved to Phase 6, walk-up test added, before-checks use file absence, known limitations documented, etc.).

## Issues

**[IMPORTANT] Phase 3 exit code for `badcommand --json` sends error to wrong stream**
Phase 3 Expected Behavior says: `bun run src/index.ts badcommand --json 2>&1; echo $?` -- exit 2, stdout shows `{"error":{"code":"VALIDATION_UNKNOWN_COMMAND",...}}`. However, the `output.ts` task description says "error output (JSON to stdout or message to stderr based on --json flag)." The commands-api.md is clear: "In human-readable mode, only `message` is printed to stderr. In `--json` mode, the full error object is printed to stdout." The plan is internally consistent on this point, but the Expected Behavior check uses `2>&1` (merge stderr into stdout) which would pass regardless of which stream the error goes to. The verification should test that the JSON error goes to stdout specifically: `bun run src/index.ts badcommand --json; echo $?` (without `2>&1`), or explicitly assert that stderr is empty while stdout contains the JSON. As written, the check cannot distinguish correct behavior from incorrect behavior.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 `--help` handling task lacks specificity on what to render**
Phase 3 says the custom runner must "handle `--help` rendering manually since `runMain`'s auto-help is bypassed." But it does not specify whether to use citty's `renderUsage` / `showUsage` functions (documented in the citty research) or build help output from scratch. The citty research shows `renderUsage` returns a usage string and `showUsage` prints it. Using these would give consistent help formatting with citty conventions while still using `runCommand` for execution. The plan should specify using citty's built-in help rendering utilities rather than leaving this ambiguous.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 does not test the `--name` default (directory basename)**
Phase 4 Expected Behavior tests `init --name test-project` but never tests `init` without `--name`, which should default to `path.basename(cwd)`. The task description says "--name flag (optional, defaults to path.basename(cwd))" but the default behavior is unverified. In a compiled binary, `path.basename(cwd)` could produce unexpected results depending on where the binary is run (e.g., from `/` the name would be empty string). Add a verification: `cd /tmp/my-test-dir && /path/to/src/index.ts init && cat .project/project.json` confirms name is "my-test-dir".
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 `--query` error handling not specified**
Phase 5 says `--query` requires `--json` (error if used without it). But it does not specify what happens for: (1) invalid jq expression (e.g., `--query '.[invalid'`), (2) expression that returns no results, (3) expression that returns multiple results. The commands-api.md specifies: invalid expression -> exit 2 with VALIDATION_INVALID_QUERY; empty result -> exit 0, prints `null`; multiple results -> JSON array. The plan should reference these behaviors or at least note that error handling follows commands-api.md, so the implementer knows to handle these edge cases in this slice rather than deferring them.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 issues have been thoroughly addressed. The plan is well-structured with clear phasing, concrete verification criteria, and good alignment to the confirmed goal and architecture docs. The remaining issues are minor refinements: one verification that cannot distinguish correct from incorrect stream routing, help rendering specificity, an untested default value, and unspecified query error handling. None would prevent a competent implementer from succeeding, but addressing them would prevent ambiguity.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
