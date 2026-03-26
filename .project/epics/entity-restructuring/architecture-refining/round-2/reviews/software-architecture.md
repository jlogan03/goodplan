# Software Architecture Review: Entity Restructuring (Round 2)

## Issues

**[IMPORTANT]** `DeferredItem.targetSlice` lacks epic qualification for cross-epic deferred routing

The `DeferredItem` schema (`{ description, targetSlice }`) carries only a slice name. With nested paths, `getSlice(state, epic, name)` requires an epic parameter. The architecture doc's call-site table says `slice-complete.ts` deferred routing "uses `newSlice.epic` to resolve target slice's epic for `getSlice()`" — but this assumes the target slice is in the **same** epic as the completing slice. If deferred items can target slices in a different epic, `newSlice.epic` is the wrong epic. Current code (`slice-complete.ts` line 52) does `getSlice(tree, item.targetSlice)` with a global flat lookup — this works because slices are globally unique today. After restructuring, same-named slices in different epics are allowed (per affected-apis.md "Per-epic, not global"), so a bare name is no longer sufficient.

Options: (a) require `targetEpic` on `DeferredItem`, (b) restrict deferred routing to same-epic slices only and document this constraint, or (c) scan all epics to find the target (expensive, fragile if names collide). Option (b) is the simplest and matches the typical workflow (deferred items route to later slices in the same epic).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `activeSlice` invariant claim about `BEGIN_PLAN` is inaccurate (2x weight: module depth)

The `_overview.md` states: "The state machine enforces this: `BEGIN_PLAN` sets both `activeEpic` and `activeSlice`." Code inspection shows `BEGIN_PLAN` (`slice-plan.ts`) only sets `activeSlice` — it does not touch `activeEpic`. `activeEpic` is set by `ACTIVATE_EPIC` (`epic-lifecycle.ts`). The invariant itself is sound (activeSlice is always scoped to activeEpic because you can't create/plan slices without an activated epic), but the enforcement description is wrong. Incorrect enforcement documentation will confuse implementers who read the architecture and try to reconcile it with the code.

Fix: change to "ACTIVATE_EPIC sets activeEpic; BEGIN_PLAN sets activeSlice within the active epic."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `COMPLETE_EPIC` does not clear `activeSlice` — invariant claim about "switching activeEpic clears activeSlice" is aspirational

The invariant says "switching activeEpic clears activeSlice." `COMPLETE_EPIC` currently clears `activeEpic` but does NOT clear `activeSlice`. In practice the invariant holds because all slices must be completed/abandoned (each clears `activeSlice`) before the epic can complete. But if the architecture relies on this guarantee, it should either: (a) explicitly note that `activeSlice` is already null when `COMPLETE_EPIC` fires (by workflow ordering), or (b) have `COMPLETE_EPIC` defensively clear `activeSlice`. Option (a) is more honest; option (b) is belt-and-suspenders.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `CREATE_SLICE` guard says "requires epic in `activated` status" but current code does not check epic status

The affected-apis doc says `addSliceToOverview` is "Called by CREATE_SLICE handler. The epic must already exist in overview (guard: CREATE_SLICE requires epic in `activated` status)." But `slice-create.ts` only checks `hasChild(state, "slices", event.name)` for uniqueness and `getJson<Epic>(state, ...)` for existence — it does not verify `epic.status === "activated"`. If the architecture assumes this guard exists, it should be added as part of this epic. If it relies on workflow ordering (slices are only created during the slicing phase, which requires activated status), document that assumption.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Sequential enforcement migration from `epic.sliceSequence` to overview array order not traced through `slice-plan.ts`

The architecture correctly states `sliceSequence` is removed from `epic.json` and replaced by the `slices` array order in `epics/overview.json`. But `slice-plan.ts` (lines 43-66) currently reads `epic.sliceSequence` for sequential enforcement. The affected-apis doc does not explicitly state how `handleBeginPlan` changes its sequential enforcement lookup — it only describes helper signature changes. This should be called out: sequential enforcement must switch from `epic.sliceSequence.indexOf()` to finding the slice's index in the overview's `slices` array for the epic.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's fixes are solid: keeping `epic` on `slice.json` (belt-and-suspenders), adding guard path changes, removing `sliceSequence`, fully specifying `updateSliceOverviewStatus`, and documenting the `activeSlice` invariant. The architecture is substantially improved. However, the `DeferredItem` cross-epic routing gap is a real implementation hazard (the data model doesn't carry enough information), and the `activeSlice` invariant enforcement description is inaccurate. These are tractable issues — fixing them would bring the score to 9+.

To reach 9+: (1) resolve `DeferredItem` epic qualification, (2) fix the `BEGIN_PLAN` enforcement description in the `activeSlice` invariant, (3) add a note about sequential enforcement migration in `slice-plan.ts`.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
