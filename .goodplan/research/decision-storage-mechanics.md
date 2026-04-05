# Decision Storage Mechanics

Researched: 2026-04-01 | Source: codebase analysis

---

## Current Decision System

### Schema (`src/schemas/records/decision.ts`)

```typescript
{
  id: string;          // unique identifier
  status: "active" | "superseded" | "revisiting";
  domain: string;      // e.g., "architecture", "implementation"
  title: string;
  summary: string;
  date: string;        // ISO 8601 date (YYYY-MM-DD)
  supersededBy: string | null;
}
```

### Storage: project-level only

Decisions live in exactly **two places**, both at project root:

1. **`decisions.jsonl`** — structured record (the JSONL entry above)
2. **`decisions/*.md`** — referenced in activity logs by path `decisions/<id>`, but the markdown files are **not managed by the state machine**. Skills write them directly to `.goodplan/decisions/` per `skills/_shared/references/decisions-format.md`.

Key distinction: the state machine manages the JSONL entries; the markdown files are a skill-layer concern (glob `decisions/*.md`, parse frontmatter).

### State Machine Events (`src/schemas/state-events.ts`)

- `CREATE_DECISION` — `{id, domain, title, summary, ts}` -> creates entry with status "active"
- `UPDATE_DECISION` — `{id, changes: Partial<Omit<DecisionEntry, "id" | "date">>, ts}` -> updates in-place

Both handlers in `src/core/state/transitions/decision.ts` read/write a single `decisions.jsonl` at root scope. There is no scope parameter.

### State Transitions

```
(none) --CREATE_DECISION--> active
active --UPDATE_DECISION--> active | revisiting | superseded
revisiting --UPDATE_DECISION--> active | superseded
superseded --> (terminal, no updates allowed)
```

### CLI Commands (`src/commands/decision/`)

| Command | Operation | Notes |
|---|---|---|
| `decision:create` | RPC via `begin()` | stdin: `{id, domain, title, summary}` |
| `decision:update` | RPC via `begin()` | `--id` flag + stdin: `{changes: {...}}` |
| `decision:list` | Direct data read | reads `decisions.jsonl` from root state |
| `decision:show` | Direct data read | finds entry by id in root `decisions.jsonl` |

### Context Loading (`src/core/context/decisions.ts`)

`collectDecisions(state)` reads root `decisions.jsonl`, filters to active/revisiting, projects to `DecisionSummary` (drops `date`, `supersededBy`). Returned in `ContextBundle.decisions[]`.

**No scoping logic exists** — always reads from root scope.

### Skill Loading (`skills/_shared/references/decisions-format.md`)

Skills use a parallel loading protocol:
1. Glob `.goodplan/decisions/*.md`
2. Skip `Status: superseded`
3. Flag `Status: revisiting`
4. Load remaining as context

This is independent of the JSONL-based context bundling. The markdown files carry richer content (Rationale, Consequences sections) that the JSONL summary doesn't capture.

---

## Comparison: How Learnings Handle Entity Scoping + Rollup

### Learning Schema (`src/schemas/records/learning.ts`)

Key differences from decisions:

```typescript
{
  category: string;
  summary: string;
  file: string;      // scope-relative path to .md file
  tags: string[];
  source: string;    // origin scope (e.g., "epics/e1/slices/s1")
  rollup: boolean;
  rollupTo: string[];  // ["epic", "project"]
}
```

Learnings have **`source`** (tracks origin) and **`rollupTo`** (declares rollup targets). Decisions have neither.

### Scoped Storage

Learnings are stored at **entity scope**:
- `epics/<name>/slices/<name>/learnings.jsonl` (slice-level)
- `quests/<name>/learnings.jsonl` (quest-level)
- `epics/<name>/learnings.jsonl` (epic-level, from rollup)
- `learnings.jsonl` (project-level, from rollup)

Each scope also has a `learnings/` directory for the `.md` detail files.

### Rollup Mechanism

Two paths:

