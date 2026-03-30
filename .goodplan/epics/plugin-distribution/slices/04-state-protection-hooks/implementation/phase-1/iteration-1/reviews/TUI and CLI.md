# TUI and CLI Review — Phase 1: Hook Scripts & Configuration

## Issues

**[IMPORTANT]** `protect-state.sh` uses two separate python3 invocations instead of one
The script invokes python3 twice: once on line 13 to resolve `file_path` and again on line 30 to extract `cwd`. The `warn-bash-state.sh` script consolidates into a single invocation and documents the rationale ("avoids subshell variable-evaporation under `set -euo pipefail`"). The architecture doc (`plugin-api.md`) was explicitly updated to document the single-invocation pattern. `protect-state.sh` should follow the same pattern: extract both `file_path` and `cwd` in one python3 call, and perform the prefix + extension check entirely in Python. This halves subprocess overhead per matched Write/Edit tool call.
File: plugin-hooks/protect-state.sh:13
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `protect-state.sh` missing `.goodplan-dev` sentinel check
`warn-bash-state.sh` checks for a `.goodplan-dev` sentinel file in `cwd` and skips the warning for dev repos (lines 19-20). `protect-state.sh` has no equivalent — it will block Write/Edit on state files even when working in the goodplan source repo itself during development and testing. The architecture doc mentions the sentinel for `warn-bash-state.sh` but not `protect-state.sh`, however the same rationale applies: when developing the CLI, you need to test state file writes. Without this, the hook blocks the CLI's own test fixtures.
File: plugin-hooks/protect-state.sh:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Error output format inconsistency between scripts
`protect-state.sh` outputs the block message to stderr (correct for exit 2 hooks per the research doc). `warn-bash-state.sh` outputs advisory context via stdout JSON (correct for exit 0 hooks). Both are individually correct per the hook contract. No action needed — noting for completeness that the asymmetry is intentional and correct.
File: plugin-hooks/protect-state.sh:40
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `warn-bash-state.sh` heuristic is purely substring-based
The check `'.goodplan/' in cmd` matches any occurrence of `.goodplan/` in the Bash command string, including in comments, echo strings, or grep patterns that mention `.goodplan/` without actually modifying it. For example, `grep -r "pattern" .goodplan/` (a read-only operation) triggers the warning. The advisory message already says "direct reads are fine, but avoid direct writes" which mitigates user confusion, and the hook is non-blocking (exit 0), so this is low-severity. Acceptable for Experimental maturity.
File: plugin-hooks/warn-bash-state.sh:22
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Scripts are functional, well-structured, pass shellcheck cleanly, handle edge cases (empty inputs, relative paths, path traversal), and follow the hook API contract correctly. The dual python3 invocation in `protect-state.sh` contradicts the stated architecture pattern and adds unnecessary overhead. The missing `.goodplan-dev` sentinel check is a practical blocker for local development testing. Fixing both IMPORTANT issues brings this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
