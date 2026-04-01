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

**Evaluation mechanism:** `reconsiderWhen` conditions are evaluated by LLM sub-agents (not the orchestrator, not the CLI deterministically). During architecture, planning, and completion phases, the relevant sub-agent receives the decision's `reconsiderWhen` conditions alongside the current epic/slice goal text and uses judgment to determine if any condition is triggered. If so, the sub-agent includes it in its return summary, and the orchestrator surfaces it to the user: "Decision [title] should be reconsidered — condition triggered: [condition]."

Triggering is **advisory, not deterministic** — the LLM applies judgment about whether a condition matches the current context. This means triggering may vary between runs, which is acceptable for a proactive review mechanism. The alternative (structured condition formats for CLI evaluation) would be too rigid to capture the nuanced conditions that matter (e.g., "binary size exceeds 100MB").

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
// src/schemas/records/learning.ts — learningEntrySchema (persisted JSONL record)
{
  category: string,        // open string; RPC layer enforces "domain" | "worked" | "didnt-work" | "do-differently"
  summary: string,
  file: string,            // scope-relative path to .md detail file
  tags: string[],
  source: string,
  rollup: boolean,
  rollupTo: string[]
}

// learningInputSchema (what skills pass at completion boundary)
{
  category: "domain" | "worked" | "didnt-work" | "do-differently",
  summary: string,
  detail: string,          // RPC layer maps this to a `file` field
  tags: string[],
  rollupTo: ("epic" | "project")[]
}
```

### Target Schema

```typescript
// learningEntrySchema — add validUntil to persisted record
{
  category: string,
  summary: string,
  file: string,
  tags: string[],
  source: string,
  rollup: boolean,
  rollupTo: string[],
  validUntil: string[] | undefined   // conditions that would invalidate this learning
}

// learningInputSchema — add validUntil to input
{
  category: "domain" | "worked" | "didnt-work" | "do-differently",
  summary: string,
  detail: string,
  tags: string[],
  rollupTo: ("epic" | "project")[],
  validUntil: string[] | undefined
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

**Evaluation mechanism:** `validUntil` conditions are evaluated by LLM sub-agents (same mechanism as `reconsiderWhen` on decisions). When skills load learnings for context, the relevant sub-agent receives the conditions alongside the current epic/slice goal text and uses judgment to determine relevance. Triggering is advisory — the sub-agent either filters out the learning or flags it: "Learning [title] may no longer apply — [condition]."

This addresses learning staleness as the project grows. The 164+ learnings already accumulated will gradually get `validUntil` conditions as they're reviewed during future completions.

### Impact

- **Schema file**: add optional field to learning JSONL schema
- **CLI command**: `slice:complete` and `quest:complete` payloads accept `validUntil` per learning
- **RPC layer**: completion handler passes `validUntil` through from `LearningInput` to `LearningEntry` (same pattern as `rollupTo`)
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

Single root overview at `.goodplan/overview.json`:

```json
{
  "epics": [{ "name": "...", "status": "...", "slices": [...] }],
  "quests": [{ "name": "...", "status": "...", "created": "...", "completed": null }],
  "tasks": [{ "name": "...", "status": "...", "title": "...", "created": "...", "completed": null }]
}
```

**Rationale (Option A selected):** A single root file eliminates path coupling between entity types, aligns with the consolidation goal, and simplifies the schema registry (one path, one schema, one assembler). Option B (extending `epics/overview.json`) would leave the file at a misleading path and couple quest/task data to the epics directory.

### Impact

- **Schema files**: new combined overview schema (or extended epic overview schema)
- **Schema registry**: update regex pattern for overview file matching
- **State machine transitions**: any handler that reads/writes `quests/overview.json` or `tasks/overview.json` updates to new path
- **assembleState/commitState**: schema-registry-driven, adapts automatically once registry is updated
- **Commands**: `quest:list`, `task:list`, `quest:create`, `task:create` update to new overview location
- **State cache**: unaffected (stores full tree, reflects structural changes)
- **Tests**: ~10-15 test files update fixture paths and assertions
- **Skills**: minimal impact — skills use CLI commands, not direct file access

### Migration

The `/gp:upgrade` skill handles state migration. When it detects separate `quests/overview.json` or `tasks/overview.json`, it follows crash-safe ordering (aligned with the existing `commitState` atomic write pattern):

1. Reads both old files
2. Merges into the target structure
3. **Writes** the consolidated `overview.json`
4. **Updates** the HMAC signature
5. **Verifies** the new file is valid (parse + HMAC check)
6. **Removes** the old `quests/overview.json` and `tasks/overview.json`

Crash safety: if the process fails before step 6, old files remain alongside the new file. On next run, the migration detects the old files still exist and re-runs from step 1 (idempotent). If the process fails before step 3, no new file exists and old files are untouched. The old files are never removed until the new file and HMAC are verified.

This is a one-time migration triggered by version detection.
