#!/usr/bin/env bash
set -euo pipefail

# Python3 availability guard — degrade gracefully (allow if python3 missing)
command -v python3 >/dev/null 2>&1 || exit 0

INPUT=$(cat)

# Consolidate all logic into a single python3 invocation to avoid
# the `read` subshell variable-evaporation problem under `set -euo pipefail`.
# This hook never blocks — it only warns. Any python3 failure = graceful degradation (no warning).
echo "$INPUT" | python3 -c "
import json, os, sys
d = json.load(sys.stdin)
cmd = d.get('tool_input', {}).get('command', '')
cwd = d.get('cwd', '')
# Check for .goodplan-dev sentinel — skip warning in dev repos
if os.path.isfile(os.path.join(cwd, '.goodplan-dev')):
    sys.exit(0)
# Check if command writes to .goodplan/ (not just reads)
# Only warn on write-like operations, not reads (cat, grep, ls, stat, head, tail, jq, etc.)
if '.goodplan/' in cmd:
    read_only_patterns = ['cat ', 'grep ', 'rg ', 'ls ', 'stat ', 'head ', 'tail ', 'wc ', 'file ', 'diff ', 'find ', 'less ', 'more ', 'bat ']
    stripped = cmd.strip()
    # Check both start-of-command and subshell/pipe patterns like $(cat .goodplan/...)
    is_read_only = any(stripped.startswith(p) for p in read_only_patterns) or any('$(' + p.strip() for p in read_only_patterns if ('$(' + p.strip()) in cmd)
    if not is_read_only:
        print(json.dumps({
            'hookSpecificOutput': {
                'hookEventName': 'PreToolUse',
                'additionalContext': 'This command references .goodplan/ files. State files (.json/.jsonl) and learnings (.md in learnings/) are managed by the gp CLI -- direct reads are fine, but avoid direct writes.'
            }
        }))
" || true

exit 0
