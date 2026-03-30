# Side Quest: Task Capture

## What We're Building

A lightweight task capture system — a place to jot down anything you notice while working that you don't want to forget but don't want to act on right now. Tasks are unsorted, uncategorized raw notes: bugs, improvements, chores, feature ideas, things that might become epics, things that might become side quests. You don't know yet and that's the point.

## Motivation

When working in a project, you constantly notice things: "this error handling is wrong," "we should support X," "that config is getting unwieldy." Today, either you stop what you're doing and act on it, or you forget. Most of these don't need immediate action — they need to be remembered so you can later scan through them, see patterns, and decide what's worth bundling into an epic or a side quest.

This is the "junk drawer" that feeds the planning process. No categorization up front, no commitment to scope — just capture the thought and move on.

## What Changes

### New Commands

- **`task:create`** — Capture a task. Accepts a title and optional description via stdin. Writes a minimal entry. Fast — no interactive Q&A, no classification, just record the thought.
- **`task:list`** — List all captured tasks with titles and creation dates.
- **`task:show --task <slug>`** — Show a single task's full content.
- **`task:convert --task <slug> --to epic|quest`** — Convert a task into an epic or side quest by feeding it into `/create-epic` or quest creation, then marking the task as converted.
- **`task:drop --task <slug> --reason <text>`** — Mark a task as dropped (not worth doing). Keeps the record but removes it from the active list.

### New Directory

- `.project/tasks/` — Stores captured tasks as simple markdown files (`<slug>.md`).

### Task File Format

Minimal frontmatter + freeform content:

```markdown
---
title: <title>
captured: <ISO date>
status: open | converted | dropped
convertedTo: <epic or quest name, if converted>
droppedReason: <reason, if dropped>
---

<optional description, context, motivation — whatever you want to jot down>
```

### Integration Points

- `/create-epic` should accept a pre-existing task file as input so conversion is seamless.
- `/project-status` should mention open task count (e.g., "7 tasks captured").
- During `/create-slices` or `/create-epic`, the task list could be consulted to see if any captured tasks are relevant to the work being planned (stretch goal, not required).

## Dependencies

- Slices 05 (commands-read) and 06 (commands-mutate) should be complete first so the command infrastructure exists.

## Success Criteria

- [ ] Can capture a task with a title and optional description in one command
- [ ] Tasks stored in `.project/tasks/` as simple markdown files
- [ ] Can list all open tasks
- [ ] Can show a single task's details
- [ ] Can convert a task into an epic or side quest
- [ ] Can drop a task with a reason
- [ ] Converted/dropped tasks don't show in the default list
- [ ] `/project-status` reports open task count
- [ ] Capture flow is fast — no interactive Q&A, no classification, just record the thought

## Scope Boundaries

**In scope**: Capture, list, show, convert, drop commands; task file format; integration with `/create-epic`, quest creation, and `/project-status`

**Out of scope**: Prioritization or ranking; tagging or categorization; automatic bundling suggestions; linking tasks to existing epics or quests
