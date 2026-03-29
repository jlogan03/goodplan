# Holistic Review: Tracer Bullet Plan (Round 3)

## Round 2 Fix Verification

Verified all round-2 IMPORTANT and MINOR issues against the current plan:

**IMPORTANT fixes (focus of this round):**

- **Stream verification** (Holistic I1 + Software Architecture I2): Phase 3 Expected Behavior line `bun run src/index.ts badcommand --json 2>&1; echo $?` still uses `2>&1`. **NOT FIXED.** See issue below.
- **Citty error code mapping** (Software Architecture I1): Phase 3 now enumerates: `CLIError` with `E_UNKNOWN_COMMAND` -> exit 2, `EARG` -> exit 2, `GoodplanError` -> exit based on error code, all other errors -> exit 1. **FIXED.**
- **Init cwd check** (Software Architecture I2): Phase 4 now explicitly says "check if `cwd/.project/` exists via direct `fs.existsSync` (NOT `resolveProjectDir()`, which walks up...)". **FIXED.**

**MINOR fixes (all verified fixed):**

- Help rendering uses citty's `showUsage` (Phase 3 task 4). FIXED.
- Init `--name` default tested with fresh temp dir named `my-test-dir` (Phase 4 Expected Behavior). FIXED.
- `--query` error handling specified: invalid expression -> exit 2 + VALIDATION_INVALID_QUERY, no results -> null, multiple results -> JSON array (Phase 5 tasks). FIXED.
- Error schema file renamed to `src/schemas/error-output.ts` (Phase 2 tasks). FIXED.
- Phase 6 overview says "per plan verification list" not "from goal.md". FIXED.
- Verification count in Phase 6 says "9-check" consistently. FIXED.

## Issues

**[IMPORTANT] Phase 3 stream verification check uses `2>&1` making it non-falsifiable**

Phase 3 Expected Behavior contains:
```
bun run src/index.ts badcommand --json 2>&1; echo $?
```
The `2>&1` merges stderr into stdout, so the check passes whether the JSON error goes to stdout (correct) or stderr (incorrect). This was flagged in both the Holistic and Software Architecture round-2 reviews. The architecture spec is explicit: in `--json` mode, the full error object goes to stdout. The check should verify this specifically by removing `2>&1` and asserting stdout directly:
```
bun run src/index.ts badcommand --json; echo $?   # stdout shows JSON error, stderr is empty, exit 2
```
Or use split-stream verification:
```
bun run src/index.ts badcommand --json 2>/dev/null; echo $?   # stdout shows JSON, stderr suppressed
```
As written, the check cannot detect an implementation that sends JSON errors to stderr instead of stdout.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 Expected Behavior has no negative test for `--query` without `--json`**

Phase 5 tasks specify: "`--query` requires `--json` (error if used without it)." But the Expected Behavior section has no check exercising this constraint. All four after-checks test success paths or valid `--query` usage. A falsifiable check should be added:
```
bun run src/index.ts status --query '.project.name'; echo $?   # exit 2, error about --json required
```
Without this, an implementer who silently ignores the constraint (allowing `--query` without `--json`) would pass all Expected Behavior checks.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 human-readable `badcommand` check uses `2>&1` unnecessarily**

Phase 3 Expected Behavior line: `bun run src/index.ts badcommand 2>&1; echo $?` — exit 2, stderr shows error message. In human-readable mode, errors correctly go to stderr, so `2>&1` is needed to capture the message in a terminal session. However, the check says "stderr shows error message" which `2>&1` does not actually verify — it merges stderr into stdout so both appear in terminal output, but a script can't tell which stream it came from. The annotation "stderr shows error message" is the correct expected behavior, but the command as written doesn't prove it. This is lower severity than the `--json` case (stream routing for human-readable errors is less critical to machine consumers), but for completeness:
```
bun run src/index.ts badcommand 2>/tmp/err.txt; echo $?; cat /tmp/err.txt   # stderr captured separately
```
Or simply document that `2>&1` is used for readability in the terminal and that stream routing is validated by the `--json` check.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Two of the three round-2 IMPORTANT issues were fixed (citty error code mapping and init cwd check). One IMPORTANT issue remains: the `2>&1` stream verification was flagged in two separate round-2 reviews but was not corrected in the plan. The two new MINOR issues (missing negative test for `--query` without `--json`, and `2>&1` in the human-readable error check) are small specification gaps that would not block a competent implementer but could let incorrect behavior pass verification. Fixing the stream verification issue (IMPORTANT) and the `--query` negative test (MINOR) would bring this to 9.5.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
