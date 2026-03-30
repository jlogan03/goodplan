# Repo, Tooling, & Docs Review — State Protection Hooks Plan (Round 2)

## Issues

**[IMPORTANT]** `warn-bash-state.sh` python3 variable capture pattern is still underspecified

Phase 1 Task 2 Step 4 says: "Parse JSON: extract command and cwd via `echo "$INPUT" | python3 -c "..."` with `read -r COMMAND` and `read -r CWD` to capture into shell variables." This is the same ambiguity flagged in round 1 (issue 4). The `read -r COMMAND` / `read -r CWD` pattern requires piping the python3 output into a `while read` or process substitution — simply having `read` after a pipe won't work because `read` in a pipeline runs in a subshell and the variables evaporate. The plan should show the concrete capture pattern, e.g.:

```bash
read -r COMMAND
read -r CWD
```
reading from a process substitution: `< <(echo "$INPUT" | python3 -c "...")` or assigning via `COMMAND=$(...)` / `CWD=$(...)` with a single python3 call that outputs both. The `protect-state.sh` task (Task 1 Step 4) handles this correctly by using `RESOLVED_PATH=$(echo "$INPUT" | python3 -c "...")` — a single variable from a single python3 call. But `warn-bash-state.sh` needs two variables from one call and the mechanism is ambiguous. Under `set -euo pipefail`, getting this wrong means silent failures or unset variables triggering `set -u`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `protect-state.sh` missing guard for empty/missing `file_path`

Phase 1 Task 1 specifies parsing `file_path` from the JSON and resolving it. The Verification section mentions testing "empty file_path" as an edge case, but the task steps have no explicit guard for when `file_path` is empty or missing from `tool_input`. If `file_path` is empty, `os.path.join(cwd, '')` returns `cwd` and `os.path.normpath(cwd)` returns the cwd path — then the check "does resolved path start with `$CWD/.goodplan/`" would correctly fail and exit 0. So the logic is coincidentally safe, but the plan should add an explicit early-exit guard (`if [ -z "$RESOLVED_PATH" ] ...` or check within the python3 call) so the behavior is intentional rather than accidental. This matters because a future change to the path-checking logic might break the coincidental safety.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 verification missing edge case for path traversal via `..`

The Verification section says to check "file_path that contains `.goodplan/` as a substring but isn't under `.goodplan/`" (e.g., `/tmp/not-.goodplan/foo.json`). Good. But it doesn't mention a path traversal case like `/project/.goodplan/../secret.json` which after normpath becomes `/project/secret.json` and should be allowed. The python3 `os.path.normpath` handles this correctly, but adding an explicit test case would confirm the normalization works as intended and prevent regressions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `protect-state.sh` Step 5 mentions checking exact match `$CWD/.goodplan` (no trailing slash) as an edge case — unclear what tool call would target this

The plan says "Also check exact match `$CWD/.goodplan` (no trailing slash) as an edge case." It's unclear what Write/Edit operation would target a directory path without a file extension. Directories aren't valid targets for Write/Edit. This check is harmless but adds dead code. Consider removing it or adding a comment explaining what scenario it guards against — otherwise a future maintainer may wonder.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1's critical `realpath` issue is resolved — the plan now uses `python3 os.path.normpath` for path resolution. The build copy uses explicit globs (`*.sh *.json`), executable checks are added to fallback validation, shellcheck is firm, and the python3 guard is present. The remaining issues are an underspecified variable capture pattern for `warn-bash-state.sh` (important because `set -euo pipefail` makes this error-prone) and minor verification gaps. To reach 10: specify the concrete shell pattern for capturing two variables from one python3 call, add an explicit empty-path guard to protect-state.sh, and add path-traversal normalization to the test cases.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
