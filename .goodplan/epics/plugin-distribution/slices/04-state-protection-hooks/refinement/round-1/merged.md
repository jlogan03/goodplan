# Merged Review Feedback — State Protection Hooks (Round 1)

## CRITICAL Issues

### C1. `realpath` fails on nonexistent paths — will break protect-state.sh for new files
**Flagged by:** Repo/Tooling (CRITICAL), Holistic (IMPORTANT), TUI/CLI (MINOR), Software Architecture (IMPORTANT)
**File:** plan.md — Phase 1, Task 1, Step 3
**Description:** On macOS, `realpath` returns exit code 1 for nonexistent paths. Since `set -euo pipefail` is set, the script aborts on every Write to a new file — the most common case. This is a showstopper.
**Resolution:** DIRECTLY_ACTIONABLE

## IMPORTANT Issues

### I1. stdin can only be read once — both hook scripts need explicit `INPUT=$(cat)` capture
**Flagged by:** Software Architecture (IMPORTANT x2), Repo/Tooling (IMPORTANT)
**File:** plan.md — Phase 1, Task 1, Step 2 (protect-state.sh) and Task 2 (warn-bash-state.sh)
**Description:** The plan's python3 snippet uses `json.load(sys.stdin)` which reads stdin directly. But stdin can only be read once. The plan must add an explicit `INPUT=$(cat)` step before piping to python3. Also, the plan is ambiguous about how the two output lines (file_path, cwd) get captured into shell variables — should show `read -r FILE_PATH; read -r CWD` or equivalent after the python3 pipe.
**Resolution:** DIRECTLY_ACTIONABLE

### I2. `warn-bash-state.sh` exit 0 + stderr = warning silently discarded
**Flagged by:** TUI/CLI (IMPORTANT)
**File:** plan.md — Phase 1, Task 2 (warn-bash-state.sh output contract)
**Description:** Per hook protocol, exit code 0 means stderr is **ignored**. Only exit code 2 feeds stderr back to Claude. The plan has `warn-bash-state.sh` exit 0 with a warning on stderr, meaning Claude never sees the warning. Fix: use `additionalContext` on stdout (v2.1.9+ feature): `{"hookSpecificOutput":{"additionalContext":"..."}}`. This changes the script's output contract fundamentally.
**Resolution:** DIRECTLY_ACTIONABLE

### I3. Consolidate path resolution into the existing python3 invocation
**Flagged by:** Software Architecture (IMPORTANT), Holistic (IMPORTANT — implicit)
**File:** plan.md — Phase 1, Task 1, Steps 2-3
**Description:** Since python3 is already invoked for JSON parsing, path resolution should happen in the same invocation using `os.path.join` and `os.path.normpath`. This eliminates the `realpath` portability issue entirely, reduces subprocess overhead, and consolidates JSON parsing + path resolution into one step. The python3 snippet should output the already-resolved absolute path.
**Resolution:** DIRECTLY_ACTIONABLE

### I4. Missing relative-path test case in verification
**Flagged by:** Holistic (IMPORTANT)
**File:** plan.md — Phase 1, Expected Behavior section
**Description:** All verification tests use absolute `file_path` values. Add a test with a relative path like `{"tool_name":"Write","tool_input":{"file_path":".goodplan/project.json"},"cwd":"/tmp/test"}` to confirm relative path handling works.
**Resolution:** DIRECTLY_ACTIONABLE

### I5. Build script `cp plugin-hooks/*` glob should use explicit file types
**Flagged by:** Software Architecture (MINOR), Repo/Tooling (IMPORTANT)
**File:** plan.md — Phase 2, Task 1
**Description:** `cp plugin-hooks/*` copies everything including `.gitkeep` if it still exists. Use `cp plugin-hooks/*.sh plugin-hooks/*.json "$PLUGIN_DIR/hooks/"` for explicitness.
**Resolution:** DIRECTLY_ACTIONABLE

### I6. Phase 2 fallback validation should also verify scripts are executable
**Flagged by:** Repo/Tooling (IMPORTANT)
**File:** plan.md — Phase 2, Task 1, Step 2
**Description:** The fallback path validates `hooks.json` is valid JSON but doesn't check that hook scripts are executable. Add: `test -x "$PLUGIN_DIR/hooks/protect-state.sh" && test -x "$PLUGIN_DIR/hooks/warn-bash-state.sh"`.
**Resolution:** DIRECTLY_ACTIONABLE

## MINOR Issues

