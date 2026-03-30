# Software Architecture Review: Tracer Bullet Plan (Round 2)

## Round 1 Fix Verification

All 18 round 1 items were verified against the updated plan:

- **C1 (runMain exit codes):** FIXED. Phase 3 now explicitly specifies `runCommand` (not `runMain`), custom top-level runner with error inspection, `process.exitCode` assignment, manual `--help` handling, avoids `-v` conflict. Well specified.
- **I1 (--smoke-jq replaced with --query):** FIXED. Phase 5 now implements `--query <expr>` with jqjs, specifies `--query requires --json`, notes `.project.name` correction from goal.md.
- **I2 (readEntity/writeEntity naming):** FIXED. Phase 2 now uses `readEntity<T>` and `writeEntity<T>` matching the architecture spec.
- **I3 (directory structure):** FIXED. Phase 1 creates only directories needed for this slice. Notes that `conventions.md` directory listing needs updating.
- **I4 (validateInput merge semantics):** FIXED. Phase 3 specifies stdin base, CLI flags override, Zod validation on merged object.
- **I5 (z.infer convention):** FIXED. Phase 2 establishes the pattern explicitly as a task.
- **I6 (StatusResult active pointer docs):** FIXED. Phase 2 documents that active pointers are projections requiring entity lookup, always null in this slice.
- **I7 (NO_COLOR verification):** FIXED. Phase 5 Expected Behavior and Phase 6 verification both include `NO_COLOR=1` checks.
- **M1 (stdin tests):** FIXED. Phase 3 now includes unit tests for stdin.ts (TTY detection, JSON parsing, size limit).
- **M2 (unknown flags):** FIXED. Documented as known limitation in plan overview.
- **M3 (build script):** FIXED. Removed from Phase 1, only in Phase 6.
- **M5 (verification paths):** FIXED. All verification uses `bun run src/index.ts` from project root.
- **M6 (walk-up test):** FIXED. Phase 2 tests include nested subdirectory resolution test.
- **M7 (process.exitCode):** FIXED. Phase 3 specifies `process.exitCode` with natural exit.
- **M8 (binary size docs):** FIXED. Phase 6 says "Document binary size for baseline tracking in the slice's completion notes."
- **M9 (before-checks):** FIXED. Phase 2 before-checks assert absence of specific files.
- **M10 (help grouping):** FIXED. Documented as known limitation in plan overview.
- **M11 (deterministic keys):** FIXED. Phase 2 specifies `JSON.stringify` replacer with sorted `Object.entries()`.

## Issues

**[IMPORTANT] Phase 3 exit code handling: `process.exitCode` may not prevent citty from calling `process.exit(1)` internally**

Phase 3 specifies using `runCommand` and setting `process.exitCode` to let the process exit naturally. However, the plan says the custom runner "catches errors and inspects error type/code" -- this works for errors thrown by the `run()` function of commands, but citty's own argument parsing errors (e.g., `EARG` for invalid enum values) may be thrown before `run()` is invoked. The plan says to "catch citty's unknown command error" which implies wrapping `runCommand` in try/catch. This should work because `runCommand` throws `CLIError` for both argument validation and unknown commands (per the citty research). However, the plan should make explicit that the try/catch wraps the entire `runCommand` call and that `CLIError` with code `E_UNKNOWN_COMMAND` maps to exit 2, `EARG` maps to exit 2, and `GoodplanError` from command `run()` bodies maps based on its error code. Currently the plan says "inspects error type/code" but doesn't enumerate the citty error codes that need handling.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4 init command creates `.project/` directory but plan doesn't address the `resolveProjectDir()` bootstrapping problem**

Phase 2 creates `resolveProjectDir()` which walks up from cwd looking for `.project/`. Phase 4's init command needs to check if `.project/` exists (to prevent double-init) and then create it. But `resolveProjectDir()` is designed to find an existing `.project/` -- if none exists, it presumably throws or returns null. The init command needs a different code path: check if `.project/` exists in the current directory specifically (not walk up), then create it. The plan says "check if .project/ exists (error if so)" but doesn't say whether this uses `resolveProjectDir()` or a direct `fs.existsSync` check. If init uses `resolveProjectDir()`, it might find a `.project/` in a parent directory and incorrectly report `STATE_ALREADY_INITIALIZED` when the user intended to init a nested project. The init command should check only the current working directory for `.project/` existence, not walk up the tree. This is an architectural nuance that should be explicit.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 verification lists 9 checks but goal.md lists 7 success criteria -- they overlap but don't match exactly**

Phase 6 verification has 9 numbered items (1-9) including a NO_COLOR check (#9) that was added from round 1 feedback. Goal.md's success criteria list 7 items. The numbering mismatch isn't a problem per se, but Phase 6's overview says "Run full verification sequence from goal.md" and then lists items that don't exactly match goal.md. Specifically, Phase 6 adds "Init duplicate" (item 3) as a separate check and "NO_COLOR" (item 9), while goal.md's item 7 uses `--smoke-jq` which was replaced with `--query`. The plan's Phase 6 verification is more comprehensive than goal.md, which is fine -- the plan should be the authoritative verification list, not goal.md. But the plan text says "from goal.md" which is now inaccurate since the plan has evolved beyond goal.md's original checks.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `errorSchema` in `src/schemas/errors.ts` may conflict with error handling in `src/util/errors.ts`**

Phase 2 creates both `src/schemas/errors.ts` (Zod schema for the error shape: code, message, detail) and `src/util/errors.ts` (`GoodplanError` class with code, message, detail, plus `isGoodplanError()` type guard). These serve different purposes -- the schema validates error JSON output while the class is thrown internally -- but having `errors.ts` in two locations (`schemas/` and `util/`) could confuse implementers about where error-related code belongs. The boundary is clear (schemas/ for Zod validation shapes, util/ for runtime error classes) but the file naming creates ambiguity. Consider `src/schemas/errors.ts` -> `src/schemas/shared/error-output.ts` or similar to distinguish it from the runtime error class. Alternatively, this is minor enough that clear module-level doc comments suffice.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 `output()` function error behavior in `--json` mode sends errors to stdout, which may surprise callers piping stdout**

The plan (Phase 3) specifies: "error output (JSON to stdout or message to stderr based on --json flag)." The architecture's `commands-api.md` confirms: "In `--json` mode, the full error object is printed to stdout." This means `goodplan badcommand --json 2>/dev/null` would print the error JSON to stdout, mixing error output with normal data output in the same stream. This is intentional (LLM consumers parse stdout), but the plan should note that Phase 3's Expected Behavior `badcommand --json 2>&1` uses `2>&1` which merges stderr into stdout for the test -- the actual error JSON goes to stdout, so `2>&1` is unnecessary. The Expected Behavior line should be: `bun run src/index.ts badcommand --json; echo $?` -- checking stdout directly, not merging streams.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 18 round 1 issues were properly addressed. The plan is well-structured with clear phase boundaries, concrete Expected Behavior checks, and proper alignment with architecture docs. The remaining issues are minor refinements: the citty error code enumeration (IMPORTANT) provides implementation clarity, the init bootstrapping distinction (IMPORTANT) prevents a subtle bug, and the three MINOR items are polish. Addressing the two IMPORTANT items would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
