# Project Health Format

Canonical structure for `.project/project-health.md`. This is a living document that accumulates system-level observations across slices.

## Ownership

- **Primary writer**: `/complete` (updates after every slice)
- **Secondary writer**: `/audit-architecture` (updates during audits)
- Both skills reference this shared format to stay consistent

## Sections

### 1. Health

- **Well-tested areas**: Components/modules with solid test coverage and verified behavior
- **Undertested areas**: Components that work but lack coverage or verification depth
- **Known fragile areas**: Components that broke, required workarounds, or showed brittleness

### 2. Performance Characteristics

Observed characteristics with context (what was measured, under what conditions). Not aspirational targets — only what has been seen in practice.

### 3. Extensibility

- **Easy to extend**: Areas where adding new behavior was straightforward
- **Hard to extend**: Areas where changes required touching many files or fighting abstractions

### 4. Technical Debt

- **Localized items**: Contained to a specific file/module, fixable in isolation
- **Systemic items**: Cross-cutting issues requiring coordinated changes

### 5. Recent Changes

Rolling list of the last 3 completed slices' changes. When adding a new entry, count existing entries — if >= 3, remove the oldest before adding the new one.

## Update Conventions

### Recency Marker

Every section update MUST include a comment marker at the end of the section:

```markdown
<!-- Last updated by: <skill> for <scope>, <date> -->
```

Both `/complete` and `/audit-architecture` write this marker when updating a section.

### Append vs Overwrite Rules

- `/complete`: Always updates based on the current slice's artifacts. Overwrites its own previous entries; preserves entries from `/audit-architecture`.
- `/audit-architecture`: Checks each section's marker date. If within the last 2 completed slices, **append** new observations. Otherwise, **overwrite** the section.

### Change Safety

Format changes to this file require testing both consuming skills (`/complete` and `/audit-architecture`).

## Template

```markdown
# Project Health

## Health

### Well-tested areas
- <component/module>: <what's tested and how>

### Undertested areas
- <component/module>: <what's missing>

### Known fragile areas
- <component/module>: <what broke or needed workarounds>

<!-- Last updated by: <skill> for <scope>, <date> -->

## Performance Characteristics

- <observation>: <context and conditions>

<!-- Last updated by: <skill> for <scope>, <date> -->

## Extensibility

### Easy to extend
- <area>: <why it was easy>

### Hard to extend
- <area>: <why it was hard>

<!-- Last updated by: <skill> for <scope>, <date> -->

## Technical Debt

### Localized items
- <file/module>: <what and why>

### Systemic items
- <description>: <scope of impact>

<!-- Last updated by: <skill> for <scope>, <date> -->

## Recent Changes

- **<slice-name>** (<date>): <1-2 sentence summary of what changed>
- **<slice-name>** (<date>): <1-2 sentence summary of what changed>
- **<slice-name>** (<date>): <1-2 sentence summary of what changed>

<!-- Last updated by: <skill> for <scope>, <date> -->
```
