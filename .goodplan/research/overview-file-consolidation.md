# Overview File Consolidation

Researched: 2026-04-01 | Source: codebase analysis

---

## Current Overview File Structure

Three overview.json files exist, each at the root of a collection directory:

### `epics/overview.json` (schema: `epicOverviewSchema`)
Already consolidated during entity-restructuring epic. Contains embedded slices:
```json
{
  "items": [
    {
      "name": "epic-name",
      "status": "completed",
      "created": "...",
      "completed": "...",
      "slices": [
        { "name": "slice-name", "status": "completed", "created": "...", "completed": "..." }
      ]
    }
  ]
}
```
Slice items use `sliceOverviewItemSchema` (overviewItemSchema minus `epic` and `title` fields). Slice array order encodes sequencing.

### `quests/overview.json` (schema: `overviewSchema`)
Flat list of quest summary items:
```json
{
  "items": [
    { "name": "quest-name", "status": "completed", "created": "...", "completed": "..." }
  ]
}
```
Fields: `name`, `status`, `created`, `completed`. Optional `epic` and `title` fields exist in the base `overviewItemSchema` but are unused by quests.

### `tasks/overview.json` (schema: `overviewSchema`)
Same shape as quests, but tasks use the optional `title` field:
```json
{
  "items": [
    { "name": "task-name", "status": "open", "title": "Human-readable title", "created": "...", "completed": null }
  ]
}
```

### Legacy: `slices/overview.json`
Eliminated from source code during entity-restructuring. Still present in 6 test fixtures as dead data. Two test files reference it (`tests/unit/commands/state.test.ts`, `tests/unit/data/tree.test.ts`). Not registered in schema-registry.ts.

## Schema Layer

Defined in `src/schemas/entities/overview.ts`:
- `overviewItemSchema` — base item: `{ name, status, epic?, title?, created, completed }`
- `overviewSchema` — `{ items: overviewItemSchema[] }` (used by quests and tasks)
- `sliceOverviewItemSchema` — overviewItemSchema minus epic/title
- `epicOverviewItemSchema` — overviewItemSchema extended with `slices: sliceOverviewItemSchema[]`
- `epicOverviewSchema` — `{ items: epicOverviewItemSchema[] }` (used by epics)

Registered in `src/core/data/schema-registry.ts`:
```
{ pattern: /^epics\/overview\.json$/, schema: epicOverviewSchema }
{ pattern: /^quests\/overview\.json$/, schema: overviewSchema }
{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema }
```

## How Overview Files Are Read/Written

### assembleState (`src/core/data/assemble.ts`)
Recursive directory walker. Reads any `.json` file, looks up schema via `findSchema(relativePath)`, validates with Zod. Overview files are not special-cased — they are read like any other JSON file in the tree. **No code changes needed here for consolidation** — assembleState is schema-pattern-driven.

### commitState (`src/core/data/commit.ts`)
Recursive tree diff between old and new state. Writes changed JSON files with schema validation. Overview files are not special-cased. **No code changes needed here either** — commit is also schema-pattern-driven.

### loadState / State Cache (`src/core/data/load.ts`)
Caches entire ProjectState tree. Incremental update on directory mtime changes. Overview files are part of the cached tree. **No direct changes needed** — cache stores the full tree and will naturally reflect any structural changes.

### State Machine Transitions
All overview mutations go through pure helper functions in `src/core/state/transitions/helpers.ts`:

**Epic overview** (path: `epics/overview.json`):
- `updateOverviewStatus()` — updates epic status
- `addEpicToOverview()` — adds new epic entry with empty slices array
- `addSliceToOverview()` — adds slice to epic's embedded slices array
- `updateSliceOverviewStatus()` — updates slice status within epic's slices array

**Quest overview** (path: `quests/overview.json`):
- `updateQuestOverviewStatus()` — updates quest status
- `addQuestToOverview()` — adds new quest entry

**Task overview** (path: `tasks/overview.json`):
- `updateTaskOverviewStatus()` — updates task status
- Task creation writes directly in `task-create.ts` (lazy overview creation pattern)

