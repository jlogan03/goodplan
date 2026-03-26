# Architecture Proposal: Entity Restructuring

## Summary of Changes

This epic restructures how slices are stored and indexed. Three changes from current architecture:

### 1. Nested Slice Paths

**Current**: `.project/slices/<name>/` (flat, all slices in one directory)
**Target**: `.project/epics/<epic>/slices/<name>/` (nested under parent epic)

Benefits: eliminates cross-epic name collisions, directory structure matches conceptual hierarchy, easier human navigation.

Impact: `Target` type gains `epic` field for slices. All path resolution, state machine handlers, schema registry patterns, commands, and skills update to use nested paths.

**`activeSlice` invariant**: `project.json.activeSlice` remains `string | null` (not a compound object). Invariant: **activeSlice is only meaningful when activeEpic is set** — the active slice always belongs to the active epic. The state machine enforces this: `ACTIVATE_EPIC` sets `activeEpic`; `BEGIN_PLAN` sets `activeSlice` within the active epic; `COMPLETE_SLICE`/`ABANDON_SLICE` clears `activeSlice`. Note: `COMPLETE_EPIC` does not explicitly clear `activeSlice` — by workflow ordering, all slices must be completed/abandoned (each clears `activeSlice`) before epic completion fires, so `activeSlice` is already null.

### 2. Consolidated Overview

**Current**: Three separate files
- `epics/overview.json` — `{ items: [{ name, status, created, completed }] }`
- `slices/overview.json` — `{ items: [{ name, status, epic, created, completed }] }`
- `epics/<epic>/slices/sequencing.md` — ordered list with prose

**Target**: Single `epics/overview.json` with embedded slices
```json
{
  "items": [
    {
      "name": "my-epic",
      "status": "activated",
      "created": "...",
      "completed": null,
      "slices": [
        { "name": "01-auth", "status": "implementing", "created": "...", "completed": null },
        { "name": "02-api", "status": "created", "created": "...", "completed": null }
      ]
    }
  ]
}
```

Slice array order = sequencing (replaces `sequencing.md`). No `dependsOn` field — order is sufficient.

Eliminated files: `slices/overview.json`, `slices/` top-level directory, all `sequencing.md` files.

### 3. Learnings Source of Truth

**Current**: `/complete` skill writes both `learnings.jsonl` (via CLI payload) and `.project/learnings.md` (direct file write)
**Target**: `learnings.jsonl` is the sole structured source. Remove direct `learnings.md` writes from `/complete`.

## Subsystem Impact

| Subsystem | Change Scope |
|---|---|
| State Machine | All slice transition handlers use `epics/${epic}/slices/${name}` paths. Overview helpers operate on nested structure. `getSlice`/`setSliceJson`/`updateSliceOverviewStatus` gain epic parameter. |
| Data Layer | Schema registry patterns updated for nested paths. `assembleState` is recursive — no changes needed. `init.ts` stops creating top-level `slices/`. |
| RPC Layer | `Target` slice variant: `{ type: "slice"; name: string; epic: string }`. `resolveEntityDir`/`resolveEntityJsonPath` use nested paths. All exhaustive switches updated. |
| Commands | `slice:list` defaults to active epic, adds `--epic`/`--all` flags. All slice commands resolve epic from `project.json.activeEpic` or `--epic` flag. |
| Context | Scope paths change from `slices/<name>` to `epics/<epic>/slices/<name>`. |
| Skills | 11 skill files reference `.project/slices/` paths — all update to nested paths. `/complete` stops writing `learnings.md`. See `affected-apis.md` Skills section for complete enumeration. |
| Test Infrastructure | 4 fixture `epic.json` files contain `sliceSequence` (must remove field). 8+ test files reference `slices/overview.json` paths (must update to embedded overview). `schema-registry.test.ts` assertions for `slices/overview.json` and `epics/overview.json` schemas must update. |

## Migration Strategy

Big-bang: update CLI and data together. No backward compatibility window (single-user development tool).

`/migrate` gains a flat-to-nested restructuring mode:
1. Read each `slices/<name>/slice.json` → extract `epic` field (required by current schema — always present)
2. Move directory to `epics/<epic>/slices/<name>/`
3. Rebuild `epics/overview.json` with nested slices arrays (transfer `sliceSequence` ordering)
4. Remove `slices/overview.json` and empty `slices/` directory

Self-test: run on this repo after implementation.

## Verification Approach

1. **`assembleState()` discovers nested paths**: after migration, verify state tree contains slice entries under `epics/<epic>/slices/<name>/` (not under top-level `slices/`)
2. **Schema registry matches**: verify `epicOverviewSchema` validates the new overview shape and `sliceSchema` matches at nested path patterns
3. **Guard paths resolve**: verify `hasChild(state, "epics/<epic>/slices/<name>", "plan.md")` returns correct results
4. **End-to-end workflow**: create epic → create slice → plan → refine → implement → complete, confirming all transitions work with nested paths
5. **Migration round-trip**: run migration on this repo, then run `goodplan status` to confirm all entities are intact
6. **`epicOverviewSchema` round-trip**: create epic with slices, serialize to `epics/overview.json`, parse through `epicOverviewSchema`, confirm no validation errors. Critical because `epicOverviewSchema` is a new schema type, not an extension of existing `overviewSchema`.
7. **Schema registry test assertions**: update `schema-registry.test.ts` — remove `slices/overview.json` assertion (path eliminated), change `epics/overview.json` assertion from `overviewSchema` to `epicOverviewSchema`

## Documentation Update Phase

After implementation, update these project-level architecture docs to reflect nested paths:

| Doc | Changes needed |
|---|---|
| `data-model.md` | `slice.json` location, directory structure, state tree example, schema registry, `hasChild` guard examples |
| `state-machine-api.md` | State Key Dependencies table (`slices/` → `epics/<epic>/slices/`), Directory-Based Guards section, event type definitions (add `epic` to all slice events) |
| `rpc-layer-api.md` | `Target` type definition (add `epic` to slice variant) |
| `flows.md` | Any slice workflow path references |
| `commands-api.md` | Slice command path resolution |
| `activity-log.jsonl` scope format | `slices/${name}` → `epics/${epic}/slices/${name}` |

This phase prevents doc divergence immediately after the 45+ file change.
