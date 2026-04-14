#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: block direct writes to .goodplan/ state files (.json/.jsonl)
# and learnings/*.md files — these are managed by the gp CLI.
#
# Exit 2 = intentional block (direct write to protected file).
# Exit 0 = allow (includes graceful degradation on parsing failures).

INPUT=$(cat)

# Extract a top-level or nested string value from the hook JSON input.
# Assumes Claude Code's stable hook JSON format — a simple pattern match
# rather than full JSON parsing keeps this dependency-free.
extract_string() {
	local key=$1
	printf '%s' "$INPUT" | sed -n 's/.*"'"$key"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

cwd=$(extract_string cwd)
file_path=$(extract_string file_path)

# Missing fields — degrade gracefully
[ -z "$file_path" ] && exit 0
[ -z "$cwd" ] && exit 0

# .goodplan-dev sentinel: skip protection in dev repos (where editing state
# files directly is expected, e.g., while developing the gp CLI itself)
[ -f "$cwd/.goodplan-dev" ] && exit 0

# Resolve relative paths against cwd
case "$file_path" in
	/*) abs_path=$file_path ;;
	*)  abs_path="$cwd/$file_path" ;;
esac

prefix="$cwd/.goodplan/"

# Only protect files inside the current project's .goodplan/
case "$abs_path" in
	"$prefix"*)
		# State files: .json, .jsonl anywhere under .goodplan/
		case "$abs_path" in
			*.json|*.jsonl)
				echo "Blocked: direct write to .goodplan/ state file. Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands." >&2
				exit 2
				;;
		esac
		# Learnings: .md files whose immediate parent directory is "learnings"
		# (e.g., .goodplan/learnings/foo.md, .goodplan/epics/x/learnings/bar.md)
		case "$abs_path" in
			*.md)
				parent_dir="${abs_path%/*}"
				case "$parent_dir" in
					*/learnings)
						echo "Blocked: direct write to .goodplan/ learnings file. Learnings are managed by the gp CLI (e.g., gp slice:complete, gp epic:complete)." >&2
						exit 2
						;;
				esac
				;;
		esac
		# Spine files: top-level markdown files that define project structure.
		# These should only be updated through CLI commands, not direct writes.
		basename="${abs_path##*/}"
		case "$basename" in
			architecture-current.md|conventions.md|invariants.md)
				echo "Blocked: direct write to .goodplan/ spine file ($basename). Spine files are managed by the gp CLI." >&2
				exit 2
				;;
		esac
		;;
esac

exit 0
