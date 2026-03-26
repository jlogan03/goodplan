# Software Architecture Review: Slice Goal Definitions and Sequencing (Round 2)

## Issues

**[IMPORTANT]** goal-refining.md [01-schema-and-state-machine]: `DeferredItem.targetEpic` optional field creates ambiguity in deferred routing logic

Behavior item 12 adds `targetEpic?: string` to `DeferredItem`. But in `slice-complete.ts:52-68`, deferred routing calls `getSlice(tree, item.targetSlice)` and `setSliceJson(tree, item.targetSlice, ...)`. After restructuring, both need `epic` as a parameter (per Behavior item 5). If `targetEpic` is optional and a deferred item has `targetEpic: undefined`, the routing logic has no epic to resolve the target slice's path.

Currently all slices belong to an epic (the `slice.json` always has `epic: string`). There is no cross-epic deferred routing use case. Making `targetEpic` required would be simpler and safer -- the `COMPLETE_SLICE` event already carries `epic`, so the producing slice knows its epic, and the caller knows the target epic when constructing deferred items.

If the optional field is intentional for migration compatibility (old deferred items lack the field), the routing logic in `slice-complete.ts` must handle the undefined case explicitly -- either skip with a logged warning (like the missing-slice path) or infer the epic from context. Neither approach is specified.

Fix: Either (a) make `targetEpic` required (`targetEpic: string`) since new deferred items will always have an epic context, and handle migration of existing items in slice 05, or (b) add a Behavior item to slice 01 specifying how deferred routing handles `targetEpic: undefined` (e.g., fall back to the completing slice's own epic, or skip with activity log warning).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [01-schema-and-state-machine]: `slice-complete.ts` has ~10 flat path references beyond what Behavior item 14 covers

Behavior item 14 says "`slice-submit.ts` path references updated (5 flat path references -> nested)." However, `slice-complete.ts` (the most complex handler) has its own set of flat `slices/` path references that are not called out:
- Line 59: scope `\`slices/${event.slice}\`` (activity log)
- Line 64: `setSliceJson(tree, item.targetSlice, ...)` (deferred routing -- implicit flat path through helper)
- Line 73: `source = \`slices/${event.slice}\`` (learnings source)
- Line 82-83: `\`slices/${event.slice}/learnings.jsonl\`` (per-slice learnings read/write)
- Line 125-126: `\`slices/${event.slice}/architecture-deltas.jsonl\`` (deltas read/write)
- Line 149: scope `\`slices/${event.slice}\`` (activity log)

These are all in transition handlers (slice 01 scope) but `slice-complete.ts` is not mentioned in any Behavior item. Since it contains the most complex deferred routing + learnings + deltas logic, it warrants explicit mention.

Fix: Add a Behavior item: "`slice-complete.ts` path references updated for nested layout: learnings.jsonl, architecture-deltas.jsonl, deferred routing, and activity log scope strings all use `epics/${epic}/slices/${name}` format."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [02-rpc-and-commands]: `buildSliceCompleteResult` deferred routing in RPC layer also uses flat paths

`complete.ts:187` reads `slices/overview.json` and lines 207-208 use `slices/${item.name}/slice.json` to walk sibling slices for deferred routing and epicComplete derivation. Slice 02 Behavior item 4 covers `buildSliceCompleteResult` signature change and the structural change to read `epics/overview.json`, but the sibling-walking loop (lines 204-209) needs to navigate `items[].slices[]` within the epic overview and resolve nested paths. This is implicitly covered by "5 path-only changes + 1 structural change" but the structural change is actually more complex than described -- it requires navigating a two-level structure (epic -> slices) rather than a flat list.

Fix: Clarify that the structural change in `buildSliceCompleteResult` involves navigating the embedded `items[].slices[]` array rather than filtering flat overview items by `epic` field.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [01-schema-and-state-machine]: Verification missing grep for `slice-complete.ts` flat references

Verification items 6-8 grep for `slices/overview.json` in state and data directories, and `sliceSequence` in schemas. But there is no verification that *all* flat `slices/` path literals in transition handlers have been converted. `slice-complete.ts` has the most complex paths. A targeted grep would catch any missed references.

Fix: Add verification: `grep -r '"slices/' src/core/state/transitions/` -- zero matches (all converted to nested paths).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [05-tests-and-migration]: `DeferredItem` migration for existing data not addressed

If `targetEpic` is added to `DeferredItem` (required or optional), existing `slice.json` files on disk that contain `deferred` arrays will lack the field. Slice 05's migration code must populate `targetEpic` on any existing deferred items. This is not mentioned in slice 05's Behavior list. Given the current repo state this may be a zero-item case (no active deferred items), but the migration should handle it defensively.

Fix: Add a note to slice 05 that migration code should populate `targetEpic` on any existing `DeferredItem` entries in `slice.json` files, defaulting to the slice's own `epic` field.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 CRITICAL issues are properly fixed. Schema registry and epic overview helpers are correctly scoped to slice 01. The `addSliceToOverview` helper, `buildCompleteEvent` epic propagation, `entityDir()` in context layer, parallel dependency structure, rollback procedure, and skill file enumeration are all properly addressed. The remaining issues are about completeness of coverage within already-correct scope boundaries: the `DeferredItem.targetEpic` optionality ambiguity is the most significant (could cause a runtime error in deferred routing), and `slice-complete.ts` path references should be explicitly called out given the handler's complexity. Fixing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
