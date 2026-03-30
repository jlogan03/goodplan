# Software Architecture Review — State Protection Hooks (Round 2)

## Issues

**[MINOR] warn-bash-state.sh parses JSON twice (two python3 subprocesses)**
Phase 1, Task 2 (warn-bash-state.sh), steps 4: the plan specifies extracting `command` and `cwd` via separate python3 invocations with `read -r COMMAND` and `read -r CWD`. The protect-state.sh script correctly consolidates JSON parsing and path resolution into a single python3 call (step 4), but warn-bash-state.sh does not follow the same pattern. It should use a single python3 invocation that prints both values on separate lines, captured via `read -r COMMAND; read -r CWD` from a single pipe. This is consistent with the consolidation approach already applied to protect-state.sh and reduces subprocess overhead. The current plan text ("extract command and cwd via `echo "$INPUT" | python3 -c "..."` with `read -r COMMAND` and `read -r CWD`") is ambiguous about whether this is one or two invocations — clarify it is one.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No verification of behavior when stdin JSON is malformed or missing fields**
Phase 1, Verification section mentions "verify scripts handle edge cases: empty file_path, missing cwd field" but the Expected Behavior section has no concrete test case for this. For example: `echo '{}' | bash plugin-hooks/protect-state.sh` (missing tool_input entirely) or `echo '{"tool_input":{}}' | bash plugin-hooks/protect-state.sh` (missing file_path). Both should exit 0 (allow — when in doubt, don't block). Adding one explicit Expected Behavior test for malformed input would make the edge case handling verifiable rather than aspirational.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All CRITICAL and IMPORTANT issues from round 1 have been properly addressed. The plan now has: consolidated python3 path resolution (eliminating realpath), explicit stdin capture via `INPUT=$(cat)`, the correct `additionalContext` stdout contract for warn-bash-state.sh, python3 availability guards, explicit file type globs in the build copy, and firm shellcheck verification. The architecture aligns well with the plugin-distribution epic's conventions (hooks as read-only interceptors outside the 4-layer stack, `${CLAUDE_PLUGIN_ROOT}` paths, `.goodplan-dev` sentinel bypass). Module boundaries are clean — hooks don't call the CLI or modify files, the build pipeline copies but doesn't transform, and the plugin manifest correctly references `./hooks/hooks.json`. The two remaining minors are low-risk polish items (one python3 call vs two in warn-bash-state.sh, and a concrete malformed-input test). Neither blocks implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
