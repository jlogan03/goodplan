# Guidance

## Context Loading

Read in order (stop if idea.md missing):
1. `.project/idea.md` — required
2. `.project/conventions.md` — recommend `/define-architecture` if absent
3. `.project/architecture/_overview.md` + other arch files — warn if absent
4. `.project/learnings.md` — if exists
5. Existing slices: `ls .project/vertical-slices/sequencing.md .project/vertical-slices/*/goal.md 2>/dev/null`

## Grounding in Architecture

Map each slice to architecture subsystems/flows from `_overview.md`. Align slice boundaries with subsystem boundaries. No architecture? Ground in idea.md scope/constraints.

## Success Criteria & Verification Quality Bar

The defining characteristic of a vertical slice is that it delivers a complete end-to-end flow verifiable by actually running the code — not just by unit or integration tests.

**Success Criteria:** Every criterion must specify **what to run** + **expected outcome**. Reject vague ("works correctly", "tests pass"). Example: "Run `curl -s localhost:3000/api/health | jq .status` — returns `\"ok\"`".

**Verification:** Each goal.md must include a Verification section describing the minimum live end-to-end testing the implementing agent should perform. Think: what would a human do to convince themselves this actually works? Write that down. Include the happy path, at least one edge case, and any error handling that matters.

## Re-entry Handling

Three modes when existing slices detected:
- **Add** — new slices only, next available NN. Merge into sequencing.md at appropriate positions.
- **Revise** — check for downstream artifacts (`plan.md`, `plan-refined.md`, `refinement/`, `implementation/`). Warn if exist. Only sequencing.md and goal.md overwritten.
- **Start Fresh** — overwrite existing.

## CLAUDE.md Update

Add sequencing.md to Project Context. **Idempotency:** skip if already referenced.

Read `~/.claude/skills/define-architecture/references/guidance.md` for full Project Context format and the three cases (no CLAUDE.md / no section / existing section).

Add this line to the "Read these" list:
```
- `.project/vertical-slices/sequencing.md` — slice ordering and dependencies
```

## Graceful Stop

- **(a) No files written** — don't touch state.md or flow-log.
- **(b) sequencing.md only** — load formats.md. State: `define-slices in-progress — stopped after writing sequencing.md`. Flow-log: `"status":"started"`.
- **(c) sequencing.md + goal.md files** — load formats.md. State: `define-slices in-progress — stopped after writing sequencing.md, <list>`. Flow-log: `"status":"started"`.

## Naming

Directories: `NN-kebab-name/` (NN = two-digit). Side quests have no prefix.

## Templates

### sequencing.md

```markdown
# Slice Sequencing

## Rationale
<Why this ordering>

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | slice-name | One-line description | None | Why here |
| 02 | next-slice | One-line description | 01-slice-name | Why after 01 |
```

### goal.md

```markdown
# <Slice Name>

## What We're Building
<One paragraph: what this slice delivers and why.>

## Behavior
1. <Step-by-step: what the system does>
2. <Concrete and testable>
3. <Happy path and key edge cases>

## Success Criteria
- [ ] <What to run> — <expected outcome>
- [ ] <What to run> — <expected outcome>

## Verification
<Minimum live end-to-end verification the implementing agent must perform.
Describe what to run, what to interact with, and what to check — as if
explaining to a human tester. Include happy path + at least one edge case.
This is NOT unit tests — it's running the actual system and confirming it works.>

## Scope Boundaries
**In scope:** <what this slice includes>
**Out of scope:** <what is deferred>
```
