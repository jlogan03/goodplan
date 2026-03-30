# Plan: State Protection Hooks

## Overview

Implement two PreToolUse hook scripts that ship with the goodplan plugin: `protect-state.sh` blocks Write/Edit on `.goodplan/` JSON/JSONL state files, and `warn-bash-state.sh` warns when Bash commands reference `.goodplan/`. Hook configuration lives in `hooks.json` using Claude Code's matcher-based format. Source files live in `plugin-hooks/` and are copied to `dist/gp-plugin/hooks/` during `build:plugin`.

Scripts use `python3 -c` for JSON parsing (no `jq` dependency — python3 is guaranteed on macOS since Catalina). The `.goodplan-dev` sentinel file bypasses the bash warning in development repos.

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
- [ ] `echo '{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh; echo "EXIT: $?"` — exits 0 with warning on stderr
- [ ] `echo '{"tool_name":"Bash","tool_input":{"command":"ls src/"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh; echo "EXIT: $?"` — exits 0 with no stderr
- [ ] Sentinel bypass: `mkdir -p /tmp/test && touch /tmp/test/.goodplan-dev && echo '{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/project.json"},"cwd":"/tmp/test"}' | bash plugin-hooks/warn-bash-state.sh 2>&1; echo "EXIT: $?"` — exits 0 with no stderr (sentinel suppresses warning)
- [ ] `python3 -c "import json; json.load(open('plugin-hooks/hooks.json'))"` — succeeds (valid JSON)

### Tasks

- [ ] Create `plugin-hooks/protect-state.sh`:
  1. `#!/usr/bin/env bash` with `set -euo pipefail`
  2. Read stdin JSON via `python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''));print(d.get('cwd',''))"` — outputs file_path and cwd on separate lines
  3. Resolve file_path: if relative, prepend cwd (hook may receive relative paths). Normalize via `realpath` or string manipulation.
  4. Check if resolved path is under `$CWD/.goodplan/` AND ends with `.json` or `.jsonl`: block (exit 2, stderr message). The match must be: starts with `$CWD/.goodplan/` and ends with `.json` or `.jsonl`.
  5. All other paths (including `.goodplan/**/*.md`): exit 0 (allow)
  6. Stderr message on block: `"Blocked: direct write to .goodplan/ state file. Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands."`
  7. Make executable: `chmod +x plugin-hooks/protect-state.sh`
- [ ] Create `plugin-hooks/warn-bash-state.sh`:
  1. `#!/usr/bin/env bash` with `set -euo pipefail`
  2. Read stdin JSON via `python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''));print(d.get('cwd',''))"` — outputs command and cwd on separate lines
  3. Check if `$CWD/.goodplan-dev` exists: if yes, exit 0 immediately (dev repo bypass)
  4. Check if command string contains `.goodplan/`: if yes, exit 0 with stderr advisory `"⚠ This command references .goodplan/ files. State files (.json/.jsonl) are managed by the gp CLI — direct reads are fine, but avoid direct writes."`
  5. Otherwise: exit 0 silently
  6. Make executable: `chmod +x plugin-hooks/warn-bash-state.sh`
- [ ] Create `plugin-hooks/hooks.json`:
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
- [ ] Remove `plugin-hooks/.gitkeep` (no longer needed — directory has real files)

### Verification

Run all stdin-piped tests above. Verify scripts handle edge cases: empty file_path, missing cwd field, file_path that contains `.goodplan/` as a substring but isn't under `.goodplan/` (e.g., `/tmp/not-.goodplan/foo.json`). Run `shellcheck plugin-hooks/*.sh` if available.

## Phase 2: Build Integration & Validation

Add the hook copy step to `build-plugin.sh` and validate the assembled plugin.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls dist/gp-plugin/hooks/protect-state.sh` — fails: file not in build output (hooks/ dir is empty)
- [ ] `bun run build:plugin && cat dist/gp-plugin/hooks/hooks.json` — no hooks.json in output

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin && ls dist/gp-plugin/hooks/` — shows `hooks.json`, `protect-state.sh`, `warn-bash-state.sh`
- [ ] `dist/gp-plugin/hooks/protect-state.sh` is executable
- [ ] `python3 -c "import json; json.load(open('dist/gp-plugin/hooks/hooks.json'))"` — valid JSON
- [ ] `.claude-plugin/plugin.json` in dist references `"hooks": "./hooks/hooks.json"` (already configured from slice 02)
- [ ] `claude plugin validate dist/gp-plugin/` — passes

### Tasks

- [ ] Add hook copy step to `scripts/build-plugin.sh`:
  1. After the existing `mkdir -p "$PLUGIN_DIR/hooks"` line, add: `cp plugin-hooks/* "$PLUGIN_DIR/hooks/"` and `chmod +x "$PLUGIN_DIR/hooks/"*.sh`
  2. Add a validation step in the fallback validation section: `python3 -c "import json; json.load(open('$PLUGIN_DIR/hooks/hooks.json'))"` to assert hooks.json is valid JSON
- [ ] Verify `plugin.json` already has `"hooks": "./hooks/hooks.json"` (should already be there from slice 02 — no change needed, just confirm)

### Verification

Run `bun run build:plugin` — succeeds. Verify hooks are copied and executable. Run `claude plugin validate dist/gp-plugin/` — passes. If Claude Code is available, test with `claude --plugin-dir dist/gp-plugin` and attempt a Write to `.goodplan/*.json` — confirm it's blocked.
