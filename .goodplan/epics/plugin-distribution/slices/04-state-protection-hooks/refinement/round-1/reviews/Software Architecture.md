# Software Architecture Review — State Protection Hooks (Round 1)

## Issues

**[IMPORTANT] protect-state.sh invokes python3 twice instead of once**
The plan's Task description for `protect-state.sh` says to extract file_path and cwd via a single `python3 -c` invocation that prints both on separate lines. However, the architecture doc (`plugin-api.md` lines 94-96) shows the previous pattern of calling `python3` twice with separate heredoc inputs. The plan correctly describes the single-invocation approach (`print(d.get('tool_input',{}).get('file_path',''));print(d.get('cwd',''))`) but it reads stdin in a streaming way — the script needs to capture stdin first (e.g., `INPUT=$(cat)`) and then pass `INPUT` to python3 via heredoc or echo pipe, since stdin can only be read once. The plan's python snippet uses `json.load(sys.stdin)` which reads stdin directly — this works only if the entire script reads stdin once. Ensure the implementation captures stdin into a variable first, then passes it to python3. The plan's task step 2 shows the correct python code but does not show the stdin capture step that must precede it. Add an explicit step: `INPUT=$(cat)` followed by piping `$INPUT` to python3.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] warn-bash-state.sh has the same stdin capture gap**
Same issue as above for `warn-bash-state.sh` — the python3 invocation uses `sys.stdin` but the plan doesn't show stdin being captured first. Since the script also needs the `command` field, it must read stdin once and reuse it. Add the explicit `INPUT=$(cat)` step.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Path resolution for relative file_path is underspecified**
Task step 3 for `protect-state.sh` says "if relative, prepend cwd" and mentions `realpath` or string manipulation, but `realpath` may not be available on all macOS versions (it was added in macOS 13 Ventura). The plan should specify the exact resolution approach. Since python3 is already in use, the path resolution could be done in the same python3 invocation using `os.path.join` and `os.path.normpath`. This would consolidate JSON parsing and path resolution into a single python3 call, reducing subprocess overhead and avoiding the `realpath` portability concern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No explicit handling of python3 failure**
If `python3` is not available (unlikely on macOS but possible in non-standard environments), both scripts will fail with an opaque bash error. Consider adding a guard: `command -v python3 >/dev/null 2>&1 || { echo "python3 required" >&2; exit 0; }`. Exit 0 (not 2) on failure means "allow" — a missing python3 should degrade gracefully rather than block all Write/Edit operations.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Build script hook copy uses glob that includes hooks.json**
The plan says `cp plugin-hooks/* "$PLUGIN_DIR/hooks/"` followed by `chmod +x "$PLUGIN_DIR/hooks/"*.sh`. The glob `plugin-hooks/*` will also copy `.gitkeep` if the removal task hasn't run yet. However, the plan does include a task to remove `.gitkeep`, so execution order matters. Consider using `cp plugin-hooks/*.sh plugin-hooks/*.json "$PLUGIN_DIR/hooks/"` for explicitness, or ensure the `.gitkeep` removal is ordered before the build step in implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Edge case: file_path containing `.goodplan` as directory component vs substring**
The plan's step 4 says "starts with `$CWD/.goodplan/`" which is correct for preventing false positives on paths like `/tmp/not-.goodplan/foo.json`. However, the plan should also handle the case where `file_path` equals `$CWD/.goodplan` exactly (no trailing slash) — a Write to the directory itself. This is unlikely but the boundary check should use `==` or starts-with-slash consistently. The current spec is fine for practical purposes but worth a note in implementation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear separation of concerns (hook scripts as read-only interceptors outside the 4-layer stack), correct use of the plugin hook system (matcher-based routing, exit code semantics), and alignment with the epic architecture (INV-009 three-layer protection, `.goodplan-dev` sentinel, `${CLAUDE_PLUGIN_ROOT}` paths). The two-phase structure (scripts first, build integration second) is appropriate. The main gaps are in implementation specificity — stdin handling and path resolution need tightening to avoid implementation ambiguity. Addressing the two IMPORTANT items (stdin capture pattern and path resolution approach) would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
