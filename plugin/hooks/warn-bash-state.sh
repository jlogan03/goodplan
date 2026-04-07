#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: warn (via additionalContext) when a Bash command references
# .goodplan/ files. Reads are allowed silently; only writes trigger the warning.
#
# This hook never blocks — it only emits hookSpecificOutput.additionalContext.
# Exit 0 always, whether or not a warning is emitted.

INPUT=$(cat)

# Extract a string value from the hook JSON input. See protect-state.sh for
# the rationale of using sed over a JSON parser.
extract_string() {
	local key=$1
	printf '%s' "$INPUT" | sed -n 's/.*"'"$key"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

cwd=$(extract_string cwd)
cmd=$(extract_string command)

# .goodplan-dev sentinel: skip warning in dev repos
[ -n "$cwd" ] && [ -f "$cwd/.goodplan-dev" ] && exit 0

# Only warn if the command references .goodplan/
case "$cmd" in
	*".goodplan/"*) ;;
	*) exit 0 ;;
esac

# Read-only patterns — commands that inspect .goodplan/ but don't modify it
read_only_patterns="cat grep rg ls stat head tail wc file diff find less more bat"

# Trim leading whitespace from the command
stripped=${cmd#"${cmd%%[![:space:]]*}"}

for p in $read_only_patterns; do
	# Starts with a read-only command: e.g., "cat .goodplan/foo"
	case "$stripped" in
		"$p "*) exit 0 ;;
	esac
	# Read-only command inside a subshell: e.g., "echo $(cat .goodplan/foo)"
	case "$cmd" in
		*'$('"$p "*) exit 0 ;;
		*'`'"$p "*) exit 0 ;;
	esac
done

# Emit the warning as a single-line JSON object. The content is static so no
# escaping is needed beyond what's already in the heredoc.
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"This command references .goodplan/ files. State files (.json/.jsonl) and learnings (.md in learnings/) are managed by the gp CLI -- direct reads are fine, but avoid direct writes."}}
JSON

exit 0
