# Software Architecture Review: Entity Restructuring (Round 3)

## Issues

**[IMPORTANT]** `updateOverviewStatus` type parameter change is underspecified for preserving `slices` array (2x weight: module depth)

`affected-apis.md` correctly notes that `updateOverviewStatus` must use `EpicOverview` instead of `Overview` because `epicOverviewSchema` requires `slices`. However, the current `updateOverviewStatus` implementation (helpers.ts line 89-105) spreads `{ ...item, status: newStatus }` when mapping over items. After restructuring, each epic overview item carries a `slices` array. The spread preserves it *if* the runtime object has it, but the `Overview` type annotation erases it at compile time — `getJson<Overview>(...)` strips unknown fields during Zod parsing (strict by default in Zod 4). This means `getJson<EpicOverview>(...)` is not just a type change — it also affects which Zod schema validates the parse. The schema registry provides the schema for validation on *write* (commitState), but `getJson` uses runtime Zod `.parse()` against the schema found by path pattern. After the schema registry changes `epics/overview.json` to `epicOverviewSchema`, reads and writes will both use the new schema, so the `slices` array will survive the round-trip. The architecture should explicitly note this: the schema registry change is load-bearing for read correctness, not just write validation. Implementers who change the type annotation but forget to update the schema registry will silently strip `slices` arrays on every read.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `buildCompleteEvent` for slice does not include `epic` from target

`complete.ts` line 104 builds `COMPLETE_SLICE` as `{ type: "COMPLETE_SLICE", slice: target.name, ts, ... }`. The architecture specifies all slice events gain an `epic` field (data-model-changes.md lines 90-99). The event builder must include `epic: target.epic` — but `target` is typed as `Target`, not narrowed to the slice variant at that point in the current code. After restructuring, the slice Target variant gains `epic: string`, so `target.epic` will be available in the `case "slice"` branch. The affected-apis doc covers `buildBeginEvent` and `buildAbandonEvent` explicitly but does not mention `buildCompleteEvent` in `complete.ts`. Add it to the "complete.ts" section to avoid an oversight during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `buildSliceCompleteResult` hardcoded paths not traced in affected-apis

`complete.ts` `buildSliceCompleteResult` (lines 169-267) contains 7 hardcoded `slices/` path references: `slices/${sliceName}/slice.json` (x2), `slices/overview.json` (x1), `slices/${item.name}/slice.json` (x2), `slices/${sliceName}/architecture-deltas.jsonl` (x1), plus the overview filter `item.epic === newSlice.epic`. The architecture's "complete.ts" entry (affected-apis.md line 26) only says "reads `epics/overview.json` -> embedded slices instead of filtering `slices/overview.json` by epic field. Simpler." This understates the scope — `buildSliceCompleteResult` also needs all `slices/` paths changed to `epics/<epic>/slices/`, and the sibling-slice detection logic changes from filtering a flat overview by `epic` field to reading the epic's embedded `slices` array directly. Enumerating these would reduce implementation risk.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 2 issues have been correctly addressed. The `DeferredItem` now carries optional `targetEpic` with a sensible same-epic default. The `activeSlice` invariant enforcement description is accurate. Sequential enforcement migration is explicitly traced through `slice-plan.ts` with code examples. The `COMPLETE_EPIC`/`activeSlice` relationship is honestly documented (workflow ordering, not defensive clearing). The `CREATE_SLICE` guard assumption is surfaced with a note to document or add the check.

The architecture is ready for slicing. The remaining issues are minor implementation traceability gaps — the IMPORTANT item about schema registry being load-bearing for reads is the only one that could cause a subtle bug if missed during implementation.

To reach 10: enumerate all hardcoded `slices/` paths in `complete.ts` in the affected-apis doc, note the schema registry's read-path significance, and add `buildCompleteEvent` to the complete.ts change list.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
