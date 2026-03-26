## Issues

**[IMPORTANT]** Phase 1 `@ts-expect-error` count is underestimated and the strategy is fragile

The plan says to add `@ts-expect-error` on handler call sites that break until Phase 2. Codebase exploration reveals at least 18 call sites across 5 handler files that will need annotations: 9 `getSlice()` calls, 1 `setSliceJson()` call, and 8 `setSliceStatus()` calls — plus 3 RPC-layer annotations (`resolveEntityDir`, `entityDir`, out-of-scope sites). The plan lists the RPC annotations explicitly but only vaguely says "handler call sites" for the state machine ones.

This is fragile for two reasons: (1) an implementer may miss some, causing unexpected compile errors; (2) `@ts-expect-error` suppresses ALL errors on the annotated line, not just the argument-count mismatch — so if someone introduces a different type bug on that line during Phase 2, it will be silently swallowed until the annotation is removed.

The plan should either enumerate the exact file:function pairs needing annotations (slice-plan.ts:handleBeginPlan, slice-complete.ts:handleCompleteSlice, slice-implement.ts handlers, slice-submit.ts handlers, slice-abandon.ts:handleAbandonSlice) or — better — change Phase 1 to only update helper *signatures with overloads* that accept both the old `(state, name)` and new `(state, epic, name)` arities. The old overload delegates to the new one with a hardcoded lookup. This eliminates `@ts-expect-error` entirely. Phase 2 then removes the old overloads and updates call sites.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `resolveEntityJsonPath` update in Phase 1 is correct but `resolveEntityName` needs verification

The plan correctly says `resolveEntityJsonPath` must update its slice case to `epics/${target.epic}/slices/${target.name}/slice.json`. However, for `resolveEntityName` (line 206), the plan says "needs no logic change (still returns `target.name`), but add `target.epic` awareness if discriminant changes require it." The discriminant does NOT change — it's still `{ type: "slice" }` — so no code change is needed. But the plan's hedge ("if discriminant changes require it") is confusing and could lead an implementer to add unnecessary code. The plan should simply say: "No change needed — `resolveEntityName` returns `target.name` which is still correct."

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `slice-complete.ts` deferred routing with `targetEpic` needs `noUncheckedIndexedAccess`-safe implementation guidance

The plan (Phase 2, line 140) says: "populate `targetEpic` from `event.epic` when routing cross-epic; omit for same-epic." But the actual deferred routing code (slice-complete.ts line 52) calls `getSlice(tree, item.targetSlice)` — after the signature change this becomes `getSlice(tree, epicForItem, item.targetSlice)`. The logic to resolve `epicForItem` should be: `item.targetEpic ?? event.epic`. This is straightforward, but the plan should spell out the exact expression since `item.targetEpic` is `string | undefined` (optional in the schema) and the nullish coalescing is the correct pattern. Without this, an implementer might use `item.targetEpic || event.epic` which has different behavior for empty strings (though `z.string().min(1)` prevents that at the schema level).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `epicOverviewItemSchema` should use `.extend()` from `overviewItemSchema` — plan already suggests this but should commit to it

Phase 1 task says: "Consider deriving via `overviewItemSchema.pick()` or `.omit()` to reduce duplication." The `epicOverviewItemSchema` uses `.extend()` (correct — per data-model-changes.md), but `sliceOverviewItemSchema` is defined standalone. Since `sliceOverviewItemSchema` is `{ name, status, created, completed }` which is exactly `overviewItemSchema` without the optional `epic` and `title` fields, using `overviewItemSchema.omit({ epic: true, title: true })` would be more maintainable. The plan should commit to this approach rather than leaving it as a "consider" — maintaining two parallel field definitions is a maintenance hazard when `overviewItemSchema` evolves.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `updateSliceOverviewStatus` implementation needs nested update pattern

The plan says `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)` finds the epic in `epics/overview.json`, then updates the slice in its `slices` array. The implementation requires a double-nested map: map over `items` to find the epic, then map over `item.slices` to find the slice. This is a common source of bugs (forgetting to spread the outer item). The plan should show the update pattern or at least note that the implementation must spread the epic item with the updated slices array:

```typescript
items: overview.items.map(item =>
  item.name === epicName
    ? { ...item, slices: item.slices.map(s => s.name === sliceName ? { ...s, status: newStatus } : s) }
    : item
)
```

This is not a type safety issue per se, but omitting the spread pattern in a plan that specifically calls out `INV-005` schema validation is worth noting.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 critical issues are resolved. The plan now correctly handles `DeferredItem.targetEpic` as optional, explicitly updates `updateOverviewStatus`/`addEpicToOverview` to use `EpicOverview`, and adopts the `@ts-expect-error` strategy for Phase 1 compilation. The remaining issues are: (1) the `@ts-expect-error` strategy is fragile and underspecified — enumerating exact sites or using overloads would be more robust; (2) two implementation details (deferred routing expression, nested update pattern) should be spelled out to prevent common bugs. Addressing the @ts-expect-error enumeration and committing to `.omit()` for `sliceOverviewItemSchema` would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
