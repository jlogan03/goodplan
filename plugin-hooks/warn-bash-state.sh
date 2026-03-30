#!/usr/bin/env bash
set -euo pipefail

# Python3 availability guard — degrade gracefully (allow if python3 missing)
command -v python3 >/dev/null 2>&1 || exit 0

INPUT=$(cat)

# Consolidate all logic into a single python3 invocation to avoid
# the `read` subshell variable-evaporation problem under `set -euo pipefail`.
# If python3 fails (exit 1), bash exits due to set -e -> hook is skipped -> tool proceeds.
# This is intentional graceful degradation.
echo "$INPUT" | python3 -c "
import json, os, sys
d = json.load(sys.stdin)
cmd = d.get('tool_input', {}).get('command', '')
cwd = d.get('cwd', '')
# Check for .goodplan-dev sentinel — skip warning in dev repos
if os.path.isfile(os.path.join(cwd, '.goodplan-dev')):
    sys.exit(0)
# Check if command references .goodplan/
if '.goodplan/' in cmd:
    print(json.dumps({
        'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'additionalContext': 'This command references .goodplan/ files. State files (.json/.jsonl) are managed by the gp CLI -- direct reads are fine, but avoid direct writes.'
        }
    }))
"

exit 0
