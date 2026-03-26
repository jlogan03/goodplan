# Software Architecture Review: Entity Restructuring

## Issues

**[IMPORTANT]** `slice.json` drops `epic` field but `deferred.targetSlice` resolution becomes ambiguous

The architecture proposes dropping the `epic` field from `slice.json` (line 109 of data-model-changes.md: "drops `epic` field — now encoded in path, no longer denormalized"). However, the current deferred routing logic in `slice-complete.ts` calls `getSlice(tree, item.targetSlice)` using only the slice name. With nested paths, `getSlice` needs to know which epic the target slice belongs to — and the deferred item schema (`{ description, targetSlice }`) carries no epic information. The completing slice's epic is known, but the target slice could belong to a different epic. This is a real ambiguity: you either need `targetEpic` on `DeferredItem`, or you need to scan all epics to find the target slice, or you keep `epic` on `slice.json` so the state tree can still be queried by slice name alone.

Additionally, `sliceOrErr.epic` is used in `slice-complete.ts` line 102 to resolve the completing slice's epic for learnings rollup — if `epic` is removed from `slice.json`, this field disappears from the `Slice` type.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `epic.sliceSequence` redundancy with overview `slices` array not addressed

The architecture proposes that array order in `epics/overview.json`'s `slices` field replaces `sequencing.md`. But `epic.json` currently has a `sliceSequence` field (confirmed in `src/schemas/entities/epic.ts` and used in `slice-plan.ts` for sequential enforcement). The architecture doc does not mention whether `epic.sliceSequence` is kept, removed, or reconciled with the overview's `slices` array order. Two sources of slice ordering is worse than the current one — the whole point of this change is consolidation.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `updateSliceOverviewStatus` needs epic parameter but architecture underspecifies the lookup

The architecture correctly notes that `updateSliceOverviewStatus` changes from flat to nested lookup. However, the current implementation (`helpers.ts` line 169-185) operates on `slices/overview.json` with a simple `items.map()`. The new implementation must: (1) find the correct epic entry in `epics/overview.json`, (2) find the slice within that epic's `slices` array, (3) update it. The architecture says "updates embedded slice in `epics/overview.json` epic item" but doesn't specify how the epic is identified. The helper needs an `epic` parameter (as stated in the summary table), and every callsite must pass it — but the affected-apis doc doesn't trace which callers currently don't have the epic in scope. `setSliceStatus` calls `updateSliceOverviewStatus` and also needs the epic parameter, cascading to all callers of `setSliceStatus`.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `hasChild(state, "slices", event.name)` uniqueness guard breaks with nested paths

In `slice-create.ts`, the guard `hasChild(state, "slices", event.name)` checks if a slice name already exists globally. With nested paths, slices live under `epics/<epic>/slices/`, so this guard needs to check `hasChild(state, \`epics/${event.epic}/slices\`, event.name)`. But this only checks within the target epic — cross-epic name collisions (which the architecture says are now allowed: "eliminates cross-epic name collisions") need explicit documentation of whether same-named slices in different epics are truly supported. If they are, `activeSlice` in `project.json` (currently just a string name) becomes ambiguous — which epic's slice is active? The architecture doesn't address this.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `activeSlice` in `project.json` needs epic qualification

`project.json.activeSlice` is currently `string | null` — just the slice name. With slices nested under epics and cross-epic name collisions eliminated by directory structure (but potentially still possible in the future), the architecture should specify whether `activeSlice` remains a bare string (relying on `activeEpic` for disambiguation) or becomes `{ epic: string; name: string } | null`. The brainstorm doc says "activeSlice stays as string | null — resolve epic from project.json.activeEpic (always known from context)" but this assumes activeSlice always belongs to activeEpic. If a user switches active epic while a slice is active, the invariant breaks. The architecture should document this constraint explicitly.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Migration step 5 ("Handle slices without epic field") contradicts current schema

The migration strategy includes "Handle slices without `epic` field: prompt user for assignment." But `slice.json`'s Zod schema has `epic: z.string().min(1)` as required — no slice can exist without an `epic` field today. This step is unnecessary unless there's legacy data predating the schema. If so, document when/how that data existed. If not, remove this step to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `addSliceToOverview` new shape not specified for `addEpicToOverview`

The architecture mentions `addSliceToOverview` needs to add to the epic's `slices` array. But the current `addEpicToOverview` in `helpers.ts` doesn't include a `slices` field when creating new epic entries. The new `epicOverviewItemSchema` requires `slices` to always be present — `addEpicToOverview` must be updated to include `slices: []`. This is implied but not called out in affected-apis.md.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No mention of `epic.sliceSequence` update on slice completion/abandonment

Currently when a slice is abandoned, it remains in `epic.sliceSequence`. With the proposed consolidated overview, if array order = sequencing, what happens to completed/abandoned slices in the array? Are they removed? Left in place? This affects both the overview shape and the sequential enforcement logic in `slice-plan.ts`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The architecture correctly identifies the three problems (flat slices, split overviews, learnings duplication) and proposes sensible structural solutions. However, there are significant gaps in the data model specification that would cause implementation failures:

1. The `epic` field removal from `slice.json` conflicts with current code that reads `slice.epic` (deferred routing, learnings rollup).
2. Two sources of slice ordering (`epic.sliceSequence` vs overview `slices` array) are not reconciled.
3. Cross-cutting concerns like `activeSlice` disambiguation and the `hasChild` uniqueness guard are not fully traced through.
4. Helper function signature changes are listed but the cascade through callers is not traced.

To reach 9+: resolve the `slice.json.epic` removal vs. usage conflict, explicitly reconcile `sliceSequence` with the overview array (remove one), trace `activeSlice` disambiguation, and document the slice uniqueness scope (per-epic vs global).

## Summary
- Critical: 1
- Important: 3
- Minor: 3
