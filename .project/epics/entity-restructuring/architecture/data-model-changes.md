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
// Current (complete union — 7 variants)
type Target =
  | { type: "project" }
  | { type: "epic"; name: string }
  | { type: "slice"; name: string }
  | { type: "quest"; name: string }
  | { type: "task"; name: string }
  | { type: "decision"; id: string }
  | { type: "rollup"; from: string; to: string };

// Target (only slice variant changes)
type Target =
  | { type: "project" }
  | { type: "epic"; name: string }
  | { type: "slice"; name: string; epic: string }  // epic field added
  | { type: "quest"; name: string }
  | { type: "task"; name: string }
  | { type: "decision"; id: string }
  | { type: "rollup"; from: string; to: string };
```

The `epic` field is required — every slice belongs to an epic. Commands derive it from `project.json.activeEpic` or `--epic` flag.

## State Event Changes

All slice events gain an `epic` field:

```typescript
| { type: "CREATE_SLICE"; epic: string; name: string; goal: string; ts: string }
| { type: "BEGIN_PLAN"; epic: string; slice: string; ts: string }
| { type: "COMPLETE_PLAN"; epic: string; slice: string; ts: string }
| { type: "BEGIN_REFINEMENT"; epic: string; slice: string; ts: string }
| { type: "COMPLETE_REFINEMENT_ROUND"; epic: string; slice: string; ts: string; scores: Record<string, number>; override?: boolean }
| { type: "BEGIN_IMPLEMENTATION"; epic: string; slice: string; ts: string }
| { type: "COMPLETE_IMPLEMENTATION"; epic: string; slice: string; ts: string }
| { type: "COMPLETE_SLICE"; epic: string; slice: string; ts: string; verificationPassed: boolean; deferred: DeferredItem[]; learnings: LearningInput[]; architectureDelta: ArchitectureDeltaInput[] }
| { type: "ABANDON_SLICE"; epic: string; slice: string; ts: string; reason: string }
```

Transition handlers use `event.epic` to construct nested paths (e.g., `epics/${event.epic}/slices/${event.slice}`).

**Why both `epic` on events AND on `slice.json`?** Belt-and-suspenders. Events carry `epic` so the state machine can construct paths without a separate lookup. `slice.json` retains `epic` so handlers that need it post-lookup (learnings rollup, deferred routing, sibling detection in `COMPLETE_SLICE`) can read it directly from the entity without re-deriving from the event or path.

### Call sites that use `slice.epic` (non-path purposes)

| Call site | Usage |
|---|---|
| `handleBeginPlan` | Sequential enforcement: reads `sliceOrErr.epic` to find sibling slices |
| `buildSliceCompleteResult` | Uses `newSlice.epic` to find siblings, derive learnings path (`epics/${newSlice.epic}/learnings.jsonl`) |
| `slice-complete.ts` deferred routing | Uses `newSlice.epic` to resolve target slice's epic for `getSlice()` |
| `COMPLETE_EPIC` guard | Needs epic to find all sibling slices in overview |
| `src/commands/slice/show.ts` | Displays `slice.epic` in human-readable output (`(epic: ${slice.epic})`) |

## Path Resolution Changes

| Entity | Current Path | Target Path |
|---|---|---|
| Slice entity | `slices/<name>/slice.json` | `epics/<epic>/slices/<name>/slice.json` |
| Slice directory | `slices/<name>/` | `epics/<epic>/slices/<name>/` |
| Slices overview | `slices/overview.json` | `epics/overview.json` (embedded in epic items) |
| Sequencing | `epics/<epic>/slices/sequencing.md` | Eliminated (array order in overview) |

## `epic.json` Schema Change

Remove `sliceSequence` from `epicSchema`. The `epics/overview.json` embedded `slices` array order is the sole source of truth for sequencing. `buildInitialEpicJson()` in `helpers.ts` (line 444) creates `sliceSequence: []` — must be updated to remove this field. Sequential enforcement in `slice-plan.ts` reads from `epics/overview.json` instead of `epic.json.sliceSequence`.

Migration: transfer `sliceSequence` ordering into the new embedded `slices` array when rebuilding `epics/overview.json`. Completed and abandoned slices remain in the array (their status distinguishes them) — order is preserved for audit trail.

## Files Eliminated

- `.project/slices/overview.json`
- `.project/slices/` directory (all contents move under epics)
- `epics/<epic>/slices/sequencing.md` (all epics)
- `epic.json.sliceSequence` field (removed from schema)

## Files Modified

- `epics/overview.json` — gains `slices` array per epic item
- `slice.json` — retains `epic` field (belt-and-suspenders: path encodes the relationship AND entity stores it). Keeping `epic` on the entity avoids propagating epic through every event and simplifies handlers that need the epic name (learnings rollup, deferred routing, sibling detection).

## DeferredItem Change

After restructuring, same-named slices in different epics are allowed (per-epic uniqueness). `DeferredItem` currently carries only `{ description, targetSlice }` — a bare slice name is no longer a unique key across epics.

**Decision**: Deferred routing is restricted to same-epic slices (the common case). Add optional `targetEpic` field for the rare cross-epic case:

```typescript
const deferredItemSchema = z.object({
  description: z.string().min(1),
  targetSlice: z.string().min(1),
  targetEpic: z.string().min(1).optional(),  // NEW — defaults to completing slice's epic
});
```

`slice-complete.ts` deferred routing (line 52, `getSlice(tree, item.targetSlice)`): when `targetEpic` is absent, use the completing slice's epic. When present, use `targetEpic`. This replaces the current global flat lookup.

## CompleteInput Note

`CompleteInput` for the slice variant intentionally does NOT gain an `epic` field — `epic` comes from `Target`, not user input. `CREATE_SLICE` events currently derive `epic` from `BeginPayloadMap["create"].epic` (payload); after restructuring, `target.epic` is also available. Both sources are kept for backward compatibility during migration; long-term, `target.epic` is the canonical source.

## Learnings Change

- `learnings.jsonl` — unchanged (CLI source of truth)
- `.project/learnings.md` — no longer written by `/complete` skill. Existing content preserved as historical artifact but not maintained going forward.