### M1. Make `shellcheck` a firm verification step (not conditional)
**Flagged by:** Holistic (MINOR), Repo/Tooling (MINOR)
**File:** plan.md — Phase 1, Verification section
**Description:** `shellcheck` is available on this system. Make it a non-conditional step with expected output "no warnings."
**Resolution:** DIRECTLY_ACTIONABLE

### M2. Add python3 availability guard
**Flagged by:** Software Architecture (MINOR)
**File:** plan.md — Phase 1, Task 1 and Task 2
**Description:** If python3 is unavailable, scripts fail with opaque errors. Add: `command -v python3 >/dev/null 2>&1 || exit 0` (exit 0 = allow, degrade gracefully).
**Resolution:** DIRECTLY_ACTIONABLE

### M3. No documentation verification task
**Flagged by:** Holistic (MINOR)
**File:** plan.md — missing task
**Description:** No task to verify implementation aligns with architecture docs (`plugin-api.md`, `_overview.md`). Add a brief verification task.
**Resolution:** DIRECTLY_ACTIONABLE

### M4. Note that python3 validation coexists with existing jq validation (not replacing it)
**Flagged by:** Holistic (MINOR)
**File:** plan.md — Phase 2, Task 1, Step 2
**Description:** `build-plugin.sh` already uses `jq` for `plugin.json` validation. The new `python3 -c` validation for `hooks.json` is additive. Note this explicitly to avoid confusion.
**Resolution:** DIRECTLY_ACTIONABLE

