---
name: create-plan
description: >
  Takes a slice or side quest goal and produces a complete plan.md in the format
  expected by /refine-plan and /implement-plan. Interactive: asks questions, researches
  dependencies, flags architectural changes. Requires idea.md + goal.md for the slice.
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

1. **Argument passed**: if a path, use its parent directory as scope (works for `vertical-slices/` and `side-quests/`). If a name, resolve via `.project/vertical-slices/` or `.project/side-quests/`.

2. **No argument**: read `.project/state.md` for the active slice.

3. **No argument and no active slice**: scan `.project/vertical-slices/` for the first directory with `goal.md` AND (`explore-complete.md` or `explore-skipped.md`) but no `plan.md`/`plan/`. If none found, fall back to slices with `goal.md` but no explore marker — use AskUserQuestion: "This slice hasn't completed exploration — plan it anyway?" If still ambiguous, use AskUserQuestion to choose.

4. Read the scope's `goal.md`. If absent, tell the user and stop.

5. **Re-entry check**: if `plan.md` or `plan/` already exists in the scope directory, use AskUserQuestion: "A plan already exists. Overwrite / Revise existing / Cancel". If "Revise existing": load existing plan, present it, allow targeted edits. Check for downstream artifacts (`plan-refined.md`, `plan-refining.md`, `refinement/`, `implementation/`) before overwriting — warn if found.

## Step 3 — Load Context

Read (skip missing):

1. `.project/idea.md`
2. `.project/conventions.md`
3. All `.md` files in `.project/architecture/` (start with `_overview.md`). If more than 8 files: read `_overview.md` and `conventions.md` in full, first 30 lines of each remaining file.
4. `.project/learnings.md`
5. `.project/vertical-slices/sequencing.md`
6. Other slice `goal.md` files — for dependency and ordering context
7. Existing research: `.project/research/` (project-level) and scope's `research/`
8. Scope's `brainstorm/` directories

Present: "Loaded: [files]. Slice context: [goal.md summary]. Missing: [list or 'nothing']."

## Step 4 — Interactive Planning

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

### 4a. Restate & confirm

Restate goal from goal.md and summarize loaded context. Use AskUserQuestion: "Does this capture what we're planning?" / "I have corrections". Only after confirmation, ask initial clarifying questions about anything unclear or ambiguous.

### 4b. Propose phase breakdown

Present phase names and one-line objectives. Use AskUserQuestion: "Does this phasing make sense?" / "I have changes". Iterate until approved.

### 4c. Per-phase deep dive

For each phase:

1. Ask targeted questions: implementation approach, technology choices, integration points, error handling, testing strategy.
2. Follow up immediately if answers raise new questions.
3. **Research dependencies** as they surface: check `.project/research/` and scope's `research/` first. Only research what's new or stale. Spawn sub-agents using the Agent tool (model: "opus") with WebSearch and Context7 MCP tools. Save to scope's `research/` with header: `# <Topic>\n\nResearched: <date> | Source: <tool>\n\n---`. Present findings summary before incorporating.
4. After each phase: show progress ("Phase 2 of 5 fleshed out. Moving to Phase 3: [name].") and offer a natural pause point.

### 4c2. Architectural change detection

Throughout Steps 4a-4c, compare the emerging plan against architecture files.

**Flag** (cross-boundary): new/removed subsystems, API changes between systems, communication patterns, data contracts. Use AskUserQuestion to confirm before incorporating.

**Skip** (internal): refactoring internals, private helpers, algorithm changes.

Also flag technical debt: shortcuts, deferred refactoring, non-scaling patterns. Propose refactors when appropriate.

### 4c3. Record durable decisions

Throughout Steps 4a-4c, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Run `mkdir -p .project/decisions/` before the first write. Write in the format specified by `decisions-format.md`. Track all decisions written during this run and summarize them in Step 8 (Done Summary).

### 4d. Readiness gate

Re-load `references/guidance.md` (may have left context during long session). Check: every phase has objective, task list, verification steps, no open questions. Note any approved architectural changes. Use AskUserQuestion: "Ready to draft the plan?" / "More to discuss".

### Graceful stop (Steps 4-6)

Trigger phrases: "that's enough", "stop here", "let's stop".

- **No plan.md written** (regardless of research files): reload `~/.claude/skills/_shared/references/state-and-flow-formats.md`, don't touch state.md or flow-log. Research files alone don't change state.
- **plan.md written**: reload `~/.claude/skills/_shared/references/state-and-flow-formats.md`, normal state update (Step 7).

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

Re-load `~/.claude/skills/_shared/references/state-and-flow-formats.md` (session may be long).

Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`

If state.md does not exist, create it using the Write tool.

Update `.project/state.md` using the 4-section format from the shared formats reference. Set:
- Current Phase: `create-plan complete — plan written for <scope>`
- Active Slice: the scope path
- Work Stack: unchanged
- Next Step: `/refine-plan` on the plan just written

Append to `.project/flow-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"create-plan","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
```

## Step 8 — Done Summary

Present: plan location, phase count, research files written during this session, recommended next step (`/refine-plan`).

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and stop.
