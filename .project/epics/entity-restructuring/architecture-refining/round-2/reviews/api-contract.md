# API Contract Review: Entity Restructuring Architecture

## Issues

**[IMPORTANT]** `updateOverviewStatus` for epics will silently drop/ignore `slices` array on spread

The current `updateOverviewStatus` in `helpers.ts` (line 89-105) reads `epics/overview.json` typed as `Overview` (which has `OverviewItem` with no `slices` field). After the restructuring, the epic overview items will carry a `slices` array. The spread `{ ...item, status: newStatus }` will preserve `slices` at runtime (JavaScript preserves unknown keys), but the TypeScript type `Overview` will not include `slices` in its type, meaning:

1. The function reads `getJson<Overview>(state, "epics/overview.json")` -- after the change, this should be `getJson<EpicOverview>(state, "epics/overview.json")` (or equivalent) to match the new `epicOverviewSchema`.
2. All overview-mutating helpers that touch `epics/overview.json` (`updateOverviewStatus`, `addEpicToOverview`) must be updated to use the new `EpicOverview` type, not the shared `Overview` type.

The plan's `affected-apis.md` specifies `addEpicToOverview` must add `slices: []` and the new `addSliceToOverview` function, but does not explicitly call out that `updateOverviewStatus` must also change its generic type parameter from `Overview` to the new epic-specific type. If it continues using `Overview`, INV-005 (schema validation on every read and write) will either fail validation (if `epicOverviewSchema` rejects items without `slices`) or silently strip the field.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `buildBeginResult` uses `resolveEntityJsonPath` which will return stale paths for slice targets

In `begin.ts` (line 359), `buildBeginResult` calls `resolveEntityJsonPath(target)` to get the state-tree path for reading old/new entity JSON. For the slice case (line 374-378), it reads `getJson<Slice>(oldState, entityPath)` and `getJson<Slice>(newState, entityPath)`. After restructuring, `resolveEntityJsonPath` for slices will return `epics/<epic>/slices/<name>/slice.json`. This is correctly specified in the plan. However, `buildBeginResult` currently does a generic `target.type === "slice"` branch without accessing `target.epic` -- it works because the path comes from `resolveEntityJsonPath` which will have `epic` from the target. This is fine.

But `buildAbandonEvent` (line 296-307), `buildPlanPhaseEvent` (line 309-321), `buildRefinePlanEvent` (line 323-334), and `buildImplementEvent` (line 337-349) all construct slice events using only `target.name` (e.g., `{ type: "BEGIN_PLAN", slice: target.name, ts }`). After restructuring, these events need `epic` too (e.g., `{ type: "BEGIN_PLAN", epic: target.epic, slice: target.name, ts }`). The plan specifies that all slice events gain an `epic` field, and the `Target` slice variant gains `epic`, but these four event-building helper functions are not explicitly listed in `affected-apis.md`. They will fail TypeScript compilation (the event type will require `epic`), so they won't be missed, but they should be listed for completeness.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `CompleteInput` for slice variant does not include `epic`

The `CompleteInput` type (line 176-183 of `types.ts`) has a `{ type: "slice"; ... }` variant that does not include an `epic` field. When `complete()` is called, it receives a `Target` and a `CompleteInput`. The `Target` will carry `epic`, so the RPC `complete()` function can derive it from there. This is consistent -- `CompleteInput` describes the user-provided payload, not the target context. However, the plan does not explicitly confirm this design choice. Worth a note in `affected-apis.md` that `CompleteInput` is unchanged because `epic` comes from the `Target`, not the input.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `BeginPayloadMap["create"]` already has `epic?: string` but it's optional

Currently `BeginPayloadMap["create"]` has `{ name: string; goal?: string; epic?: string }`. The `buildCreateEvent` function validates `payload.epic !== undefined` for slices (line 236-237). After restructuring, `Target` for slices will carry `epic`, making `payload.epic` redundant for the create event -- `buildCreateEvent` already uses `payload.epic` (not `target.epic`) to populate the `CREATE_SLICE` event. The plan should clarify: will `CREATE_SLICE` events derive `epic` from the `Target` (new) or from the payload (current)? Both are available, but using `target.epic` would be more consistent with the other event builders.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Schema registry test at `schema-registry.test.ts` line 24 asserts `slices/overview.json` resolves to `overviewSchema`

This test will break after the restructuring (the pattern is being removed). The plan's Verification Approach section mentions schema registry matching but doesn't explicitly list updating the existing schema registry tests. The test file also asserts `epics/overview.json` resolves to `overviewSchema` (line 20), which must change to `epicOverviewSchema`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues are well addressed: the `epic` field is retained on `slice.json`, the guard path table is comprehensive, `epicOverviewSchema` is properly separated from `overviewSchema`, and `updateSliceOverviewStatus` is fully specified with its new signature. The remaining issues are:
- The type mismatch in `updateOverviewStatus` (using `Overview` instead of `EpicOverview`) is the most significant gap -- it could cause INV-005 violations at runtime.
- The four event-building helpers in `begin.ts` are not listed but will be caught by TypeScript.

To reach 9+: explicitly list `updateOverviewStatus` type change in `affected-apis.md` (or the helpers section), and add a note about `CompleteInput`/`BeginPayloadMap` not needing changes.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