### M5. Phase 2 "Before" check is weak — should run build first
**Flagged by:** Holistic (MINOR)
**File:** plan.md — Phase 2, Expected Behavior
**Description:** The "Before" check just does `ls dist/gp-plugin/hooks/protect-state.sh`. A stronger check: `bun run build:plugin && ls dist/gp-plugin/hooks/` showing an empty directory (proves build runs but doesn't copy hooks yet).
**Resolution:** DIRECTLY_ACTIONABLE

### M6. `.gitkeep` removal not verified in Expected Behavior
**Flagged by:** Repo/Tooling (MINOR)
**File:** plan.md — Phase 1, Expected Behavior
**Description:** Add: `test ! -f plugin-hooks/.gitkeep` to after-implementation checks.
**Resolution:** DIRECTLY_ACTIONABLE

### M7. Phase 2 missing executable check for `warn-bash-state.sh`
**Flagged by:** Repo/Tooling (MINOR)
**File:** plan.md — Phase 2, Expected Behavior
**Description:** Phase 2 checks verify `protect-state.sh` is executable but not `warn-bash-state.sh`. Add the check.
**Resolution:** DIRECTLY_ACTIONABLE

### M8. `file_path == $CWD/.goodplan` exact match edge case
**Flagged by:** Software Architecture (MINOR)
**File:** plan.md — Phase 1, Task 1, Step 4
**Description:** The starts-with check uses `$CWD/.goodplan/` (trailing slash). A Write to `$CWD/.goodplan` exactly (no trailing slash) would bypass the check. Unlikely but worth a note.
**Resolution:** DIRECTLY_ACTIONABLE

### M9. Hook stderr structured output consistency
**Flagged by:** TUI/CLI (MINOR)
**File:** plan.md — Phase 1, Task 1
**Description:** Hook error messages are free-form text. Low priority since the consumer is always Claude's LLM context, not programmatic parsing. No action needed now.
**Resolution:** DIRECTLY_ACTIONABLE

### M10. `warn-bash-state.sh` verification tests need stdout JSON check
**Flagged by:** TUI/CLI (MINOR)
**File:** plan.md — Phase 1, Expected Behavior
**Description:** If I2 is fixed (additionalContext on stdout), the verification tests need to check stdout for expected JSON structure, not stderr.
**Resolution:** DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C1 — Remove `realpath`, use python3 path resolution.** In plan.md Phase 1, Task 1, Step 3: replace "Resolve file_path: if relative, prepend cwd... Normalize via `realpath` or string manipulation" with: consolidate path resolution into the python3 invocation from Step 2. The python3 snippet should become:
   ```python
   import json, os, sys
   d = json.load(sys.stdin)
   fp = d.get('tool_input',{}).get('file_path','')
   cwd = d.get('cwd','')
   if not os.path.isabs(fp):
       fp = os.path.join(cwd, fp)
   print(os.path.normpath(fp))
   ```
   This also resolves I3 (consolidation) and I4 partially (relative path handling is now built-in).

2. **I1 — Add stdin capture pattern.** In plan.md Phase 1, Task 1 Step 2 and Task 2: add explicit `INPUT=$(cat)` before the python3 invocation, then pipe via `echo "$INPUT" | python3 -c '...'`. Show the shell variable capture: since consolidation (item 1) outputs a single resolved path, it's just `RESOLVED_PATH=$(echo "$INPUT" | python3 -c '...')`. For warn-bash-state.sh, capture the command field similarly.

3. **I2 — Fix warn-bash-state.sh output contract.** In plan.md Phase 1, Task 2: change from "exit 0 with warning on stderr" to "exit 0 with JSON on stdout containing additionalContext." The script should output: `echo '{"hookSpecificOutput":{"additionalContext":"This command references .goodplan/ files. State files (.json/.jsonl) are managed by the gp CLI -- direct reads are fine, but avoid direct writes."}}'` and exit 0. Remove the stderr warning. Update verification tests (M10) to check stdout for this JSON.

4. **I4 — Add relative-path test case.** In plan.md Phase 1, Expected Behavior: add test input `echo '{"tool_name":"Write","tool_input":{"file_path":".goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh` with expected exit code 2.

5. **I5 — Use explicit file type glob in build copy.** In plan.md Phase 2, Task 1: change `cp plugin-hooks/* "$PLUGIN_DIR/hooks/"` to `cp plugin-hooks/*.sh plugin-hooks/*.json "$PLUGIN_DIR/hooks/"`.

6. **I6 — Add executable checks to fallback validation.** In plan.md Phase 2, Task 1, Step 2: after the python3 JSON validation, add `test -x "$PLUGIN_DIR/hooks/protect-state.sh" && test -x "$PLUGIN_DIR/hooks/warn-bash-state.sh"`.

7. **M1 — Make shellcheck non-conditional.** In plan.md Phase 1, Verification: change "Run `shellcheck plugin-hooks/*.sh` if available" to "Run `shellcheck plugin-hooks/*.sh` — expect no warnings."

8. **M2 — Add python3 guard.** In plan.md Phase 1, Tasks 1 and 2: add as first line of each script: `command -v python3 >/dev/null 2>&1 || exit 0`.

9. **M5 — Strengthen Phase 2 "Before" check.** Change to: `bun run build:plugin && ls dist/gp-plugin/hooks/` showing empty or nonexistent hooks directory.

10. **M6 — Add .gitkeep removal verification.** Add `test ! -f plugin-hooks/.gitkeep` to Phase 1 Expected Behavior.

11. **M7 — Add warn-bash-state.sh executable check.** In Phase 2 Expected Behavior, add: `test -x dist/gp-plugin/hooks/warn-bash-state.sh`.

12. **M3, M4, M8, M9 — Minor documentation/notes.** Add brief notes in the plan for: (a) doc alignment verification task, (b) python3 validation is additive to jq, (c) note the exact-match edge case for `.goodplan` path, (d) no action on structured stderr (defer).

## RESEARCH_NEEDED

None. All issues are directly actionable with information already available.

## Contradictions Resolved

1. **`realpath` severity:** Repo/Tooling rated CRITICAL, Holistic rated IMPORTANT, Software Architecture rated IMPORTANT, TUI/CLI rated MINOR. **Trusted: Repo/Tooling (domain specialist).** `realpath` on nonexistent paths under `set -euo pipefail` is a guaranteed script abort on every Write to a new file. Elevated to CRITICAL.

2. **Build glob severity:** Software Architecture rated MINOR, Repo/Tooling rated IMPORTANT. **Trusted: Repo/Tooling (domain specialist for build tooling).** Elevated to IMPORTANT since build correctness is their domain.

3. **Path resolution approach:** Holistic suggested string manipulation, Software Architecture suggested consolidating into python3, TUI/CLI suggested python3 `os.path.realpath`. **Resolved:** Software Architecture's approach (consolidate into existing python3 call with `os.path.normpath`) is the cleanest — single subprocess, no portability concerns, handles all edge cases.

4. **`additionalContext` vs stderr for warn-bash-state.sh:** Only TUI/CLI flagged this. Software Architecture didn't mention it. **Trusted: TUI/CLI (domain specialist for hook protocol semantics).** The hook protocol spec is clear: exit 0 stderr is ignored. This is a functional correctness bug.

## Unresolved (USER_INPUT required)

None — all resolved.

### USER_INPUT Resolved

1. **How should hook error messages reference the `gp` CLI binary?** **Answer:** Keep bare `gp` references. Claude already knows the plugin binary path from context. Simplest approach, fine for Experimental maturity. Document this decision in the plan as a note.
