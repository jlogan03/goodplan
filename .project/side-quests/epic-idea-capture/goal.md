# Side Quest: Epic Idea Capture

## What We're Building

Lightweight commands for capturing, listing, and converting epic ideas — future directions that are too large for a side quest but don't need the full epic definition process right away. This lets you jot down an idea mid-flow without breaking context, then flesh it out later.

## Motivation

When working in a project, you often realize "we should also do X" where X is epic-sized. Today, either you stop everything and go through `/create-epic`, or you forget the idea. This side quest adds a lightweight capture-first workflow: record the idea with minimal friction, review captured ideas later, and convert one into a real epic when you're ready.

## What Changes

### New Commands

- **`epic idea <title>`** (or similar) — Capture an epic idea. Accepts a title and optional description. Writes a minimal file to a new `epics/ideas/` directory (e.g., `epics/ideas/<slug>.md`). No architecture, no slices — just the seed of the idea.
- **`epic ideas`** — List all captured epic ideas with their titles and creation dates.
- **`epic idea convert <slug>`** — Convert a captured idea into a real epic by feeding it into the `/create-epic` flow, then archiving or removing the idea file.

### New Directory

- `epics/ideas/` — Stores captured epic ideas as simple markdown files.

### Idea File Format

Minimal frontmatter + freeform content:

```markdown
---
title: <title>
captured: <ISO date>
---

<optional description, context, motivation — whatever the user wants to jot down>
```

### Integration Points

- The `/create-epic` skill should accept a pre-existing idea file as input so conversion is seamless.
- `/project-status` should mention captured ideas (e.g., "3 epic ideas captured").

## Dependencies

- Slices 05 (commands-read) and 06 (commands-mutate) should be complete first so the command infrastructure exists.

## Success Criteria

- [ ] Can capture an epic idea with a title and optional description in one command
- [ ] Ideas stored in `epics/ideas/` as simple markdown files
- [ ] Can list all captured ideas
- [ ] Can convert an idea into a real epic via `/create-epic`
- [ ] Converted ideas are archived or removed
- [ ] `/project-status` reports captured idea count
- [ ] Capture flow is fast — no interactive Q&A, no architecture, just record the thought

## Scope Boundaries

**In scope**: Capture, list, convert commands; idea file format; integration with `/create-epic` and `/project-status`

**Out of scope**: Prioritization or ranking of ideas; linking ideas to existing epics; idea templates beyond minimal frontmatter
