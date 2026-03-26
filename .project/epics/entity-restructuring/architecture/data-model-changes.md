# Data Model Changes

## Overview Schema (epics/overview.json)

### Current Shape

```typescript
// epics/overview.json
{ items: Array<{ name: string; status: string; created: string; completed: string | null }> }

// slices/overview.json (separate file)
{ items: Array<{ name: string; status: string; epic?: string; created: string; completed: string | null; title?: string }> }
```

### Target Shape

```typescript
// epics/overview.json (consolidated)
{
  items: Array<{
    name: string;
    status: string;
    created: string;
    completed: string | null;
    slices: Array<{
      name: string;
      status: string;
      created: string;
      completed: string | null;
    }>;
  }>;
}
```

The `slices` array is always present (empty array for epics with no slices). Array order defines slice sequencing.

Note: `title` field (added for tasks) is NOT included on slice overview items — slices don't have titles.

### Zod Schema Change

```typescript
// New: epicOverviewItemSchema extends overviewItemSchema with slices
const sliceOverviewItemSchema = z.object({
  name: z.string(),
  status: z.string(),
  created: timestampSchema,
  completed: timestampSchema.nullable(),
});

const epicOverviewItemSchema = overviewItemSchema.extend({
  slices: z.array(sliceOverviewItemSchema),
});

const epicOverviewSchema = z.object({
  items: z.array(epicOverviewItemSchema),
});
```

## Target Type Change

```typescript
// Current
type Target =
  | { type: "epic"; name: string }
  | { type: "slice"; name: string }
  | { type: "quest"; name: string }
  | { type: "task"; name: string };

// Target
type Target =
  | { type: "epic"; name: string }
  | { type: "slice"; name: string; epic: string }
  | { type: "quest"; name: string }
  | { type: "task"; name: string };
```

The `epic` field is required — every slice belongs to an epic. Commands derive it from `project.json.activeEpic` or `--epic` flag.

## State Event Changes

All slice events gain an `epic` field:

```typescript
| { type: "CREATE_SLICE"; epic: string; name: string; goal: string; ts: string }
| { type: "BEGIN_PLAN"; epic: string; slice: string; ts: string }
// ... etc for all slice events
```

Transition handlers use `epic` to construct nested paths.

## Path Resolution Changes

| Entity | Current Path | Target Path |
|---|---|---|
| Slice entity | `slices/<name>/slice.json` | `epics/<epic>/slices/<name>/slice.json` |
| Slice directory | `slices/<name>/` | `epics/<epic>/slices/<name>/` |
| Slices overview | `slices/overview.json` | `epics/overview.json` (embedded in epic items) |
| Sequencing | `epics/<epic>/slices/sequencing.md` | Eliminated (array order in overview) |

## Files Eliminated

- `.project/slices/overview.json`
- `.project/slices/` directory (all contents move under epics)
- `epics/<epic>/slices/sequencing.md` (all epics)

## Files Modified

- `epics/overview.json` — gains `slices` array per epic item
- `slice.json` — drops `epic` field (now encoded in path, no longer denormalized)

## Learnings Change

- `learnings.jsonl` — unchanged (CLI source of truth)
- `.project/learnings.md` — no longer written by `/complete` skill. Existing content preserved as historical artifact but not maintained going forward.
