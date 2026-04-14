# Plan Format Convention

Plans must be compatible with `/gp:plan-slice` (refinement) and `/gp:implement`. Two formats exist based on size.

## Goal Clarity

Every plan starts with a clear goal statement. `/gp:plan-slice` confirms this with the user before reviewing. The goal should state what the plan accomplishes when implemented — not the process of planning itself.

## Slug Derivation

Kebab-case, 2-4 words from the plan name (e.g., `user-auth`, `api-refactor`). Used for commit messages (`[<slug>] Phase N: ...`) and directory naming.

## Self-Containment

The plan plus codebase should be enough for reviewers and implementers. No implicit knowledge — if something matters, write it down.

## Checkbox Semantics

- `[ ]` — pending task
- `[x]` — completed task

`/gp:implement` checks these off as phases complete. `/gp:plan-slice` uses them to detect completion status.

## Size Guideline

- Under ~300 lines: single file
- Over ~300 lines: directory format

If a plan grows past ~300 lines during drafting, split proactively.

## Single-File Format

Write to `<scope_dir>/plan.md`:

```markdown
# Plan: <Title>

## Overview

<What this plan accomplishes. 1-3 paragraphs covering goal, approach, key decisions.>

## Phase 1: <Phase Name>

<One-line objective for this phase.>

### Expected Behavior

<What should be observable when this phase is complete.>

**Before implementation** (should fail / show absence):
- [ ] <Concrete check with specific expected failure output>

**After implementation** (should pass / show presence):
- [ ] <Same check with specific expected success output>

### Tasks

- [ ] <Concrete task description>
- [ ] <Another task>

### Verification
<Additional integration/smoke checks beyond Expected Behavior — multi-phase concerns, performance, etc.>

## Phase 2: <Phase Name>

<Objective>

### Expected Behavior

<What should be observable when this phase is complete.>

**Before implementation** (should fail / show absence):
- [ ] <Concrete check with specific expected failure output>

**After implementation** (should pass / show presence):
- [ ] <Same check with specific expected success output>

### Tasks

- [ ] <Task>

### Verification
<Additional integration/smoke checks beyond Expected Behavior — multi-phase concerns, performance, etc.>
```

## Directory-Based Format

Write to `<scope_dir>/plan/`:

**`_overview.md`**:
```markdown
# Plan: <Title>

## Overview

<What this plan accomplishes. 1-3 paragraphs covering goal, approach, key decisions.>

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | <name> | <one-line description> |
| 02 | <name> | <one-line description> |
```

**`01-phase-name.md`**:
```markdown
# Phase 1: <Phase Name>

<One-line objective for this phase.>

### Expected Behavior

<What should be observable when this phase is complete.>

**Before implementation** (should fail / show absence):
- [ ] <Concrete check with specific expected failure output>

**After implementation** (should pass / show presence):
- [ ] <Same check with specific expected success output>

### Tasks

- [ ] <Concrete task description>
- [ ] <Another task>

### Verification
<Additional integration/smoke checks beyond Expected Behavior — multi-phase concerns, performance, etc.>
```

## Heading Levels

Single-file plans use `## Phase N:` (H2 under the plan's `# Plan:` H1). Directory phase files use `# Phase N:` (H1, since each file is standalone).

## Downstream Naming

`/gp:plan-slice` creates a `-refining` working copy, then produces a `-refined` final copy of the plan.

## Phase Structure Requirements

Every phase needs:
1. **Objective** — one line stating what this phase accomplishes
2. **Expected Behavior** — before/after checks defining observable outcomes. Each check specifies what to run, what failure looks like (before), and what success looks like (after). Before checks must be falsifiable — they test something that doesn't exist yet or should fail in the current state. Include test data/fixture setup where verification depends on state.
3. **Task list** — `[ ]` checkboxes, concrete and actionable
4. **Verification** — additional integration/smoke checks beyond Expected Behavior (multi-phase concerns, performance, broader regression). This is for plan-author-specified checks only; automated suites (lint/build/test) run automatically as a separate step during implementation.

Phases should be independently reviewable with clear boundaries between them.

## Expected Behavior Edge Cases

**Refactoring phases**: Before checks *pass* (regression anchors). After checks confirm the same behavior holds plus structural assertions (e.g., "module Y has no imports from Z"). The red state is the structural assertion.

**Pure documentation/configuration**: Use file-level checks ("Before: file X doesn't exist. After: file X exists with content Y"). Red-green still applies at the file level.

## v2 Chunk Format

When plans are consumed by `/gp:implement-slice` (v2), each Expected Behavior section should declare chunks for the TDD lifecycle. Chunks are the unit of implementation — each chunk has a RED test, implementation, and GREEN verification.

Within the Expected Behavior section, declare chunks using this format:

```yaml
chunks:
  - id: short-kebab-case-id
    description: "What this chunk implements"
    expectation: "What changes after implementation"
    redTest: "What should fail before implementation (the RED test)"
    verificationType: live | supplementary-tests | impossible-with-reason
    dependencies: [other-chunk-id]  # optional — chunks this depends on
```

**Field descriptions:**
- `id`: Short kebab-case identifier (e.g., `add-rubric-path-arg`, `update-barrel-exports`)
- `description`: What the chunk implements (1-2 sentences)
- `expectation`: Observable change after implementation
- `redTest`: Concrete check that should FAIL before implementation — the implement-phase agent writes and runs this test first
- `verificationType`: How this chunk will be verified:
  - `live` — execute and observe (default)
  - `supplementary-tests` — run test suite
  - `impossible-with-reason` — requires user decision (chunk-unverifiable flow)
- `dependencies`: Array of chunk IDs this chunk depends on (orchestrator resolves execution order via topological sort)

The plan extractor parses these chunks for the `chunk-start` command. The implement-slice orchestrator uses the dependency graph to determine execution order.
