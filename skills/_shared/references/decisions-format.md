# Decisions Format

Shared reference for recording durable project decisions.

## Directory

`.project/decisions/` — created on first write. Skills must `mkdir -p` before writing.

## File Naming

`<YYYY-MM-DD>-<slug>.md`

- Slug: kebab-case, 2–5 words
- Example: `2026-03-17-adopt-event-sourcing.md`

## File Format

```markdown
# Decision: <Title>

**Status**: active | superseded by [<link>] | revisiting
**Date**: <YYYY-MM-DD>
**Domain**: <optional — architecture | slicing | implementation | infrastructure | ...>
**Context**: <phase/skill that prompted this, e.g., "create-architecture for project X">

## Decision
<What was decided — one clear statement>

## Rationale
<Why this, not the alternatives. Include alternatives considered.>

## Consequences
<What this decision enables or constrains going forward>
```

## Decision Threshold

A "durable decision" is one worth recording. The test:

- Reversing it would require changes across multiple files or phases
- It constrains or enables future work (e.g., tech stack choices, API contracts, data models)

**Examples of decisions**: "Use PostgreSQL for persistence", "Event-driven communication between services", "Monorepo structure"

**Not decisions**: "Name this variable X", "Use a helper function here", "Refactor this loop"

## Status Lifecycle

| Status | Meaning | Agent behavior |
|---|---|---|
| `active` | Current, should be followed | Load and respect |
| `superseded by [<link>]` | Replaced by a newer decision | Follow the link to the replacement; skip this file |
| `revisiting` | Under active reconsideration | Flag to user when loading |

**Transitions**:

- Any skill encountering a relevant decision can set `revisiting` (with user confirmation).
- Resolution: either back to `active` with updated rationale, or `superseded` by a new decision.
- The skill that initiated `revisiting` is responsible for resolving it before completing.

## Loading Protocol

1. Glob `.project/decisions/*.md`
2. Skip files with `Status: superseded` (follow the link to the replacement instead)
3. Flag files with `Status: revisiting` to the user
4. Load remaining active decisions as context alongside architecture files

## Confirmation Requirement

Agent must always propose decision text and get user confirmation before writing to `.project/decisions/`. Never auto-write decisions.

## Extension Policy

Additive fields (new optional metadata) are safe to add. Format changes that alter existing fields require updating all consumer skills.

## Writer / Reader Lists

**Writers** (skills that create/update decision files): `/explore`, `/create-architecture`, `/create-slices`, `/create-plan`, `/complete`, `/refine-architecture`, `/audit-architecture`

**Readers** (skills that load active decisions as context): all writers plus `/project-status`, `/create-epic`, `/refine-plan`, `/implement-plan`
