# Guidance

## Context Loading

Follow SKILL.md Step 2 for the full context loading sequence and ordering.

## Grounding in Architecture

Map each slice to architecture subsystems/flows from `_overview.md`. Align slice boundaries with subsystem boundaries. No architecture? Ground in idea.md scope/constraints.

## Success Criteria & Verification Quality Bar

The defining characteristic of a slice is that it delivers a complete end-to-end flow verifiable by actually running the code — not just by unit or integration tests.

**Success Criteria:** Every criterion must specify **what to run** + **expected outcome**. Reject vague ("works correctly", "tests pass"). Example: "Run `curl -s localhost:3000/api/health | jq .status` — returns `\"ok\"`".

**Verification:** Each goal.md must include a Verification section describing the minimum live end-to-end testing the implementing agent should perform. Think: what would a human do to convince themselves this actually works? Write that down. Include the happy path, at least one edge case, and any error handling that matters.

## Re-entry Handling

Three modes when existing slices detected:
- **Add** — new slices only, next available NN. Merge into sequencing.md at appropriate positions.
- **Revise** — check for downstream artifacts (`plan.md`, `plan-refined.md`, `refinement/`, `implementation/`). Warn if exist. Only sequencing.md and goal.md overwritten.
- **Start Fresh** — overwrite existing.

## CLAUDE.md Update

Add sequencing.md to Project Context. **Idempotency:** skip if already referenced with the correct path. If referencing a stale path (e.g., `.goodplan/slices/sequencing.md` when slices are now inside an epic), update the path.

Read `../../create-architecture/references/guidance.md` for full Project Context format and the three cases (no CLAUDE.md / no section / existing section).

Add this line to the "Read these" list (using the resolved `$SLICES_DIR`):
```
- `$SLICES_DIR/sequencing.md` — slice ordering and dependencies
```

**Migration:** Check for and replace any stale `.goodplan/slices/sequencing.md` reference with the epic-scoped path.

## Graceful Stop

Stops leave artifacts in place — no state writes. The written artifact files serve as resume markers.

- **(a) No files written** — tell user nothing was written. Stop.
- **(b) sequencing.md only** — update CLAUDE.md to reference sequencing.md. No CLI submit. Stop.
- **(c) sequencing.md + goal.md files** — update CLAUDE.md to reference sequencing.md. No CLI submit. Stop.

All paths use `$SLICES_DIR` resolved in Step 0.

## Naming

Directories: `NN-kebab-name/` (NN = two-digit). Side quests have no prefix.

## Tracer Bullet Framing

See SKILL.md Step 4 for Tracer Bullet Framing criteria.

## Three-Lens Evaluation

See SKILL.md Step 4b for the Three-Lens Evaluation criteria.

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

## Verification
- [ ] <What to run> — <expected outcome>
- [ ] <What to run> — <expected outcome>

<Minimum live end-to-end verification the implementing agent must perform.
Describe what to run, what to interact with, and what to check — as if
explaining to a human tester. Include happy path + at least one edge case.
This is NOT unit tests — it's running the actual system and confirming it works.>

## Scope Boundaries
**In scope:** <what this slice includes>
**Out of scope:** <what is deferred>

## Maturity Note
<!-- Include only when the slice touches subsystems at Maturing or Foundational maturity. Omit this entire section for Experimental or Developing subsystems — Developing does NOT trigger a Maturity Note despite its "changes should be deliberate" protocol. -->
```
