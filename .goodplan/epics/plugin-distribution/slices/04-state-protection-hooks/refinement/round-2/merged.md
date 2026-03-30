# Merged Feedback — State Protection Hooks (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: `plugin-api.md` still describes `warn-bash-state.sh` output as stderr, contradicting the plan

`plugin-api.md` line 122 says `If match -> exit 0, stderr: "Warning: ..."` but the plan correctly uses stdout JSON with `additionalContext`. The plan's Phase 1 Verification mentions verifying alignment with architecture docs, but this known divergence should be called out explicitly as a task to update `plugin-api.md`.

Source: Holistic
Resolution: DIRECTLY_ACTIONABLE

### IMP-2: `warn-bash-state.sh` python3 variable capture pattern is underspecified and error-prone under `set -euo pipefail`

Phase 1 Task 2 Step 4 says `read -r COMMAND` / `read -r CWD` to capture two variables from a python3 call, but doesn't specify the shell mechanism. In a pipeline, `read` runs in a subshell and variables evaporate. Under `set -euo pipefail`, getting this wrong means silent failures or unset variables triggering `set -u`. The plan should specify the concrete pattern (e.g., process substitution `< <(...)` or `VARS=$(...)` with field splitting). Alternatively, consolidate the entire check into a single python3 invocation (as `protect-state.sh` does), avoiding the bash/python3 boundary entirely.

Source: Repo/Tooling/Docs (primary — most specific), Holistic, Software Architecture (all flagged the same root issue)
Resolution: DIRECTLY_ACTIONABLE

### IMP-3: `protect-state.sh` missing explicit guard for empty/missing `file_path`

If `file_path` is empty, the logic is coincidentally safe (`os.path.join(cwd, '')` returns cwd, which won't match `.goodplan/` prefix). But this should be an intentional early-exit guard, not accidental. A future change to path-checking logic could break the coincidental safety.

Source: Repo/Tooling/Docs
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: `protect-state.sh` step 5 edge case check for exact match `$CWD/.goodplan` (no trailing slash) is dead code

No Write/Edit operation targets a directory path without a file extension. Either remove this check or add a comment explaining the scenario it guards against.

Source: Holistic, Repo/Tooling/Docs (deduplicated — both flagged same issue)
Resolution: DIRECTLY_ACTIONABLE

### MIN-2: No verification test case for malformed/missing JSON fields

Verification mentions handling edge cases like empty `file_path` and missing `cwd`, but has no concrete Expected Behavior test. Add explicit tests: `echo '{}' | bash protect-state.sh` and `echo '{"tool_input":{}}' | bash protect-state.sh` — both should exit 0 (allow when in doubt).

Source: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

### MIN-3: Verification missing path traversal test case via `..`

`os.path.normpath` handles `/project/.goodplan/../secret.json` -> `/project/secret.json` correctly, but an explicit test case would confirm normalization works and prevent regressions.

Source: Repo/Tooling/Docs
Resolution: DIRECTLY_ACTIONABLE

### MIN-4: `warn-bash-state.sh` additionalContext JSON constructed via `echo` with single quotes — fragile

If the message text ever includes a single quote, the JSON becomes invalid and the hook silently fails. Use `python3 -c` with `json.dumps()` instead (python3 is already a dependency).

Source: TUI/CLI
Resolution: DIRECTLY_ACTIONABLE

### MIN-5: Verification tests don't validate the JSON structure of `warn-bash-state.sh` stdout output

The test checks exit code but doesn't parse stdout JSON. Malformed stdout JSON is silently ignored by the hook runtime. Pipe stdout through `python3 -c "import json,sys; d=json.load(sys.stdin); assert 'hookSpecificOutput' in d"` to confirm valid structure.

Source: TUI/CLI
Resolution: DIRECTLY_ACTIONABLE

### MIN-6: `protect-state.sh` single python3 invocation failure mode not documented as intentional

Python3 failure -> exit 1 -> hook is skipped (tool proceeds). This is correct graceful degradation, but the plan should add a comment making it explicit so a future maintainer doesn't "fix" it by adding error handling that accidentally blocks.

Source: TUI/CLI
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

1. **IMP-1**: Add task to update `plugin-api.md` line 122 to match stdout JSON `additionalContext` contract
2. **IMP-2**: Specify concrete shell capture pattern for `warn-bash-state.sh` two-variable extraction, or consolidate into single python3 invocation
3. **IMP-3**: Add explicit empty/missing `file_path` guard in `protect-state.sh`
4. **MIN-1**: Remove dead `$CWD/.goodplan` exact-match check or add explanatory comment
5. **MIN-2**: Add concrete malformed-input test cases to Expected Behavior
6. **MIN-3**: Add path traversal (`..`) normalization test case
7. **MIN-4**: Use `json.dumps()` for `additionalContext` JSON output construction
8. **MIN-5**: Add JSON structure validation to `warn-bash-state.sh` verification tests
9. **MIN-6**: Add comment documenting intentional python3-failure degradation path

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **warn-bash-state.sh python3 invocation count**: Holistic reviewer said "plan uses separate invocations" while Software Architecture reviewer said the plan text is "ambiguous about whether this is one or two invocations." Repo/Tooling/Docs provided the most specific analysis (the `read` subshell problem under `set -euo pipefail`). Resolution: treated as a single underspecified issue (IMP-2), adopting Repo/Tooling/Docs' framing as the most actionable.

## Unresolved (USER_INPUT required)

None.
