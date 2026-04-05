---
name: workflow-guide
description: >
  Always-on orientation for the goodplan workflow system. Provides CLI query/mutation
  patterns, .goodplan/ write restrictions, skill entry points per flow, and interrupted
  flow recovery guidance. Not directly invocable — auto-loaded by description matching
  when Claude encounters goodplan workflow context in the conversation.
user-invocable: false
---

# Workflow Guide

Orientation context for the goodplan structured development workflow. This skill supplements (does not replace) the detailed `cli-interaction.md` reference that consuming skills explicitly `@`-include.

<!-- Why both plugin/CLAUDE.md and workflow-guide exist:
     plugin/CLAUDE.md is minimal always-loaded context (CLI discovery, hands-off policy, expertise tracking) —
     it loads on every session regardless of skill invocation. workflow-guide is deeper orientation
     (entry points, flow recovery, error handling) loaded on-demand via description matching when
     Claude encounters goodplan workflow context. They have distinct roles and audiences. -->

## CLI Basics

The `gp` binary is on PATH (added by the plugin's `bin/` directory). All skill invocations use `gp` directly.

- Always use `--json` for structured output when parsing results
- `start-*` commands always return JSON (the `--json` flag is accepted but has no effect)
- Parse stdout on exit 0; check error codes on non-zero exit

```bash
gp status --json              # project state, active entities
gp --help                     # discover available commands
gp schema --json              # full command tree with schemas
```

## .goodplan/ Write Restrictions

| Category | Owned by | Skills may |
|---|---|---|
| **JSON/JSONL** (entity state, activity log, decisions, learnings, overviews) | CLI | Read via `--json` commands only. Never read or write directly. |
| **Learnings `.md` files** (`learnings/*.md`) | CLI | Written by CLI during completion. Skills pass `detail` in payload; CLI writes files. |
| **Free-form markdown** (architecture, research, brainstorm, plans, goals) | LLM | Write into directories provided by CLI command responses. |

**Never** write to `.goodplan/` state files (`.json`, `.jsonl`). The `PreToolUse` hooks (`protect-state.sh`, `warn-bash-state.sh`) enforce this.

## Skill Entry Points by Flow

| User intent | Skill | Common triggers |
|---|---|---|
| Start a new project/epic | `/gp:create-epic` | "new project", "start epic", "create epic" |
| Check project status | `/gp:status` | "status", "where am I", "what's next" |
| Research/brainstorm | `/gp:explore` | "research", "explore", "brainstorm" |
| Create implementation plan | `/gp:plan-slice` | "plan slice", "create plan" |
| Implement a plan | `/gp:implement` | "implement", "build", "execute plan" |
| Complete a slice/quest/epic | `/gp:complete` | "complete", "finish", "done" |
| Upgrade/migrate project | `/gp:upgrade` | "upgrade", "migrate", "convert" |
| Quick capture (bug/idea) | `/gp:capture` | "capture", "note", "quick bug" |

## Interrupted Flow Recovery

If a workflow was interrupted mid-execution:

1. Run `gp status --json` to check current state
2. Check `activeSlice`, `activeQuest`, `activeEpic` fields for in-progress work
3. The entity's `status` field indicates which phase was interrupted
4. Re-invoke the appropriate skill — skills detect partial state and offer resume

### Common recovery patterns

- **STATE_INVALID_TRANSITION** on re-entry: The entity is already past the requested phase. Check `show --json` for current status and continue to the next step.
- **Stale run directory detected**: Skills with iteration loops check for incomplete run directories and offer to resume or start fresh.
- **Partial implementation**: If implementation was interrupted, re-running `/gp:implement` detects completed phases and resumes from the next one.

## Error Handling Quick Reference

| Exit code | Meaning | Action |
|---|---|---|
| 0 | Success | Parse stdout as JSON |
| 1 | Internal error | Present error, stop |
| 2 | Validation error | Fix invocation |
| 3 | State machine error | Check status, apply recovery |
