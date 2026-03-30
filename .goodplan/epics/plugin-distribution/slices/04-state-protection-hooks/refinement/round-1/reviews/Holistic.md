# Holistic Review — State Protection Hooks

## Issues

**[IMPORTANT]** `realpath` usage may be fragile for non-existent paths

Phase 1, Task 1, step 3 says to resolve file_path using `realpath` or string manipulation. On macOS, `realpath` requires the path to exist (unlike GNU `realpath --canonicalize-missing`). Since the Write tool is intercepted *before* the file is created, the target path won't exist yet. The plan should explicitly specify string-based path resolution (e.g., removing `../` segments, prepending cwd to relative paths) rather than `realpath`, which will fail on non-existent paths.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing edge case: Write/Edit tool_input may provide relative file_path

The plan's verification tests all use absolute file_path values. However, the Claude Code Write and Edit tools may pass relative paths in `tool_input.file_path`. The plan mentions this ("if relative, prepend cwd") but none of the Expected Behavior tests exercise a relative path scenario. Add at least one test with a relative path like `{"tool_name":"Write","tool_input":{"file_path":".goodplan/project.json"},"cwd":"/tmp/test"}` to confirm relative path handling works.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification section mentions `shellcheck` conditionally but doesn't include it in Expected Behavior

Phase 1 Verification says "Run `shellcheck plugin-hooks/*.sh` if available." Since shellcheck is available on this machine, this should be a concrete Expected Behavior item rather than a conditional suggestion. This ensures the scripts are lint-clean before moving to Phase 2.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No documentation update tasks

The plan does not include any task for updating documentation. The architecture overview (`_overview.md` for the epic) already describes the hooks at an architecture level, but there's no task to verify that the actual implementation aligns with the documented architecture (e.g., confirming the script names, behavior, and sentinel mechanism match what's in `plugin-api.md` and `_overview.md`). A brief verification task would close this gap.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 fallback validation uses `jq` but project avoids `jq` dependency

Phase 2 Task 1 step 2 adds a `python3 -c` validation step for `hooks.json`, which is consistent with the hook scripts' avoidance of `jq`. However, the existing `build-plugin.sh` fallback section (line 57) already uses `jq` to validate `plugin.json`. This is fine since `jq` is a dev dependency (not a runtime dependency for end users), but the plan should note that the new `python3 -c` validation is being added alongside the existing `jq` validation, not replacing it, to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior "Before" check is weak

The "Before" check `ls dist/gp-plugin/hooks/protect-state.sh` will fail because the hooks dir is currently empty, but this only proves the file is absent — it doesn't prove the build pipeline doesn't copy hooks. A stronger before-check would be: `bun run build:plugin && ls dist/gp-plugin/hooks/` showing an empty directory (proving the build runs but doesn't copy hooks yet).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear phasing, good separation of concerns, and thorough verification. The two-phase approach (scripts first, build integration second) is logical. The use of `python3 -c` instead of `jq` is a smart portability choice aligned with the project's constraints. The main gaps are: (1) the `realpath` issue could cause the protect-state script to fail silently on non-existent paths (the common case for Write), and (2) missing relative-path test coverage. Fixing the two IMPORTANT items and adding the MINOR improvements would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
