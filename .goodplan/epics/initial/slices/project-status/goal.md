# Slice Goal: `/project-status`

## What We're Building

A skill that reads `.project/` state and orients any session — what phase we're in, what was last completed, and what to do next. Useful at the start of any session and after context compaction.

## Behavior

1. Read `state.md` if it exists (fast path — may contain explicit resumption hints).
2. Read the last few entries of `flow-log.jsonl` to understand recent history.
3. Apply the file-existence state machine (as defined in `workflow.md`) to determine current phase for the active slice/quest (or project-level if no slice is active).
4. Check the work stack in `state.md` — if anything is interrupted, surface it.
5. Present a concise status summary: current scope, current phase, last completed action, what's in progress if anything.
6. Recommend the exact next skill to run, with any relevant arguments (e.g., `/explore slice/user-auth` or `/create-plan`).
7. Offer to show more detail (full flow-log, all slice statuses) if asked.

## Success Criteria

Run `/project-status` in this repo at various points during development:

- At the start of the project (after idea captured): correctly identifies phase as "ready to explore or define architecture", recommends `/explore` or `/define-architecture`
- Mid-slice (after `plan.md` exists but no `plan-refined.md`): correctly identifies the active slice and recommends `/refine-plan`
- After context compaction in a long session: correctly resumes from `state.md` without needing to re-explore the filesystem from scratch
- With an interrupted slice (side quest active): surfaces the interrupted work and the active side quest clearly
