# Plan: State Protection Hooks

Status: COMPLETE
Completed: 2026-03-30

## Overview

Implement two PreToolUse hook scripts that ship with the goodplan plugin: `protect-state.sh` blocks Write/Edit on `.goodplan/` JSON/JSONL state files, and `warn-bash-state.sh` warns when Bash commands reference `.goodplan/`. Hook configuration lives in `hooks.json` using Claude Code's matcher-based format. Source files live in `plugin-hooks/` and are copied to `dist/gp-plugin/hooks/` during `build:plugin`.

Scripts use `python3 -c` for JSON parsing (no `jq` dependency — python3 is guaranteed on macOS since Catalina). Each script gracefully degrades if python3 is unavailable (`exit 0` — allow). The `.goodplan-dev` sentinel file bypasses the bash warning in development repos.

> **Note:** Hook error messages reference `gp` without a full path. Claude already knows the plugin binary path from context. Simplest approach for Experimental maturity.

This is Layer 1 (Prevention) of the three-layer state protection story, complementing Layer 2 (Detection via HMAC, slice 03) and Layer 3 (Repo detection via `.goodplan-dev`).

## Phase 1: Hook Scripts & Configuration

Create the two hook scripts and `hooks.json` in the `plugin-hooks/` source directory. Verify each script independently with piped stdin.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls plugin-hooks/protect-state.sh` — fails: file doesn't exist (only `.gitkeep` in directory)
- [ ] `ls plugin-hooks/warn-bash-state.sh` — fails: file doesn't exist
- [ ] `ls plugin-hooks/hooks.json` — fails: file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test/.goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 2 with stderr "Blocked: direct write to .goodplan/ state file..."
- [ ] `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test/.goodplan/brainstorm/foo.md"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 0 (markdown allowed)
- [ ] `echo '{"tool_name":"Edit","tool_input":{"file_path":"/tmp/test/.goodplan/epics/foo/epic.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 2 (nested JSON blocked)
- [ ] `echo '{"tool_name":"Write","tool_input":{"file_path":".goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 2 (relative path resolved to absolute, blocked)
- [ ] `echo '{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh; echo "EXIT: $?"` — exits 0 with JSON on stdout containing `additionalContext`
- [ ] `echo '{"tool_name":"Bash","tool_input":{"command":"ls src/"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh; echo "EXIT: $?"` — exits 0 with no stdout/stderr
- [ ] Sentinel bypass: `mkdir -p /tmp/test-sentinel && touch /tmp/test-sentinel/.goodplan-dev && echo '{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/project.json"},"cwd":"/tmp/test-sentinel"}' | bash plugin-hooks/warn-bash-state.sh; echo "EXIT: $?"` — exits 0 with no stdout/stderr (sentinel suppresses warning). Uses distinct cwd to avoid sentinel file bleeding into other tests.
- [ ] `echo '{}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 0 (allow when JSON is empty / missing fields)
- [ ] `echo '{"tool_input":{}}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 0 (allow when file_path is missing)
- [ ] `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test/.goodplan/../secret.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/protect-state.sh; echo "EXIT: $?"` — exits 0 (path traversal via `..` normalizes to `/tmp/test/secret.json`, not under `.goodplan/`)
- [ ] `echo '{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'hookSpecificOutput' in d and 'additionalContext' in d['hookSpecificOutput']"` — validates stdout JSON structure
- [ ] `test ! -f plugin-hooks/.gitkeep` — confirms .gitkeep was removed
- [ ] `python3 -c "import json; json.load(open('plugin-hooks/hooks.json'))"` — succeeds (valid JSON)

### Tasks

- [x] Create `plugin-hooks/protect-state.sh`:
  1. `#!/usr/bin/env bash` with `set -euo pipefail`
  2. Python3 availability guard: `command -v python3 >/dev/null 2>&1 || exit 0` (degrade gracefully — allow if python3 missing)
  3. Capture stdin once: `INPUT=$(cat)`
  4. Parse JSON and resolve path in a single python3 invocation: `RESOLVED_PATH=$(echo "$INPUT" | python3 -c "import json,os,sys; d=json.load(sys.stdin); fp=d.get('tool_input',{}).get('file_path',''); cwd=d.get('cwd',''); [sys.exit(0) if not fp else None]; fp=os.path.join(cwd,fp) if not os.path.isabs(fp) else fp; print(os.path.normpath(fp))")`. This handles relative paths, normalization, and avoids the `realpath` portability issue (macOS `realpath` fails on nonexistent paths under `set -e`). Includes explicit early exit when `file_path` is empty or missing — makes the safety intentional rather than coincidental.
  5. Check if resolved path starts with `$CWD/.goodplan/` AND ends with `.json` or `.jsonl`: block (exit 2, stderr message). Note: no check for exact match `$CWD/.goodplan` (no trailing slash) — no Write/Edit operation targets a bare directory path, so this would be dead code.
  6. Comment in script: `# If python3 fails (exit 1), bash exits due to set -e -> hook is skipped -> tool proceeds. This is intentional graceful degradation — we allow when in doubt.`
  7. All other paths (including `.goodplan/**/*.md`): exit 0 (allow)
  8. Stderr message on block: `"Blocked: direct write to .goodplan/ state file. Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands."`
  9. Make executable: `chmod +x plugin-hooks/protect-state.sh`
