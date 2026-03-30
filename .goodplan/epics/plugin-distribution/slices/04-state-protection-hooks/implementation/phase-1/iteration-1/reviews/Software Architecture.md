# Software Architecture Review — Phase 1: Hook Scripts & Configuration

## Issues

**[IMPORTANT]** protect-state.sh uses two python3 invocations instead of one
The plan (task 4) explicitly specifies "Parse JSON and resolve path in a single python3 invocation" and `warn-bash-state.sh` correctly consolidates all logic into one. However, `protect-state.sh` spawns python3 twice: once for `RESOLVED_PATH` (lines 13-23) and once for `CWD` (lines 30-34). This doubles subprocess overhead on every Write/Edit tool call and contradicts the plan's stated rationale of avoiding "subshell variable-evaporation under `set -euo pipefail`." The CWD extraction should be folded into the first python3 invocation — have python3 print both values (e.g., newline-separated) or restructure so the bash path-matching logic also moves into python3 (matching the warn-bash-state.sh pattern).
File: plugin-hooks/protect-state.sh:30
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** plugin-api.md architecture doc still shows two python3 invocations for protect-state.sh
The diff updates the `warn-bash-state.sh` Logic block in `plugin-api.md` to reflect the consolidated single-invocation pattern, but the `protect-state.sh` Logic block (lines 92-96) still shows the old two-invocation pattern with `jq`-style extraction. This should be updated to match the actual implementation (or the implementation should be consolidated first, then the doc updated to match).
File: .goodplan/epics/plugin-distribution/architecture/plugin-api.md:92
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is structurally sound. Module boundaries are correct: hook scripts are pure interceptors with no CLI dependency, `hooks.json` uses the documented plugin hook format with `${CLAUDE_PLUGIN_ROOT}` paths, and the separation between the blocking hook (exit 2) and the advisory hook (additionalContext JSON) is clean. The graceful degradation pattern (python3 guard, `set -e` catching failures) correctly prioritizes allowing tool calls over false-blocking. The `.goodplan-dev` sentinel bypass correctly addresses the "goodplan developing itself" concern without leaking into production behavior. Dependency direction is correct: hooks depend on Claude Code's hook contract (stdin JSON, exit codes, stdout JSON) and nothing else.

The IMPORTANT issue (two python3 invocations) is a deviation from the plan that adds unnecessary subprocess overhead and inconsistency with the other hook script's pattern. Consolidating to one invocation would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
