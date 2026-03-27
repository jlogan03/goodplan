# Slice Goal: `/define-slices`

## What We're Building

A skill that reviews all available project context and defines an ordered set of vertical slices, each with concrete and verifiable success criteria. Re-entrant — can be used to add new slices or revise existing ones as the project evolves.

## Behavior

1. Read `idea.md`, `architecture/`, `conventions.md`, `learnings.md` (if exists), and any existing `vertical-slices/sequencing.md` and slice `goal.md` files.
2. Propose an initial set of slices with ordering rationale — grounded in the architecture, delivering testable user value end-to-end, sequenced so each slice builds on the last.
3. For each slice, work with the user to define:
   - **What it delivers** — the user-visible capability
   - **Success criteria** — concrete and verifiable: run a script, call an API and inspect the response, load a web app and interact with it via browser, execute a function and check output. Not just "tests pass."
   - **Scope boundaries** — what's explicitly in and out
   - **Dependencies** — which other slices or side quests must come first
4. Iterate until the user is satisfied with the full set and ordering.
5. Write `vertical-slices/sequencing.md` with the ordered list, rationale, and dependencies.
6. Write `vertical-slices/<name>/goal.md` for each slice.
7. Update `state.md` and `flow-log.jsonl`.

## Success Criteria

Run on this repo after `define-architecture` completes:

- `sequencing.md` exists with a clear ordering and rationale for each slice
- Each slice has a `goal.md` with success criteria that are concretely verifiable (not vague)
- The slice set covers the full scope in `idea.md` without obvious gaps
- Running the skill a second time (to add a new slice mid-project) correctly integrates the new slice without disrupting existing ones
