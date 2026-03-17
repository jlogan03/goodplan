# Guidance

## Scope Resolution

1. **Argument**: resolve path (parent dir = scope) or name (match in `vertical-slices/` or `side-quests/`).
2. **state.md**: if no argument, read active slice from `.project/state.md`.
3. **Auto-detect**: scan `.project/vertical-slices/` for first dir with `goal.md` + (`explore-complete.md` or `explore-skipped.md`) but no `plan.md`/`plan/`. This is the explore-gate.
4. **Fallback**: slices with `goal.md` but no explore marker — use AskUserQuestion to confirm planning without exploration.
5. **Ambiguous**: use AskUserQuestion to choose slice/quest.

## Context Loading

Read (skip missing): `.project/idea.md`, `conventions.md`, `architecture/` (`_overview.md` first; if >8 files, full read only `_overview.md` + `conventions.md`, 30 lines of rest), `learnings.md`, `.project/decisions/` (follow Loading Protocol from `decisions-format.md`: glob `*.md`, skip superseded, flag `revisiting` to user), `vertical-slices/sequencing.md`, other slice `goal.md` files, `.project/research/` + scope's `research/`, scope's `brainstorm/`.

Present: "Loaded: [files]. Slice context: [summary]. Missing: [list or 'nothing']."

## Interactive Q&A Strategy

Build the plan through dialogue, not dump-then-approve.

- Restate goal, confirm understanding via AskUserQuestion tool before proposing.
- Propose phase names + one-line objectives. Get approval before deep-diving.
- Per-phase: ask about implementation, tech choices, integration, error handling, testing. Follow up as needed.
- Focus on sub-agent uncertainty: ambiguous requirements, multiple approaches, API designs, data contracts.
- Show progress between phases. Offer pause points.

## Architectural Change Detection

Compare emerging plan against architecture files throughout.

**Flag** (cross-boundary): new/removed subsystems, API changes between systems, communication patterns, data contracts.
**Skip** (internal): refactoring internals, private helpers, algorithm changes.

Also flag tech debt: shortcuts, deferred refactoring, non-scaling patterns. Propose refactors.

## Research Integration

1. Check `.project/research/` and scope's `research/` first.
2. Only research what's new or stale.
3. Spawn sub-agents (Agent tool, model: "opus") per topic — use WebSearch and Context7 MCP tools.
4. Save to scope's `research/` with header: `# <Topic>\n\nResearched: <date> | Source: <tool>\n\n---`
5. No results: save stub with `Status: NO_RESULTS`.
6. Present findings summary before incorporating.

## Phase Design Principles

- Independently reviewable, clear boundaries, no circular dependencies
- Verification the implementing agent can execute
- Earlier phases don't depend on later ones

## CLAUDE.md

No update needed.

## Graceful Stop

Trigger phrases: "that's enough", "stop here", "let's stop".

- **(a) No plan.md written** (includes partial drafts not yet saved to disk) — don't touch state.md or flow-log. Research files alone don't change state.
- **(b) plan.md written** — reload `formats.md`, update state.md and flow-log normally.

## When to Split

Over ~300 lines: convert to directory format before writing. See `plan-format.md`.
