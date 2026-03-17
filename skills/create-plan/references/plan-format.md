# Plan Format Convention

Plans must be compatible with `/refine-plan` and `/implement-plan`. Two formats exist based on size.

## Goal Clarity

Every plan starts with a clear goal statement. `/refine-plan` confirms this with the user before reviewing. The goal should state what the plan accomplishes when implemented — not the process of planning itself.

## Slug Derivation

Kebab-case, 2-4 words from the plan name (e.g., `user-auth`, `api-refactor`). Used for commit messages (`[<slug>] Phase N: ...`) and directory naming.

## Self-Containment

The plan plus codebase should be enough for reviewers and implementers. No implicit knowledge — if something matters, write it down.

## Checkbox Semantics

- `[ ]` — pending task
- `[x]` — completed task

`/implement-plan` checks these off as phases complete. `/refine-plan` uses them to detect completion status.

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

### Tasks

- [ ] <Concrete task description>
- [ ] <Another task>

### Verification
<How to verify this phase is complete. What to run, what to check.>

## Phase 2: <Phase Name>

<Objective>

### Tasks

- [ ] <Task>

### Verification
<Verification steps>
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

### Tasks

- [ ] <Concrete task description>
- [ ] <Another task>

### Verification
<How to verify this phase is complete. What to run, what to check.>
```

## Heading Levels

Single-file plans use `## Phase N:` (H2 under the plan's `# Plan:` H1). Directory phase files use `# Phase N:` (H1, since each file is standalone).

## Downstream Naming

`/refine-plan` creates a `-refining` working copy, then produces a `-refined` final copy of the plan.

## Phase Structure Requirements

Every phase needs:
1. **Objective** — one line stating what this phase accomplishes
2. **Task list** — `[ ]` checkboxes, concrete and actionable
3. **Verification** — how the implementing agent confirms the phase works

Phases should be independently reviewable with clear boundaries between them.
