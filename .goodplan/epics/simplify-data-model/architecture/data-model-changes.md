# Data Model Changes — Simplify Data Model Epic

## Overview

Two targeted changes to the CLI data model. Both are additive — no breaking changes to existing state.

## 1. Decision Provenance Field

### Change

Add optional `entityPath` field to the decision JSONL schema.

### Current Schema

```typescript
// src/schemas/records/decision.ts (simplified)
{
  id: string,           // kebab-case identifier
  domain: string,       // topic area
  title: string,
  summary: string,
  status: "active" | "superseded" | "revisiting",
  supersededBy: string | null,
  date: string          // ISO date
}
```

### Target Schema

```typescript
{
  id: string,
  domain: string,
  title: string,
  summary: string,
  status: "active" | "superseded" | "revisiting",
  supersededBy: string | null,
  date: string,
  entityPath: string | undefined,        // optional provenance, e.g., "epics/simplify-data-model/slices/02-plan-slice-poc"
  reconsiderWhen: string[] | undefined   // optional conditions that should trigger revisiting this decision
}
```

### `reconsiderWhen` Field

An array of specific, evaluable conditions describing when this decision should be revisited. Each condition describes a concrete change to the architecture, codebase, or environment that would invalidate the reasoning behind the decision.

Example:
```json
{
  "id": "single-repo-release-branch-distribution",
  "reconsiderWhen": [
    "Binary size exceeds 100MB (git clone becomes slow for users)",
    "Multi-platform support requires a build matrix that doesn't fit single-branch publishing",
    "The repo goes private and marketplace distribution needs a separate public repo"
  ]
}
```

Skills that review decisions (`create-epic` during architecture, `plan-slice`, `complete-epic`, `audit`) check `reconsiderWhen` conditions against the current work context. If a condition is triggered, the skill flags it to the user: "Decision [title] should be reconsidered — condition triggered: [condition]."

This is proactive — decisions surface for review at the right time based on what's changing, rather than requiring someone to manually set `status: "revisiting"`.

### Impact

- **Schema file**: add two optional fields to Zod schema in `src/schemas/records/decision.ts`
- **CLI command**: `decision:create` accepts optional `entityPath` and `reconsiderWhen` in stdin JSON
- **State machine**: no changes — decisions don't have entity-scoped events
- **Skills**: pass `entityPath` when creating decisions. Set `reconsiderWhen` for decisions where the conditions are identifiable. Check `reconsiderWhen` during architecture/planning/completion phases.
- **Existing state**: unaffected — both fields are optional, missing means "no provenance / no triggers"
- **Tests**: add tests for both fields roundtrip (create with fields, show includes fields)

### Migration

None needed. Existing decisions without the new fields remain valid.

## 2. Learning Validity Conditions

### Change

Add optional `validUntil` field to the learning JSONL schema. An array of conditions describing when the learning may no longer apply.

### Current Schema

```typescript
// learnings JSONL record (simplified)
{
  title: string,
  category: "domain" | "worked" | "didnt-work" | "do-differently",
  summary: string,
  detail: string,
  tags: string[],
  source: string,
  rollupTo: string[]
}
```

### Target Schema

```typescript
{
  title: string,
  category: "domain" | "worked" | "didnt-work" | "do-differently",
  summary: string,
  detail: string,
  tags: string[],
  source: string,
  rollupTo: string[],
  validUntil: string[] | undefined   // conditions that would invalidate this learning
}
```

Example:
```json
{
  "title": "macOS BSD sed lacks GNU extensions",
  "validUntil": [
    "Build pipeline migrates from shell scripts to TypeScript",
    "macOS is no longer a supported platform"
  ]
}
```

### Behavior

Skills that load learnings (`gp learning:list --json`) can check `validUntil` conditions against the current project state. If a condition is triggered, the skill either filters out the learning or flags it: "Learning [title] may no longer apply — [condition]."

This addresses learning staleness as the project grows. The 164+ learnings already accumulated will gradually get `validUntil` conditions as they're reviewed during future completions.

### Impact

- **Schema file**: add optional field to learning JSONL schema
- **CLI command**: `slice:complete` and `quest:complete` payloads accept `validUntil` per learning
- **Skills**: set `validUntil` when writing learnings where conditions are identifiable. Check conditions when loading learnings for context.
- **Existing state**: unaffected — field is optional
- **Tests**: add test for `validUntil` roundtrip

### Migration

None needed. Existing learnings without `validUntil` remain valid indefinitely.

## 3. Overview Consolidation

### Change

Eliminate separate `quests/overview.json` and `tasks/overview.json`. Embed quest and task summaries into the root overview structure.

### Current Structure

Three separate overview files:
- `epics/overview.json` — `{ items: [{ name, status, created, completed, slices: [...] }] }` (already consolidated with slices)
- `quests/overview.json` — `{ items: [{ name, status, created, completed }] }`
- `tasks/overview.json` — `{ items: [{ name, status, title, created, completed }] }`

### Target Structure

Single root overview. Two options to evaluate during implementation:

**Option A: Embed quests/tasks into epics overview**
```json
{
  "epics": [{ "name": "...", "status": "...", "slices": [...] }],
  "quests": [{ "name": "...", "status": "...", "created": "...", "completed": null }],
  "tasks": [{ "name": "...", "status": "...", "title": "...", "created": "...", "completed": null }]
}
```
Single file at `.goodplan/overview.json` (or keep at `epics/overview.json` with a broader schema).

**Option B: Keep epics/overview.json, eliminate only quests + tasks**
Quests and tasks embed into the existing `epics/overview.json` as top-level arrays alongside `items`. Fewer path changes.

### Impact

- **Schema files**: new combined overview schema (or extended epic overview schema)
- **Schema registry**: update regex pattern for overview file matching
- **State machine transitions**: any handler that reads/writes `quests/overview.json` or `tasks/overview.json` updates to new path
- **assembleState/commitState**: schema-registry-driven, adapts automatically once registry is updated
- **Commands**: `quest:list`, `task:list`, `quest:create`, `task:create` update to new overview location
- **State cache**: unaffected (stores full tree, reflects structural changes)
- **Tests**: ~30+ test files update fixture paths and assertions
- **Skills**: minimal impact — skills use CLI commands, not direct file access

### Migration

The `/gp:upgrade` skill handles state migration. When it detects separate `quests/overview.json` or `tasks/overview.json`, it:
1. Reads both files
2. Merges into the target structure
3. Writes the consolidated overview
4. Removes the old files
5. Updates the HMAC signature

This is a one-time migration triggered by version detection.