- [x] Create `plugin-hooks/warn-bash-state.sh`:
  1. `#!/usr/bin/env bash` with `set -euo pipefail`
  2. Python3 availability guard: `command -v python3 >/dev/null 2>&1 || exit 0` (degrade gracefully)
  3. Capture stdin once: `INPUT=$(cat)`
  4. Consolidate all logic into a single python3 invocation (avoids the `read` subshell variable-evaporation problem under `set -euo pipefail`): `echo "$INPUT" | python3 -c "import json,os,sys; d=json.load(sys.stdin); cmd=d.get('tool_input',{}).get('command',''); cwd=d.get('cwd',''); [sys.exit(0) if os.path.isfile(os.path.join(cwd,'.goodplan-dev')) else None]; [print(json.dumps({'hookSpecificOutput':{'additionalContext':'This command references .goodplan/ files. State files (.json/.jsonl) are managed by the gp CLI -- direct reads are fine, but avoid direct writes.'}})) if '.goodplan/' in cmd else None]"`. Uses `json.dumps()` for output construction to avoid fragile shell quoting. Note: the `hookSpecificOutput` shape omits `hookEventName` — research indicates this is only required for `updatedInput` responses, not `additionalContext`. Verify during implementation.
  5. Comment in script: `# If python3 fails (exit 1), bash exits due to set -e -> hook is skipped -> tool proceeds. This is intentional graceful degradation.`
  6. Exit 0
  7. Make executable: `chmod +x plugin-hooks/warn-bash-state.sh`
- [x] Create `plugin-hooks/hooks.json`:
  ```json
  {
    "description": "Protects .goodplan/ state files from direct modification",
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/protect-state.sh" }]
        },
        {
          "matcher": "Bash",
          "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/warn-bash-state.sh" }]
        }
      ]
    }
  }
  ```
- [x] Remove `plugin-hooks/.gitkeep` (no longer needed — directory has real files)

### Verification

Run all stdin-piped tests above. Verify scripts handle edge cases: empty file_path, missing cwd field, file_path that contains `.goodplan/` as a substring but isn't under `.goodplan/` (e.g., `/tmp/not-.goodplan/foo.json`). Run `shellcheck plugin-hooks/*.sh` — expect no warnings. Verify implementation aligns with architecture docs (`plugin-api.md`, `_overview.md`).

- [x] **Update `plugin-api.md` warn-bash-state.sh Logic block** (lines 113–123): the current text shows two separate python3 invocations and stderr output. Update the entire block to reflect the consolidated single-invocation pattern and stdout JSON `additionalContext` contract used in the actual implementation.

## Phase 2: Build Integration & Validation

Add the hook copy step to `build-plugin.sh` and validate the assembled plugin.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build:plugin && ls dist/gp-plugin/hooks/` — hooks directory is empty or nonexistent (proves build runs but doesn't copy hooks yet)
- [ ] `bun run build:plugin && cat dist/gp-plugin/hooks/hooks.json` — no hooks.json in output

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin && ls dist/gp-plugin/hooks/` — shows `hooks.json`, `protect-state.sh`, `warn-bash-state.sh`
- [ ] `test -x dist/gp-plugin/hooks/protect-state.sh` — is executable
- [ ] `test -x dist/gp-plugin/hooks/warn-bash-state.sh` — is executable
- [ ] `python3 -c "import json; json.load(open('dist/gp-plugin/hooks/hooks.json'))"` — valid JSON
- [ ] `.claude-plugin/plugin.json` in dist references `"hooks": "./hooks/hooks.json"` (already configured from slice 02)
- [ ] `claude plugin validate dist/gp-plugin/` — passes

### Tasks

- [x] Add hook copy step to `scripts/build-plugin.sh`:
  1. After the existing `mkdir -p "$PLUGIN_DIR/hooks"` line, add: `cp plugin-hooks/*.sh plugin-hooks/*.json "$PLUGIN_DIR/hooks/"` and `chmod +x "$PLUGIN_DIR/hooks/"*.sh` (explicit file types — avoids copying `.gitkeep` or other stray files)
  2. Add a validation step in the fallback validation section: `python3 -c "import json; json.load(open('$PLUGIN_DIR/hooks/hooks.json'))"` to assert hooks.json is valid JSON, and `test -x "$PLUGIN_DIR/hooks/protect-state.sh" && test -x "$PLUGIN_DIR/hooks/warn-bash-state.sh"` to assert scripts are executable. Note: this python3 validation is additive to the existing `jq` validation of `plugin.json` — not replacing it. Add a brief comment in the build script: `# jq validates plugin.json (dev machines have jq); python3 validates hooks.json (guaranteed on macOS)`.
- [x] Verify `plugin.json` already has `"hooks": "./hooks/hooks.json"` (should already be there from slice 02 — no change needed, just confirm)

### Verification

Run `bun run build:plugin` — succeeds. Verify hooks are copied and executable. Run `claude plugin validate dist/gp-plugin/` — passes. If Claude Code is available, test with `claude --plugin-dir dist/gp-plugin` and attempt a Write to `.goodplan/*.json` — confirm it's blocked.
