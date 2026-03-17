# goodplan

## Project Context

This repo builds a suite of Claude Code skills implementing the development workflow described in `workflow.md`. State lives in `.project/`.

| File | Purpose |
|---|---|
| [`workflow.md`](workflow.md) | The development workflow this project implements — read this to understand the full picture |
| [`.project/idea.md`](.project/idea.md) | Project goal, scope, skill inventory, constraints, open questions |
| [`.project/learnings.md`](.project/learnings.md) | Accumulated learnings across all slices (created after first slice completes) |

## What We're Building

Six new skills + wiring:

- `/start-project` — initialize `.project/`, capture and flesh out idea
- `/explore-project` — brainstorm & research loop (project-level or slice-scoped)
- `/define-architecture` — interactive architecture definition, populates `architecture/`
- `/define-slices` — ordered vertical slices with concrete verifiable success criteria
- `/create-plan` — produce a plan document for a slice/quest (format compatible with `/refine-plan` and `/implement-plan`)
- `/synthesize-learnings` — roll up slice/quest learnings back into repo-level state

Existing skills `/refine-plan` and `/implement-plan` are used as-is.

## Workflow State

Current status is always derivable from `.project/` file existence (see `workflow.md` → File Existence as State Machine).
