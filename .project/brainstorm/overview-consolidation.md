# Brainstorm: Overview Consolidation

## Problem

Three separate files track overlapping entity relationships:
- `epics/overview.json` — epic metadata
- `slices/overview.json` — slice metadata with denormalized `epic` field
- `epics/<epic>/slices/sequencing.md` — ordering and dependency prose

Flat `slices/` directory creates cross-epic name collision risk and poor human navigability.

## Design: Consolidated `epics/overview.json`

Embed slices as a nested array inside each epic's overview entry:

```json
{
  "items": [
    {
      "name": "my-epic",
      "status": "activated",
      "created": "2026-03-20T00:00:00Z",
      "completed": null,
      "slices": [
        {
          "name": "01-auth",
          "status": "implementing",
          "created": "2026-03-20T00:00:00Z",
          "completed": null
        },
        {
          "name": "02-api",
          "status": "created",
          "created": "2026-03-21T00:00:00Z",
          "completed": null
        }
      ]
    }
  ]
}
```

## Key Decisions

- **Array order = slice sequencing** — replaces `sequencing.md`. Dependency annotations go in `goal.md` if needed.
- **`slice:list` defaults to active epic** — `--epic <name>` for others, `--all` for everything.
- **`activeSlice` stays as `string | null`** — resolve epic from `project.json.activeEpic` (always known from context).
- **No `dependsOn` field** — array ordering is sufficient. Keep it simple.

## Files Eliminated

- `.project/slices/overview.json` — data moves into `epics/overview.json`
- `.project/slices/` directory — slices live under `epics/<epic>/slices/<name>/`
- `epics/<epic>/slices/sequencing.md` — replaced by array order

## State Tree Impact

- `state --json --query '.slices["01-auth"]'` → `'.epics["my-epic"].slices["01-auth"]'`
- `assembleState` walker is recursive — naturally discovers nested paths
- Schema registry patterns need updating for nested paths

## Command Impact

- `slice:create` — already takes `--epic`, unchanged semantics
- `slice:list` — reads `epics/overview.json`, filters to active epic by default
- `slice:show` — needs epic context to resolve path
- All slice mutation commands — need epic in Target type

## Target Type Change

```typescript
// Before
{ type: "slice"; name: string }

// After
{ type: "slice"; name: string; epic: string }
```

Cascades through `begin()`, `submit()`, `complete()`, all command handlers. The epic is always available from `project.json.activeEpic` or command flags.

## Open Questions

None — design is clear. Implementation is the challenge (45+ files, 100+ path references).
