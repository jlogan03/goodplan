# Slice Goal: `/create-plan`

## What We're Building

A skill that takes a slice or side quest goal and produces a complete plan document in the exact format expected by `/refine-plan` and `/implement-plan`. Reads all available context, asks questions to fill gaps, and writes `plan.md`.

## Pre-Work (Part of This Slice)

Before writing the skill, inspect the existing `/refine-plan` and `/implement-plan` skills to understand:
- The exact plan document format they expect
- What sections are required vs. optional
- How phases are defined and what information each phase needs
- What "passing review" looks like — what criteria reviewers check

This inspection informs the skill's output format. The plan format becomes a documented convention referenced in this goal.

## Behavior

1. Determine scope: which slice or side quest are we planning? (Check `state.md` or accept as argument.)
2. Read all available context: `goal.md` for the scope, `architecture/`, `conventions.md`, `architecture/conventions.md`, `learnings.md`, `sequencing.md`, other slice `goal.md` files, and any exploration output in the scope's `research/` and `brainstorm/` directories.
3. Draft an initial plan structure based on context.
4. Ask the user targeted questions to fill gaps — focus on anything that would make an implementation sub-agent uncertain.
5. Iterate on the plan with the user until satisfied.
6. Write `plan.md` in the scope's directory.
7. Update `state.md` and `flow-log.jsonl`.

## Success Criteria

Run for the `start-project` slice in this repo:

- `plan.md` is written to `.project/vertical-slices/01-start-project/plan.md`
- Hand the plan directly to `/refine-plan` — it runs without needing manual edits or clarifications about format
- The plan's phases are implementable end-to-end by an implementation sub-agent that has only the plan + architecture + conventions as context
- Plan includes concrete success verification steps (how to confirm each phase worked)
