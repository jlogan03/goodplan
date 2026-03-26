# Completion Learnings — 06-dogfooding

## Skills must use relative paths, not absolute paths to _shared/references/

All 15 skills hardcoded `~/.claude/skills/_shared/references/` — breaking in-project installs where the skill directory is `.claude/skills/`. Fixed by replacing 121 occurrences with relative paths (`../_shared/references/` from SKILL.md, `../../_shared/references/` from references/*.md). Future skills must use relative paths from the start.

## CLI concurrent modification check needs a recovery mechanism

The `DATA_CONCURRENT_MODIFICATION` check in `commitState()` compares on-disk bytes against expected state. When any external process modifies a JSON file (even a sub-agent via Bash), the check fails permanently — retries don't help because the content has changed. Added `--force` flag as recovery mechanism. The fundamental tension: the check exists to prevent corruption, but skills and their sub-agents can trigger it inadvertently.

## /create-slices must call slice:create to register individual slice entities

The skill wrote goal.md files and called `submit-slices` (epic-level transition) but never called `slice:create` for each slice. Without this, `slice:list` returned empty and per-slice plan/implement/complete couldn't proceed. The CLI has flat entity paths (`.project/slices/<name>/`) separate from the epic's slice directory (`epics/<name>/slices/<NN-name>/`).

## The ~~archived~~ directory rename convention is incompatible with CLI path resolution

The `/complete` skill's `~~archived~~` rename permanently broke CLI path resolution — `epic:show --epic <name>` fails because the directory was renamed. Removed the convention entirely; completed entities are identified by `status === "completed"` via CLI queries, not directory naming.

## Skills running with Haiku skip final submit-* steps ~50% of the time

The submit-* CLI calls sit at the end of long skill files. Haiku handles core work (research, code writing, review) but drops "housekeeping" at the end. Partially mitigated by adding CRITICAL markers before submit calls, but the real fix is either moving submit earlier or having the harness always run fallback transitions.

## Agent SDK sessions need explicit PATH and full env inheritance

The Agent SDK's `query()` `env` option replaces the environment rather than merging. Passing `env: { PATH: "..." }` strips auth credentials. Must spread `process.env` first: `env: { ...process.env, PATH: "..." }`. The goodplan binary also needs to be on PATH — `~/bin/goodplan` isn't in the default PATH for SDK sessions.

## The canUseTool hook only covers the main agent, not sub-agents

Sub-agents spawned via the Agent tool have their own tool execution path that bypasses the main session's `canUseTool` callback. This means violation detection for `.project/` direct access only catches the top-level agent's tool calls, not sub-agent Bash commands.

## Opus follows autonomous mode instructions perfectly; Haiku does not

With the system prompt "Do NOT use AskUserQuestion. Make all decisions autonomously," Opus made zero AskUserQuestion calls across 28 skill invocations. Haiku sometimes ignored this instruction. The `canUseTool` auto-answerer is essential for Haiku but unused with Opus.

## Full workflow validation requires ~$52 with Opus, ~$12 with Haiku

28 skills across 2 epics + 2 quests: $51.84 with Opus (161 min), $12.01 with Haiku (100 min, incomplete). Refinement skills (refine-plan, refine-architecture) dominate cost at 45%. Average per-skill: $1.85 Opus, $0.55 Haiku.

## start-epic is the only remaining un-migrated skill

The skill audit found 14 violations total, 9 from start-epic alone. It still uses direct `state.md` writes, `activity-log.jsonl` appends, `__active__` directory renames, and `ls`-based entity detection. The CLI has `epic:activate` but start-epic doesn't use it.
