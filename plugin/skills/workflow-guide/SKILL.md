---
name: workflow-guide
description: Always-on orientation for the goodplan workflow system. Provides CLI query/mutation patterns, .goodplan/ write restrictions, skill entry points per flow, and interrupted flow recovery guidance. This skill should be used when the user mentions goodplan, .goodplan directory, gp CLI, structured development workflow, epic/slice/quest status, or asks about project planning workflow. Common triggers: 'how does goodplan work', 'what gp commands are there', 'goodplan workflow', '.goodplan directory', 'project workflow', 'epic slice quest'.
user-invocable: false
requires: gp >= 1.0.0
---

# Workflow Guide

Orientation context for the goodplan structured development workflow. This skill supplements (does not replace) the detailed `cli-interaction.md` reference that consuming skills explicitly `@`-include.

## CLI Basics

The `gp` binary is on PATH (added by the plugin's `bin/` directory). All skill invocations use `gp` directly.

- Always use `--json` for structured output when parsing results
- `start-*` commands always return JSON (the `--json` flag is accepted but has no effect)
- Parse stdout on exit 0; check error codes on non-zero exit

```bash
gp status --json              # project state, active entities
gp --help                     # discover available commands
gp schema --json              # full command tree with schemas
gp task:list --json           # open tasks
gp decision:list --json       # active decisions
gp learning:list --json       # accumulated learnings
```

## CLI Command Categories

Run `gp schema --json` for the full command tree. Key entity command groups: `subsystem:*`, `project:*`, `briefing:*`, `task:*`, `decision:*`, `learning:*`.

## .goodplan/ Write Restrictions

| Category | Owned by | Skills may |
|---|---|---|
| **JSON/JSONL** (entity state, activity log, decisions, learnings, overviews) | CLI | Read via `--json` commands only. Never read or write directly. |
| **Learnings `.md` files** (`learnings/*.md`) | CLI | Written by CLI during completion. Skills pass `detail` in payload; CLI writes files. |
| **Project metadata** (`idea.md`, `conventions.md`) | LLM via `/gp:init` | Read directly. Written once during init; read-only reference files thereafter. |
| **Free-form markdown** (architecture, research, brainstorm, plans, goals) | LLM | Write into directories provided by CLI command responses. |

**Never** write to `.goodplan/` state files (`.json`, `.jsonl`). The `PreToolUse` hooks (`protect-state.sh`, `warn-bash-state.sh`) enforce this.

## Skill Entry Points by Flow

| User intent | Skill | Common triggers |
|---|---|---|
| Initialize a new project | `/gp:init` | "init", "initialize", "set up goodplan" |
| Start a new project/epic | `/gp:create-epic` | "new project", "new epic", "create epic" |
| Activate an epic | `/gp:start-epic` | "start epic", "activate epic", "approve architecture" |
| Check project status | `/gp:status` | "status", "where am I", "what's next" |
| Research/brainstorm | `/gp:explore` | "research", "explore", "brainstorm" |
| Create a side quest | `/gp:create-side-quest` | "side quest", "create quest", "new quest" |
| Create implementation plan | `/gp:plan-slice` | "plan slice", "create plan" |
| Implement a plan | `/gp:implement` | "implement", "build", "execute plan" |
| Complete an epic | `/gp:complete-epic` | "complete epic", "finish epic", "epic done" |
| Audit project quality | `/gp:audit` | "audit", "check quality", "review architecture" |
| Upgrade/migrate project | `/gp:upgrade` | "upgrade", "migrate", "convert" |
| Quick capture (bug/idea) | `/gp:task` | "capture", "note", "quick bug", "task" |

> **Note:** Slice completion is handled within `/gp:implement` (Step 7). Quest completion uses `gp quest:complete` via the CLI but has no dedicated skill.

## Interrupted Flow Recovery

If a workflow was interrupted mid-execution:

1. Run `gp status --json` to check current state
2. Check `activeSlice`, `activeQuest`, `activeEpic` fields for in-progress work
3. The entity's `status` field indicates which phase was interrupted
4. Re-invoke the appropriate skill — skills detect partial state and offer resume

### Common recovery patterns

- **STATE_INVALID_TRANSITION**: The entity is already past the requested phase. Check `show --json` → `.status` for current status and continue to the next step.
- **STATE_EPIC_ALREADY_ACTIVE**: Another epic is active. Complete or abandon it first.
- **STATE_QUEST_ALREADY_ACTIVE**: Another quest is active. Complete or abandon it first.
- **STATE_MISSING_VERIFICATIONS**: Epic has no verification criteria. Add them before activation.
- **STATE_ALREADY_INITIALIZED**: Project already initialized. Proceed with other commands.
- **Stale run directory detected**: Skills with iteration loops (not the CLI) check for incomplete run directories and offer to resume or start fresh.
- **Partial implementation**: If implementation was interrupted, re-running `/gp:implement` detects completed phases and resumes from the next one.
- **STATE_CONTENT_MISSING**: Required file not found — copy or regenerate the file and retry.
- **STATE_MAX_ROUNDS_REACHED**: Refinement round limit exceeded — use `--override` to force, or improve review scores.
- **STATE_SLICE_NOT_READY**: Previous slices not in terminal status — complete or abandon them first.

## Task & Decision Quick Reference

Common cross-skill operations for capturing tasks and decisions mid-workflow:

```bash
# Capture a task during any workflow
echo '{"name":"...","title":"...","description":"..."}' | gp task:create --json
# Convert task to a quest
gp task:convert --task <name> --json
# Record a decision
echo '{"title":"...","rationale":"...","alternatives":[...]}' | gp decision:create --json
```

## Error Handling Quick Reference

| Exit code | Meaning | Action |
|---|---|---|
| 0 | Success | Parse stdout as JSON |
| 1 | Internal error | Present error, stop |
| 2 | Validation error | Fix invocation |
| 3 | State machine error | Check status, apply recovery |
