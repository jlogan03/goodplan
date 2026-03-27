# Guidance

## Scope Resolution

1. **Argument**: resolve path (parent dir = scope) or name. Use `goodplan status --json` → `.activeEpic` to find the epic name, then match in `.project/epics/<name>/slices/`, `.project/slices/`, or `.project/side-quests/`.
2. **No argument**: query `goodplan status --json`. Check `.activeSlice` for the active slice, `.activeQuest` for the active quest. If `.activeSlice` is present and `.activeEpic` exists, use `.project/epics/<activeEpic.name>/slices/<activeSlice.name>/`; if `.activeSlice` is present but no `.activeEpic`, use `.project/slices/<activeSlice.name>/`. If `.activeQuest` is present, use `.project/side-quests/<activeQuest.name>/`.
3. **Auto-detect**: use `goodplan status --json` → `.activeEpic` to determine the epic name (if any). If an active epic exists, scan `.project/epics/<name>/slices/` for the first dir with `goal.md` + (`explore-complete.md` or `explore-skipped.md`) but no `plan.md`/`plan/`. If no active epic, scan `.project/slices/`. This is the explore-gate.
4. **Fallback**: slices with `goal.md` but no explore marker — use AskUserQuestion to confirm planning without exploration.
5. **Ambiguous**: use AskUserQuestion to choose slice/quest.

## Context Loading

Read (skip missing): `.project/idea.md`, `conventions.md`, `architecture/` (`_overview.md` first; if >8 files, full read only `_overview.md` + `conventions.md`, 30 lines of rest), learnings via `goodplan learning:list --json`, `.project/decisions/` (follow Loading Protocol from `decisions-format.md`: glob `*.md`, skip superseded, flag `revisiting` to user), sequencing.md (for epic slices, load from `.project/epics/<epicName>/slices/sequencing.md` where `<epicName>` comes from `goodplan status --json` → `.activeEpic.name`; if no active epic, load `.project/slices/sequencing.md`), other slice `goal.md` files, `.project/research/` + scope's `research/`, scope's `brainstorm/`.

Follow SKILL.md Step 3 sub-step 4 for maturity table extraction and Maturity Note loading.

Present: "Loaded: [files]. Slice context: [summary]. Missing: [list or 'nothing']."

## Interactive Q&A Strategy

Build the plan through dialogue, not dump-then-approve.

- Restate goal, confirm understanding via AskUserQuestion tool before proposing.
- Propose phase names + one-line objectives. Get approval before deep-diving.
- Per-phase: **present phase name, objective, and connection to prior phase first** — give the user context before asking anything. Then lead with "What should be observable when this phase is done?" and "How would you verify that before any code is written?" Then ask about implementation, tech choices, integration, error handling. Follow up as needed.
- Focus on sub-agent uncertainty: ambiguous requirements, multiple approaches, API designs, data contracts.
- Show progress between phases. Offer pause points.

## Architectural Change Detection

Compare emerging plan against architecture files throughout.

**Flag** (cross-boundary): new/removed subsystems, API changes between systems, communication patterns, data contracts.
**Skip** (internal): refactoring internals, private helpers, algorithm changes.

Also flag tech debt: shortcuts, deferred refactoring, non-scaling patterns. Propose refactors.

Follow SKILL.md Step 4c2 for maturity escalation rules.

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

## Verification Repertoire

When writing Expected Behavior items, choose the most direct way to observe actual behavior:

| What you're building | Verification approach |
|---|---|
| API endpoint | `curl` / `httpie` — hit the endpoint, check response |
| Web UI | Chrome integration — navigate, interact, observe |
| CLI tool / script | Run with args, check stdout/stderr/exit code |
| Library / module | Write a small script that imports and exercises the function |
| Background job | Trigger the job, check side effects (DB state, files, logs) |
| Docker-based service | `docker compose up`, verify service responds |
| Data pipeline | Feed input, check transformed output |
| Configuration change | Start service, confirm config picked up |
| Database schema | Run query to confirm structure |
| Database migration | Bring up DB with old schema + test data, run migration, verify new schema and data integrity |

**Verify at the point of use, not the point of implementation.** Don't just check that a function exists — exercise it through the same interface a user would. Set up necessary test data/fixtures first — verification against empty state proves nothing.

Each before-check must specify what failure looks like (e.g., "returns 404", "connection refused", "test not found"), not just "should fail".

## Test Infrastructure Suggestion

If test infrastructure detection (the "Test infrastructure detection" sub-step in SKILL.md Step 3) found no test setup, and the plan involves code that would benefit from it (libraries, APIs, data pipelines, background jobs), suggest adding test infrastructure as Phase 0 or part of Phase 1. This is a suggestion — the user decides.

When test infrastructure exists, Expected Behavior items should include both formal tests and live verifications. When it doesn't, Expected Behavior items are live verifications only. The red-green discipline applies regardless.

## Stale Assumption Detection

Follow the Stale Assumption Detection Algorithm in `../../_shared/references/epic-conventions.md`.

When staleness is detected during create-plan: present the specific architecture changes (use `git diff` or `git log` to show what changed) and ask the user to confirm the goal still applies or update it before proceeding with planning.

## Two-Layer Architecture

Architecture lives in two layers (see `../../_shared/references/epic-conventions.md` for full details):

| Layer | Location | Represents |
|---|---|---|
| **Top-level** | `.project/architecture/` | Current reality — what the repo looks like now |
| **Epic** | `epics/<name>/architecture/` | Target state — where the active epic is headed |

**Which layer to plan against depends on scope**:

- **Epic slices**: Plan against the epic's `architecture/` (target state). Use top-level as secondary context for current reality.
- **Side quests**: Plan against top-level `.project/architecture/` (current reality). Detect the active epic via `goodplan status --json` → `.activeEpic`. If an active epic exists, read its `_overview.md` at `.project/epics/<activeEpic.name>/architecture/_overview.md` and note what it's targeting — check that the side quest plan is compatible and won't conflict with the epic's direction.
- **No active epic**: Only top-level exists; plan against it.

**Compatibility check for side quests**: When an active epic has architecture files (detected via `goodplan status --json` → `.activeEpic`), present: "Planning against current architecture. Active epic [name] is targeting [summary] — check for compatibility." Flag any conflicts between the side quest plan and the epic's target.

## CLAUDE.md

No update needed.

## Graceful Stop

Trigger phrases: "that's enough", "stop here", "let's stop".

- **(a) No plan.md written** (includes partial drafts not yet saved to disk) — no state writes needed. Research files alone don't change state. Stop.
- **(b) plan.md written** — proceed to CLI submit (Step 7). The CLI handles state transitions and activity recording.

## When to Split

Over ~300 lines: convert to directory format before writing. See `plan-format.md`.
