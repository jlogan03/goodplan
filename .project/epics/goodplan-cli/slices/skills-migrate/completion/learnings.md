# Learnings: skills-migrate

## Skills reference slash commands, not CLI commands
The command audit found zero `goodplan <command>` invocations in skill files. Skills are markdown prompts that orchestrate Claude Code agents via slash commands (`/create-plan`, `/implement-plan`). The skill consolidation epic needs to bridge these surfaces — the `start-*`/`submit-*` subagent commands are the likely integration point since they already model the skill-to-CLI handoff.

## Shell script robustness needs upfront specification
Review caught 4 issues the plan didn't specify: existence guards for missing source dirs, clean-install semantics (rm + rsync vs cp -R which leaves stale files), POSIX trailing newlines, and `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` for robust path resolution. Future plans involving shell scripts should specify error handling, idempotency, and path resolution patterns explicitly.

## Verify convention/goal alignment before planning
The plan listed 14 skill dirs; the confirmed goal required 15 (including a `migrate` stub from conventions.md). This was caught as a CRITICAL in refinement round 1. Cross-referencing conventions.md against the plan during create-plan would have caught this earlier.