## Consolidation Options

### Option A: Single `overview.json` at project root
Merge all three into one file:
```json
{
  "epics": [...],
  "quests": [...],
  "tasks": [...]
}
```
**Pro**: Single file to read for full project status. Fewer file I/O operations.
**Con**: Larger file, more merge conflicts in the state tree, every entity mutation touches the same file (concurrent modification detection becomes a bottleneck).

### Option B: Keep separate files, simplify schema
Keep the 3-file structure but unify on a single `overviewSchema` (remove `epicOverviewSchema` distinction). Would require moving slice sequencing elsewhere.
**Pro**: Minimal disruption.
**Con**: Doesn't actually reduce the number of overview files.

### Option C: Eliminate overview files entirely
Store status inline in entity JSON only. Compute overview on demand from entity files.
**Pro**: Eliminates the dual-write pattern (entity JSON + overview sync). Single source of truth for status.
**Con**: Listing entities requires reading every entity directory. Performance regression for `gp status` and list commands. State cache mitigates this but adds complexity.

## Impact Assessment for Full Consolidation (Option A)

### Files That Would Need Modification

**Schema layer** (2 files):
- `src/schemas/entities/overview.ts` — new unified schema or restructure existing
- `src/core/data/schema-registry.ts` — update patterns (remove 3, add 1)

**State machine transitions** (7 files):
- `src/core/state/transitions/helpers.ts` — all 7 overview helper functions change paths
- `src/core/state/transitions/init.ts` — create single overview instead of 3
- `src/core/state/transitions/epic-create.ts` — references `epics/overview.json`
- `src/core/state/transitions/slice-create.ts` — references `epics/overview.json`
- `src/core/state/transitions/slice-plan.ts` — references `epics/overview.json`
- `src/core/state/transitions/quest-create.ts` — references `quests/overview.json`
- `src/core/state/transitions/task-create.ts` — references `tasks/overview.json`
- `src/core/state/transitions/task-lifecycle.ts` — references `tasks/overview.json`

**Commands** (4 files):
- `src/commands/global/status.ts` — reads all overview paths
- `src/commands/epic/list.ts` — reads `epics/overview.json`
- `src/commands/quest/list.ts` — reads `quests/overview.json`
- `src/commands/task/list.ts` — reads `tasks/overview.json`
- `src/commands/slice/list.ts` — reads `epics/overview.json`

**RPC/other** (2 files):
- `src/core/rpc/migrate.ts` — migration logic references overview paths
- `src/core/rpc/complete.ts` — reads overview for completion logic

**Context** (1 file):
- `src/core/context/priorities.ts` — references `quests/overview.json` path

**Skills** (2 files):
- `skills/onboard-repo/SKILL.md`
- `skills/_shared/references/cli-interaction.md`

**Tests** (~31 files):
- All 31 test files that reference `overview.json` patterns
- 6 test fixtures with `slices/overview.json` (dead, should be cleaned regardless)
- Multiple fixture `overview.json` files across 6 fixture directories

**Total**: ~50 files would need changes for full consolidation.

## Key Observations

1. **Entity restructuring already consolidated slices into epics** — `slices/overview.json` was eliminated and slices were embedded in `epics/overview.json`. This pattern proved viable.

2. **assembleState/commitState are consolidation-friendly** — they are fully schema-registry-driven with no hardcoded overview paths. Only the schema registry entry patterns and the transition helpers need to change.

3. **The state cache is unaffected** — it stores the full tree and will naturally reflect structural changes.

4. **The overview helper functions in helpers.ts are the primary choke point** — 7 functions manage all overview mutations. These are the critical path for any consolidation.

5. **Tasks have a lazy creation pattern** — `task-create.ts` creates `tasks/overview.json` on first task if it doesn't exist. This would need adjustment.

6. **The `overviewSchema` is already shared** between quests and tasks — consolidation could reuse this fact.

7. **Dead fixture data** — 6 fixtures still contain `slices/overview.json` files that should be cleaned up regardless of consolidation decision.
