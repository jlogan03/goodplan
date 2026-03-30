# Software Architecture Review — Phase 1: Hook Scripts & Configuration (Iteration 2)

## Issues

**[MINOR]** `exit 0` at end of `protect-state.sh` is dead code on the happy-block path but could mask failures on exotic bash versions
The script relies on `set -euo pipefail` to abort when the `echo | python3` pipeline exits 2. The trailing `exit 0` (line 32) only executes on the allow path (python3 exits 0). This is correct behavior under POSIX-compliant bash, but the comment on lines 11-12 ("If python3 fails (exit 1), bash exits due to set -e") documents the `set -e` mechanism as the safety net. Consider replacing `exit 0` with `exit $?` to explicitly propagate the pipeline exit code, making the intent unambiguous regardless of bash version quirks. Same applies to `warn-bash-state.sh` line 30. This is minor because Claude Code's hook runtime likely uses a modern bash, and the `set -e` + `pipefail` combination is correct under standard semantics.
File: plugin-hooks/protect-state.sh:32
Resolution: DIRECTLY_ACTIONABLE

No other issues found.

## Score: 9/10

Round 1's IMPORTANT issue (two python3 invocations causing subshell variable-evaporation) has been correctly fixed — both scripts now use a single consolidated python3 invocation. The `.goodplan-dev` sentinel check is well-placed (inside the python3 block, using the JSON `cwd` field rather than the script's actual working directory). Architecture alignment is strong:

- **Module boundaries**: Hook scripts are pure interceptors — no CLI calls, no file mutations, no state awareness beyond path matching. Clean separation from the 4-layer stack.
- **Dependency direction**: Hooks depend only on python3 (guaranteed on macOS since Catalina) and the Claude Code hook contract (stdin JSON, exit codes). No coupling to CLI internals.
- **INV-001 enforcement**: The hooks enforce "every state mutation goes through the state machine" at the Claude Code tool-call level — a complementary enforcement layer to the CLI's internal guarantees.
- **Graceful degradation**: Both scripts degrade correctly — missing python3 allows the tool call, python3 runtime errors (exit 1) allow the tool call. This matches the stated design principle of "allow when in doubt."
- **`hooks.json` structure**: Matches the plugin-api.md specification exactly. `${CLAUDE_PLUGIN_ROOT}` paths ensure portability across installations.
- **Architecture doc updates**: `plugin-api.md` now accurately reflects the consolidated single-invocation pattern and stdout JSON `additionalContext` contract.

The only gap from a perfect 10 is the minor ambiguity around the trailing `exit 0`.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
