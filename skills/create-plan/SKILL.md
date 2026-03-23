---
name: create-plan
description: >
  Takes a slice or side quest goal and produces a complete plan.md in the format
  expected by /refine-plan and /implement-plan. Interactive: asks questions, researches
  dependencies, flags architectural changes, detects stale assumptions via git dates,
  and loads two-layer architecture (current + epic target) for context-aware planning.
  Requires idea.md + goal.md for the slice.
  Common triggers: 'create a plan', 'write a plan', 'plan this slice', 'let's plan',
  'create plan', 'make a plan for'.
---

# Create Plan

Interactive dialogue that takes a slice or side quest goal and produces a complete plan through structured conversation. Asks questions, researches dependencies, detects architectural changes, and iteratively builds the plan. Re-entrant — detects existing plans and offers overwrite/revise/cancel.

## Step 1 — Load References

Use the Read tool to load (paths relative to this skill's directory):

- `references/plan-format.md` — plan structure, templates, size guidelines
- `references/guidance.md` — scope resolution, context loading, Q&A strategy, research, architectural change detection, graceful stop
- `~/.claude/skills/_shared/references/decisions-format.md` — decisions format and Loading Protocol

## Step 2 — Determine Scope

1. **Argument passed**: if a path, use its parent directory as scope (works for `slices/`, `side-quests/`, and `epics/__active__*/slices/`). If a name, resolve via `.project/slices/`, `.project/side-quests/`, or `.project/epics/__active__*/slices/`.

2. **No argument**: read `.project/state.md` for the active slice.

3. **No argument and no active slice**: scan `.project/slices/` and `.project/epics/__active__*/slices/` for the first directory with `goal.md` AND (`explore-complete.md` or `explore-skipped.md`) but no `plan.md`/`plan/`. If none found, fall back to slices with `goal.md` but no explore marker — use AskUserQuestion: "This slice hasn't completed exploration — plan it anyway?" If still ambiguous, use AskUserQuestion to choose.

4. Read the scope's `goal.md`. If absent, tell the user and stop.

5. **Re-entry check**: if `plan.md` or `plan/` already exists in the scope directory, use AskUserQuestion: "A plan already exists. Overwrite / Revise existing / Cancel". If "Revise existing": load existing plan, present it, allow targeted edits. Check for downstream artifacts (`plan-refined.md`, `plan-refining.md`, `refinement/`, `implementation/`) before overwriting — warn if found.

## Step 3 — Load Context

Read (skip missing):

1. `.project/idea.md`
2. `.project/conventions.md`
3. **Load architecture** (scope-dependent):
   - **Epic slices**: Load the epic's own `architecture/` as primary (target state), `.project/architecture/` as secondary (current reality).
   - **Side quests**: Load `.project/architecture/` as primary. If an active epic exists at `.project/epics/__active__*/architecture/`, read its `_overview.md` and present: "Planning against current architecture. Active epic [name] is targeting [brief summary] — check for compatibility."
   - **No active epic**: Load `.project/architecture/` only.
   - For whichever architecture directory is primary: start with `_overview.md`. If more than 8 files, read `_overview.md` and `conventions.md` in full, first 30 lines of each remaining file.
4. **Maturity extraction**: Extract the `## Subsystem Maturity` table from the primary architecture's `_overview.md`. If no maturity table exists, skip maturity-aware behavior in Step 4. Also check for a `## Maturity Note` section in the loaded `goal.md` — treat this as an additional maturity signal (written by `/create-slices` for slices touching maturing+ subsystems).
5. `.project/learnings.md`
6. **Sequencing**: If the scope is an epic slice, load `.project/epics/__active__<name>/slices/sequencing.md` first. Fall back to `.project/slices/sequencing.md`.
7. Other slice `goal.md` files — for dependency and ordering context
8. Existing research: `.project/research/` (project-level) and scope's `research/`
9. Scope's `brainstorm/` directories
10. **Test infrastructure detection**: Check for test directories (`test/`, `tests/`, `__tests__/`, `spec/`), test config files (`jest.config.*`, `vitest.config.*`, `pytest.ini`, `pyproject.toml` with `[tool.pytest]`, `.mocharc.*`, `karma.conf.*`), and test scripts in `package.json`. Record whether formal test infrastructure exists — this informs Expected Behavior guidance in Step 4.

### 3b. Stale Assumption Detection

Follow the Stale Assumption Detection Algorithm in `~/.claude/skills/_shared/references/epic-conventions.md`.

When staleness is detected: present the specific architecture changes (use `git diff` or `git log` to show what changed) and ask the user to confirm the goal still applies or update it before proceeding with planning.

Present: "Loaded: [files]. Slice context: [goal.md summary]. Missing: [list or 'nothing']."

## Step 4 — Interactive Planning

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

### 4a. Restate & confirm

Restate goal from goal.md and summarize loaded context. Use AskUserQuestion: "Does this capture what we're planning?" / "I have corrections". Only after confirmation, ask initial clarifying questions about anything unclear or ambiguous.

### 4b. Propose phase breakdown

Present phase names and one-line objectives. Use AskUserQuestion: "Does this phasing make sense?" / "I have changes". Iterate until approved.

### 4c. Per-phase deep dive

For each phase:

1. **Present phase context first**: Before asking any questions, state the phase name, its objective (from 4b), and how it connects to the prior phase. Example: "**Phase 2: Data Layer** — Goal: set up the database schema and seed data. This builds on Phase 1's project scaffolding." Then lead with outcome questions: "What should be observable when this phase is done that isn't true now?" and "How would you verify that right now, before any code is written?" Then ask about implementation approach, technology choices, integration points, and error handling.
2. Follow up immediately if answers raise new questions.
3. **Research dependencies** as they surface: check `.project/research/` and scope's `research/` first. Only research what's new or stale. Spawn sub-agents using the Agent tool (model: "opus") with WebSearch and Context7 MCP tools. Save to scope's `research/` with header: `# <Topic>\n\nResearched: <date> | Source: <tool>\n\n---`. Present findings summary before incorporating.
4. After each phase: show progress ("Phase 2 of 5 fleshed out. Moving to Phase 3: [name].") and offer a natural pause point.

### 4c2. Architectural change detection

Throughout Steps 4a-4c, compare the emerging plan against architecture files.

**Flag** (cross-boundary): new/removed subsystems, API changes between systems, communication patterns, data contracts. Use AskUserQuestion to confirm before incorporating.

**Skip** (internal): refactoring internals, private helpers, algorithm changes.

Also flag technical debt: shortcuts, deferred refactoring, non-scaling patterns. Propose refactors when appropriate.

**Maturity-aware planning** (requires maturity table from Step 3 sub-step 4):

Use the maturity table (and any `## Maturity Note` from goal.md) to identify subsystems at Maturing or Foundational maturity. If the plan modifies a subsystem at **Maturing** maturity: (1) add a task: "Update fitness function in [test file] to cover [changed behavior]", (2) add migration steps for dependents if the plan changes the subsystem's public API, (3) reference the architecture proposal justification for epic slices. If the plan modifies a subsystem at **Foundational** maturity: all of the above, plus for **side quests only** use AskUserQuestion: "This side quest modifies [subsystem], a Foundational subsystem. Options: (a) Continue as side quest, (b) Rescope as epic, (c) Cancel planning." Only Foundational triggers the epic re-scoping suggestion — Maturing requires fitness function and migration steps but does not suggest re-scoping. For **epic slices** touching Foundational subsystems: require fitness function tasks, migration steps, and reference the epic's architecture proposal justification. Do NOT trigger the epic re-scoping AskUserQuestion — the slice is already part of an epic.

### 4c3. Record durable decisions

Throughout Steps 4a-4c, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Run `mkdir -p .project/decisions/` before the first write. Write in the format specified by `decisions-format.md`. Track all decisions written during this run and summarize them in Step 8 (Done Summary).

### 4d. Readiness gate

Re-load `references/guidance.md` (may have left context during long session). Check: every phase has objective, Expected Behavior (with concrete before/after checks), task list, verification steps, no open questions, no unnecessary complexity (evaluate each phase: is there a simpler approach that achieves the same outcome? Flag over-engineered abstractions, premature generalization, or custom implementations where well-maintained libraries exist). Note any approved architectural changes. Use AskUserQuestion: "Ready to draft the plan?" / "More to discuss".

### Graceful stop (Steps 4-6)

Trigger phrases: "that's enough", "stop here", "let's stop".

- **No plan.md written** (regardless of research files): reload `~/.claude/skills/_shared/references/state-and-activity-formats.md`, don't touch state.md or activity-log. Research files alone don't change state.
- **plan.md written**: reload `~/.claude/skills/_shared/references/state-and-activity-formats.md`, normal state update (Step 7).

## Step 5 — Draft and Approve

1. Re-load `references/plan-format.md` (session may be long).
2. Assemble the complete plan from the conversation.
3. For plans with 4+ phases: present overview + first 2 phases, then remaining phases.
4. If draft exceeds ~300 lines, split into directory format proactively.
5. Iterate on corrections.
6. Use AskUserQuestion for final approval: "Looks good — write it" / "I have more changes".

## Step 6 — Write Plan

Write to scope directory:

- **Single file**: `<scope_dir>/plan.md`
- **Directory**: `<scope_dir>/plan/` with `_overview.md` + numbered phase files

## Step 6b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 7 — Write Back State

Re-load `~/.claude/skills/_shared/references/state-and-activity-formats.md` (session may be long).

Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`

If state.md does not exist, create it using the Write tool.

Update `.project/state.md` using the 4-section format from the shared formats reference. Set:
- Current Phase: `create-plan complete — plan written for <scope>`
- Active Slice: the scope path
- Work Stack: unchanged
- Next Step: `/refine-plan` on the plan just written

Append to `.project/activity-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"create-plan","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/activity-log.jsonl
```

## Step 8 — Done Summary

Present: plan location, phase count, research files written during this session, recommended next step (`/refine-plan`).

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and stop.