1. **Auto-rollup at completion** (`processLearnings()` in `src/core/state/transitions/helpers.ts`):
   - Called by `COMPLETE_SLICE` and `COMPLETE_QUEST` handlers
   - Writes to source scope's `learnings.jsonl`
   - Immediately copies entries to target scopes based on each entry's `rollupTo` array
   - Slices can roll up to epic + project; quests roll up to project only

2. **Explicit rollup** (`ROLLUP_LEARNINGS` event, `src/core/state/transitions/rollup-learnings.ts`):
   - Moves matching entries from source to target
   - Deduplicates by `summary + source`
   - Removes rolled-up entries from source (idempotent)

### Context Collection

`collectLearnings()` reads from the appropriate scope's `learnings.jsonl` based on phase/target.

---

## What Entity-Scoped Decisions Would Require

### 1. Schema Changes

**`DecisionEntry` needs new fields:**
- `source: string` — origin scope path (e.g., `"epics/e1/slices/s1"`)
- `rollupTo: string[]` — target scopes for rollup (`["epic", "project"]`)

Alternatively, decisions could be **always project-scoped** (they tend to be project-wide by nature — "Use PostgreSQL", "Event-driven architecture"). The `domain` field already provides a lightweight categorization. Consider whether entity scoping is actually needed vs. just adding an optional `entityRef` field to link a decision to its origin.

### 2. State Machine Changes

**If full scoping (like learnings):**
- `CREATE_DECISION` event needs a `scope` field to determine where to write `decisions.jsonl`
- `UPDATE_DECISION` needs a `scope` field to find the right `decisions.jsonl`
- New `ROLLUP_DECISIONS` event (parallel to `ROLLUP_LEARNINGS`) that moves entries up the scope hierarchy
- Transition handlers need to read/write `<scope>/decisions.jsonl` instead of root `decisions.jsonl`
- `COMPLETE_SLICE` / `COMPLETE_QUEST` handlers need `processDecisions()` parallel to `processLearnings()`

**If lightweight linking (recommended):**
- Add optional `entityPath` to `CREATE_DECISION` event
- No new events needed — decisions stay at root but carry provenance
- `collectDecisions()` gains an optional filter parameter

### 3. CLI Command Changes

**Full scoping:**
- `decision:create` needs `--scope` or infers scope from context
- `decision:list` needs `--scope` filter (default: all scopes, rolled-up view)
- `decision:show` needs scope-aware lookup
- New `decision:rollup` command (or fold into `learning:rollup`)

**Lightweight linking:**
- `decision:create` accepts optional `--entity` flag
- `decision:list` accepts optional `--entity` filter
- Minimal changes

### 4. Context Bundling Changes

- `collectDecisions()` needs scope-aware collection (read from entity scope, merge with rolled-up project scope)
- `ContextBundle.decisions[]` interface unchanged (DecisionSummary already has the right fields)

### 5. Skill Changes

- `decisions-format.md` shared reference needs updating
- All writer skills (explore, create-architecture, create-slices, create-plan, complete, refine-architecture, audit-architecture) need to pass scope when creating decisions
- The markdown file convention (`decisions/*.md`) needs a scoped equivalent or stays flat with naming conventions

### 6. Migration

- Existing `decisions.jsonl` entries need `source: "project"` and `rollupTo: []` backfilled
- Existing `decisions/*.md` files could stay at root (project-scoped by default)

---

## Recommendation

Decisions are architecturally different from learnings:
- **Learnings** are naturally scoped to work units (what we learned doing slice X)
- **Decisions** are naturally project-wide (they constrain all future work)

The lightweight linking approach (add optional `entityPath` to track provenance without scoping storage) is likely sufficient and avoids the complexity of a full rollup system. The `domain` field already serves the categorization role that scope serves for learnings.

If the simplify-data-model epic aims to unify the storage pattern, the key question is: **do decisions need independent lifecycle at the entity level, or just provenance tracking?** If the latter, a simple `entityPath` field on the existing root-scoped system is the minimal change.
