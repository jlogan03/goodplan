# TUI and CLI Review — State Protection Hooks (Round 2)

## Issues

**[MINOR] `warn-bash-state.sh` additionalContext JSON is constructed via `echo` with single quotes — fragile if message text ever needs single quotes**

The plan specifies `echo '{"hookSpecificOutput":{"additionalContext":"..."}}'` for the stdout JSON output. This works for the current message text, but is a maintenance hazard: if anyone later edits the message to include a single quote (e.g., "don't"), the JSON becomes invalid and the hook silently fails to deliver context. A more robust approach would be to use `python3 -c` (already available in the script) to produce the JSON via `json.dumps()`, ensuring proper escaping regardless of message content. The python3 invocation is already paid for (used for stdin parsing), so there's no additional dependency cost.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Verification tests for `warn-bash-state.sh` don't validate the JSON structure of stdout output**

The Phase 1 expected behavior item for the warn case says: "exits 0 with JSON on stdout containing `additionalContext`". The test pipes stdin and checks the exit code, but doesn't parse or validate the stdout JSON. A more rigorous check would pipe stdout through `python3 -c "import json,sys; d=json.load(sys.stdin); assert 'hookSpecificOutput' in d and 'additionalContext' in d['hookSpecificOutput']"` to confirm the output is valid JSON with the required structure. Since malformed stdout JSON is silently ignored by the hook runtime (it just won't deliver the context), this edge case would be invisible without explicit validation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `protect-state.sh` single python3 invocation combines path extraction and resolution — error in either is a single opaque failure**

The plan's task 4 uses a single `python3 -c` call that extracts `file_path`, extracts `cwd`, joins them if relative, and normalizes. If any step fails (e.g., missing `tool_input` key, unexpected type), the entire invocation fails with a generic python3 traceback that `set -e` will catch, causing exit 1 (non-blocking error per hook protocol — tool proceeds). This is actually the correct graceful degradation behavior (allow on error), but the plan doesn't explicitly acknowledge this as intentional. Adding a brief comment in the task noting "python3 failure -> exit 1 -> hook is skipped (tool proceeds)" would make the degradation path explicit and prevent a future maintainer from "fixing" it by adding error handling that accidentally blocks.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The round 1 issues have been addressed well. The stderr-ignored bug for `warn-bash-state.sh` is fixed with `additionalContext` on stdout. The `INPUT=$(cat)` pattern, python3 guard, and relative-path resolution via python3 (avoiding `realpath` portability issues) are all sound. The hook protocol semantics are now correctly applied: exit 2 + stderr for blocking, exit 0 + stdout JSON for advisory context. The `gp` PATH question was explicitly resolved as acceptable for Experimental maturity with a plan note. The remaining items are minor hardening improvements, not functional issues.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
