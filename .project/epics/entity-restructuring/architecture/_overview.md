# Architecture Proposal: Entity Restructuring

## Summary of Changes

This epic restructures how slices are stored and indexed. Three changes from current architecture:

### 1. Nested Slice Paths

**Current**: `.project/slices/<name>/` (flat, all slices in one directory)
**Target**: `.project/epics/<epic>/slices/<name>/` (nested under parent epic)

Benefits: eliminates cross-epic name collisions, directory structure matches conceptual hierarchy, easier human navigation.

Impact: `Target` type gains `epic` field for slices. All path resolution, state machine handlers, schema registry patterns, commands, and skills update to use nested paths.

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
| Skills | ~15 skill files reference `.project/slices/` paths — all update to nested paths. `/complete` stops writing `learnings.md`. |

## Migration Strategy

Big-bang: update CLI and data together. No backward compatibility window (single-user development tool).

`/migrate` gains a flat-to-nested restructuring mode:
1. Read each `slices/<name>/slice.json` → extract `epic` field
2. Move directory to `epics/<epic>/slices/<name>/`
3. Rebuild `epics/overview.json` with nested slices arrays
4. Remove `slices/overview.json` and empty `slices/` directory
5. Handle slices without `epic` field: prompt user for assignment

Self-test: run on this repo after implementation.
