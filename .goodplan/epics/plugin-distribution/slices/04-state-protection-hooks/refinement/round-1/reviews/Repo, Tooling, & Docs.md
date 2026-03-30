# Repo, Tooling, & Docs Review — State Protection Hooks Plan

## Issues

**[CRITICAL]** `realpath` fails on nonexistent paths — will break protect-state.sh for new files

Phase 1, Task 1, Step 3 says to "Resolve file_path: if relative, prepend cwd... Normalize via `realpath` or string manipulation." On macOS, `realpath` returns exit code 1 and produces no output when the target path does not exist (`realpath /tmp/nonexistent-dir/foo.json` fails). Since `set -euo pipefail` is set, the script will abort on the `realpath` call for any file that hasn't been created yet — which is every Write operation to a new file.

The plan should specify **string manipulation only** (not `realpath`) for path resolution. A simple approach: if `FILE_PATH` does not start with `/`, prepend `$CWD/`. Then normalize `..` and `.` segments with parameter expansion or a python3 one-liner (e.g., `os.path.normpath`). Alternatively, fold the path resolution into the existing python3 invocation — `os.path.normpath(os.path.join(cwd, file_path)) if not os.path.isabs(file_path) else os.path.normpath(file_path)`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Build script uses `cp plugin-hooks/*` which copies `.gitkeep` before it's removed

Phase 2 Task 1 says to add `cp plugin-hooks/* "$PLUGIN_DIR/hooks/"` to the build script. Phase 1's last task says to remove `.gitkeep`. But the ordering concern is: if someone runs `build:plugin` before removing `.gitkeep` (or if the removal gets missed), `.gitkeep` will be copied into `dist/gp-plugin/hooks/`. This is harmless but messy.

More importantly, the `cp plugin-hooks/*` glob will also copy `.gitkeep` to dist even after it's removed if git hasn't committed the removal yet (shell glob expands at runtime, so this is fine — if the file is gone, it won't be in the glob). The real issue is ordering: the plan says remove `.gitkeep` in Phase 1 but the copy happens in Phase 2. If `.gitkeep` still exists at build time, it gets copied. Consider adding an explicit exclusion: `cp plugin-hooks/*.sh plugin-hooks/*.json "$PLUGIN_DIR/hooks/"` to copy only the intended file types, rather than `cp plugin-hooks/*`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 fallback validation only checks `hooks.json` — should also verify scripts are executable

Phase 2, Task 1, Step 2 adds a fallback validation step: `python3 -c "import json; json.load(open('$PLUGIN_DIR/hooks/hooks.json'))"` to assert hooks.json is valid JSON. But the fallback section in `build-plugin.sh` (lines 49-62) currently validates `plugin.json` and the binary. The plan should also add an assertion that the hook scripts are executable in the fallback path: `test -x "$PLUGIN_DIR/hooks/protect-state.sh" && test -x "$PLUGIN_DIR/hooks/warn-bash-state.sh"`. The `claude plugin validate` path presumably checks this, but the fallback doesn't.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Two separate `python3` invocations in the architecture doc vs. one in the plan — plan should consolidate to one

The architecture doc (`plugin-api.md` lines 94-96) shows two separate `python3 -c` calls for extracting `file_path` and `cwd`. The plan (Phase 1, Task 1, Step 2) correctly specifies a single invocation that outputs both on separate lines. This is good. However, the plan's python3 snippet uses `json.load(sys.stdin)` which reads stdin once — but the script also pipes stdin via the `|` operator from `cat`. Since `set -euo pipefail` is active, the plan should be explicit about how stdin is captured. The plan shows piping to `python3` but the result needs to be captured into two variables. The plan should show the variable capture pattern:

```bash
read -r FILE_PATH
read -r CWD
```

after the python3 pipe. Or use `mapfile`/array assignment. The current plan text is ambiguous about how the two output lines get into shell variables.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `.gitkeep` removal task is in Phase 1 but the `rm` is not in the verification steps

Phase 1 includes "Remove `plugin-hooks/.gitkeep`" as a task but no Expected Behavior item verifies it's gone. Add: `test ! -f plugin-hooks/.gitkeep` to the "After implementation" checks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 verification mentions `shellcheck` but conditionally — consider making it a firm step

The plan says "Run `shellcheck plugin-hooks/*.sh` if available." Since `shellcheck` is available on this system (`/opt/homebrew/bin/shellcheck`), and the scripts use bash features that `shellcheck` catches issues in, this should be a non-conditional verification step with expected output (e.g., "no warnings").

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior missing a check for `warn-bash-state.sh` executability

Phase 2's "After implementation" checks verify `protect-state.sh` is executable but not `warn-bash-state.sh`. Add: `dist/gp-plugin/hooks/warn-bash-state.sh` is executable.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with good Expected Behavior sections and clear task breakdowns. The critical `realpath` issue would cause the protect-state.sh script to fail on every Write to a new file under `set -euo pipefail`, which is a showstopper. The build script glob and fallback validation gaps are lower severity but worth fixing. To reach 9+: fix the `realpath` issue (use string/python normalization), tighten the build copy command to specific file types, add executable checks to fallback validation, and clarify the shell variable capture pattern for the python3 output.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
