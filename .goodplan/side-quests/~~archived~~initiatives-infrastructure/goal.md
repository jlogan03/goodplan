# Goal: Initiatives Infrastructure

## What

Add initiative support to the workflow skills. This includes creating/managing initiative directories, updating `/start-project` to create the first initiative, updating `/project-status` to understand initiatives, updating `/define-slices` to work within an initiative, and updating `/explore` and `/define-architecture` to work at the initiative level. Implements the two-layer architecture model where initiative architecture represents the target state and top-level architecture represents current reality.

## Why

Initiatives are the new primary container for large bodies of work (see `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md`). Skills need to understand the initiative directory structure, the `__active__` prefix convention, the initiative state machine, and how slices now live inside initiatives rather than at the project root.

## Key Design Decisions

### Two-Layer Architecture Model

- **Top-level `.project/architecture/`** = current reality (what the repo looks like right now)
- **Initiative `architecture/`** = target state (where we're heading when this initiative completes)
- `/complete-slice` and `/complete` for side quests update top-level architecture as work completes, so it always tracks reality incrementally
- Side quests read both: top-level (current) for planning, active initiative architecture (target) for compatibility
- Initiative architecture stays focused on what the initiative set out to do — it does NOT get updated when side quests change the top-level

### First Initiative

- Auto-named "initial" (no user prompt needed)
- `/start-project` creates `initiatives/__active__initial/goal.md` (derived from idea conversation)
- `/define-architecture` writes to the initiative's `architecture/` directory (not top-level)
- Top-level `.project/architecture/` gets a minimal scaffold indicating "no architecture built yet — see active initiative"
- Top-level architecture gets populated incrementally as slices complete
- No "pull the trigger" gate — first initiative is approved by definition
- Skips `architecture-proposal/` and `approved.md` entirely — the initiative's architecture IS the architecture, not a proposal

### Stale Assumption Detection

- When `/create-plan` or `/refine-plan` runs for a slice, it checks whether the top-level architecture has been modified since the slice's `goal.md` was written
- If it has changed (e.g., a side quest updated the current architecture), surface it: "The current architecture has changed since this slice's goal was written — does the goal or plan need updating?"

### Archive Numbering

- When archiving initiatives: `~~archived~~01_<name>`, `~~archived~~02_<name>`, etc.
- Number reflects completion order (count existing `~~archived~~` dirs to determine next number)
- Side quests optionally get the same treatment

## Success Criteria

1. `/start-project` creates `initiatives/__active__initial/` with `goal.md` alongside the project-level setup — does NOT create top-level `vertical-slices/`
2. `/project-status` understands initiative state machine — reports initiative phase, active initiative, and pending initiatives in exploration/proposal
3. `/define-slices` works within an initiative's `vertical-slices/` directory (not project root)
4. `/explore` can scope to an initiative (research/brainstorm/prototype within initiative directory)
5. `/define-architecture` writes to the initiative's `architecture/` directory; top-level gets a scaffold for the first initiative
6. Architecture proposal workflow supported for subsequent initiatives — `architecture-proposal/` directory, `approved.md`, `architecture-proposal-skipped.md`
7. `__active__` prefix applied when initiative is approved; only one `__active__` initiative at a time
8. State machine transitions from `workflow.md` "Per Initiative" section are correctly implemented
9. `state.md` and `flow-log.jsonl` updated to reference initiative scopes
10. Side quests reference both top-level architecture (current reality) and active initiative architecture (target) when planning
11. Stale assumption detection added to `/create-plan` and `/refine-plan` — checks if top-level architecture changed since goal was written

## Dependencies

- Quest: archived-prefix-migration (establishes `~~archived~~` convention used in initiative lifecycle)

## Out of Scope

- Initiative completion (handled by complete-rename quest)
- Maturity tracking in architecture files (handled by maturity-invariants-fitness quest)
- Maturity-aware behavior in existing skills (handled by maturity-context-loading quest)
