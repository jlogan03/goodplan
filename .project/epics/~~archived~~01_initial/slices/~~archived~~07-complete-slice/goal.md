# Slice Goal: `/complete-slice`

## What We're Building

A skill that closes out a completed slice or side quest — rolls up learnings, proposes architecture updates, reviews remaining slice goals for anything that warrants updating, and asks about a cleanup/refactor pass.

## Behavior

1. Determine scope: which slice or side quest are we completing? (Check `state.md` or accept as argument.)
2. Read all implementation artifacts: `plan-refined.md`, `implementation/` phase results and reviews, `after-implementation-fixes-and-polish.md` (if exists), `plan-learnings-and-feedback.md`.
3. Synthesize learnings:
   - What did we learn about the problem domain?
   - What worked well / poorly in the plan?
   - What surprised us during implementation?
   - What would we do differently?
4. Write `completion/learnings.md` for the slice.
5. Roll up to top-level `learnings.md` — add a new block (newest first) with a brief summary and link to the per-slice file.
6. Propose architecture updates: if implementation revealed something that should change the canonical architecture (new subsystem, different data model, changed API contract), surface each proposed change with rationale and ask for confirmation before updating any `architecture/` file.
7. Review remaining unimplemented slices: read each `goal.md` and ask — does anything we learned warrant updating this goal? Are any new slices or side quests needed?
8. Ask: "Do you want a cleanup/refactor pass before moving to the next slice?"
9. Update `state.md` and `flow-log.jsonl`.

## Success Criteria

Run after completing the `start-project` slice implementation:

- `vertical-slices/01-start-project/completion/learnings.md` exists with substantive content
- `.project/learnings.md` has a new block at the top referencing the per-slice file
- Any proposed architecture updates are surfaced clearly with rationale — not silently applied
- Remaining slice goals are reviewed and any warranted updates are proposed
- Running `/project-status` after completion recommends the next slice as the active work
