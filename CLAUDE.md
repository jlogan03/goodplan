# goodplan

## Project Context

This repo builds a suite of Claude Code skills implementing the development workflow described in `workflow.md`. State lives in `.project/`.

| File | Purpose |
|---|---|
| [`workflow.md`](workflow.md) | The development workflow this project implements — read this to understand the full picture |
| [`.project/idea.md`](.project/idea.md) | Project goal, scope, skill inventory, constraints, open questions |
| [`.project/learnings.md`](.project/learnings.md) | Accumulated learnings across all slices (created after first slice completes) |

## What We're Building

Skills implementing the development workflow:

- `/create-epic` — initialize `.project/` and first epic, or add new epic to existing project
- `/explore` — brainstorm & research loop (epic-scoped or side-quest-scoped)
- `/create-architecture` — interactive architecture definition, writes to epic's `architecture/`
- `/create-slices` — ordered vertical slices within an epic
- `/create-plan` — produce a plan document for a slice/quest
- `/complete` — roll up learnings, propose architecture updates, review remaining work (slices, side quests, epics)
- `/project-status` — read `.project/` state, report status and next step
- `/refine-architecture` — iteratively review and improve architecture files
- `/audit-architecture` — compare intended architecture against actual code
- `/refine-slices` — iteratively improve slice definitions and sequencing

Existing skills `/refine-plan` and `/implement-plan` are used as-is.

## Workflow State

Current status is always derivable from `.project/` file existence (see `workflow.md` → File Existence as State Machine).
