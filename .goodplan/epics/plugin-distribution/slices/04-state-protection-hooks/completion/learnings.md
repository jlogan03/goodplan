# Learnings — 04-state-protection-hooks

## hookEventName is required for additionalContext in Claude Code hook output
_Source: 04-state-protection-hooks_

Claude Code's `hookSpecificOutput` is a TypeScript discriminated union keyed on `hookEventName`. Without it, `additionalContext` is silently ignored. The research doc only showed `hookEventName` for `updatedInput` examples, leading to an incomplete initial implementation. Future hook plans should always specify the complete JSON shape including `hookEventName: "PreToolUse"` (or the relevant event name).

## macOS realpath fails on nonexistent paths under set -euo pipefail
_Source: 04-state-protection-hooks_

On macOS, `realpath` returns exit code 1 for paths that don't exist yet. Under `set -euo pipefail`, this aborts the entire script — making every Write to a new file fail. Python's `os.path.normpath` + `os.path.join` is the portable replacement. Any future bash scripts that need path normalization should use python3, not `realpath`.

## Claude Code hook exit 0 + stderr is silently discarded
_Source: 04-state-protection-hooks_

Hook protocol: exit 0 means the tool proceeds, and stderr is ignored. Only exit 2 feeds stderr back to Claude as an error message. Non-blocking advisory context must use stdout JSON with `additionalContext` inside `hookSpecificOutput`. Future hooks that want to communicate without blocking must use this pattern.

## Consolidate all bash/python3 logic into a single invocation to avoid subshell variable evaporation
_Source: 04-state-protection-hooks_

Using `read -r VAR` to capture python3 output in a pipeline runs `read` in a subshell under bash, causing variables to evaporate. Under `set -euo pipefail`, this leads to unset variable errors. The pattern that works: `INPUT=$(cat)` to capture stdin, then pipe to a single python3 invocation that handles all logic (JSON parsing, path resolution, matching, output).

## .goodplan-dev sentinel must bypass all plugin hooks, not just advisory ones
_Source: 04-state-protection-hooks_

The initial implementation only added `.goodplan-dev` sentinel bypass to `warn-bash-state.sh`. But `protect-state.sh` also needs it — without it, the hook blocks state file writes in the goodplan development repo itself, preventing CLI testing. Any future hooks should check the sentinel as their first action.
