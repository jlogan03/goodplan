#!/usr/bin/env bash
set -euo pipefail

# Python3 availability guard — degrade gracefully (allow if python3 missing)
command -v python3 >/dev/null 2>&1 || exit 0

INPUT=$(cat)

# Parse JSON, resolve path, and check protection in a single python3 invocation.
# Handles relative paths, normalization (.. segments), missing fields, and .goodplan-dev sentinel.
# Exit 2 = intentional block (direct write to state file).
# Any other python3 failure = graceful degradation (allow tool to proceed).
RC=0
echo "$INPUT" | python3 -c "
import json, os, sys
d = json.load(sys.stdin)
fp = d.get('tool_input', {}).get('file_path', '')
cwd = d.get('cwd', '')
if not fp:
    sys.exit(0)
# Check for .goodplan-dev sentinel — skip protection in dev repos
if os.path.isfile(os.path.join(cwd, '.goodplan-dev')):
    sys.exit(0)
if not os.path.isabs(fp):
    fp = os.path.join(cwd, fp)
resolved = os.path.normpath(fp)
prefix = os.path.join(cwd, '.goodplan') + os.sep
if resolved.startswith(prefix):
    if resolved.endswith('.json') or resolved.endswith('.jsonl'):
        print('Blocked: direct write to .goodplan/ state file. Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands.', file=sys.stderr)
        sys.exit(2)
    # Protect CLI-owned learnings/*.md files (e.g., .goodplan/learnings/foo.md,
    # .goodplan/epics/my-epic/learnings/bar.md). Files must be inside a learnings/
    # subdirectory — a file at .goodplan/learnings.md is not CLI-owned.
    rel = resolved[len(prefix):]
    parts = rel.split(os.sep)
    if len(parts) >= 2 and parts[-2] == 'learnings' and resolved.endswith('.md'):
        print('Blocked: direct write to .goodplan/ learnings file. Learnings are managed by the gp CLI (e.g., gp slice:complete, gp epic:complete).', file=sys.stderr)
        sys.exit(2)
" || RC=$?

# Only propagate exit 2 (intentional block). All other failures = allow.
[ "$RC" -eq 2 ] && exit 2
exit 0
