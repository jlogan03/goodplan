## Issues

**[CRITICAL]** Plan says `targetEpic` is required on `DeferredItem`, but architecture says optional

Phase 1 task says: "Add `targetEpic: string` to `DeferredItem` type" (required). But the epic architecture doc (`data-model-changes.md`) specifies `targetEpic: z.string().min(1).optional()` with explicit reasoning: defaults to completing slice's epic when absent. The plan must match the architecture — making it required would break the common case where deferred items target the same epic and callers should not need to specify it.

Additionally, the plan says to look in `src/schemas/commands/submit.ts` for `DeferredItem`, but it's actually defined in `src/schemas/entities/slice.ts` (line 18-22). The plan should reference the correct file.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `updateOverviewStatus` for epics will silently drop `slices` arrays

Phase 1 tasks mention updating `updateOverviewStatus` to use `EpicOverview` type and preserve `slices`, but this is listed as a separate bullet at the end rather than being highlighted as a schema-validation-breaking change. The current `updateOverviewStatus` (helpers.ts line 89-105) uses `getJson<Overview>` which returns `Overview` — a type that has no `slices` field. When the schema registry switches to `epicOverviewSchema` (which requires `slices`), the spread `{ ...item, status: newStatus }` will preserve `slices` at runtime (JS spreads all keys), BUT the `Overview` type annotation means TypeScript won't warn if someone accesses `item.slices` — it won't exist on the type. More critically, the `EpicOverview` type must be used for the `setEntry` call, otherwise `epicOverviewSchema` validation (INV-005) will fail on write because the Zod parse will expect `slices` on each item.

The plan should make this a Phase 1 task (not a trailing bullet) and explicitly state: change `getJson<Overview>` to `getJson<EpicOverview>` in `updateOverviewStatus`, and update the function signature to use `EpicOverview`/`EpicOverviewItem` types. Same applies to `addEpicToOverview`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 `tsc --noEmit` verification is contradictory

The Expected Behavior says `tsc --noEmit` should pass after Phase 1, with a parenthetical "(exhaustive switches will error until Phase 2 updates handlers — use `// @ts-expect-error` or update simultaneously)". This undermines the verification — adding `epic` to 8 slice events in `StateEvent` will immediately break every handler that destructures or uses those events, since `event.slice` references in `handleBeginPlan`, `handleCompleteSlice`, etc. still expect the old shape. The plan must either:

1. **Not add `epic` to existing events in Phase 1** — instead, do it in Phase 2 alongside handler updates. Phase 1 only adds the new schemas/types that don't break existing code.
2. **Accept that Phase 1 won't compile** and remove the `tsc --noEmit` verification from Phase 1.
3. **Do both phases atomically** (single phase).

Option 1 is cleanest — Phase 1 would add `epicOverviewSchema`, `sliceOverviewItemSchema`, update `Target`, update `DeferredItem`, update schema registry, and update `init.ts`/helpers for overview. Phase 2 would add `epic` to events AND update handlers together. This avoids `@ts-expect-error` noise.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `addSliceToOverview` needs the full slice overview item shape specified

The plan says "Create `addSliceToOverview(state, epicName, sliceItem)` in helpers.ts" but doesn't specify the type of `sliceItem`. It should be `SliceOverviewItem` (the new type from `epicOverviewItemSchema`'s embedded `sliceOverviewItemSchema`). The function signature should be:

```typescript
function addSliceToOverview(
  state: ProjectState,
  epicName: string,
  sliceItem: { name: string; status: string; created: string; completed: string | null },
): ProjectState
```

Or better, use the inferred type from `sliceOverviewItemSchema`. The plan should specify importing and using the Zod-inferred type to avoid drift.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Schema registry ordering matters — plan doesn't mention it

The schema registry uses first-match semantics (line 42-48 of `schema-registry.ts`). The plan says to change `slices/[^/]+/slice.json` to `epics/[^/]+/slices/[^/]+/slice.json`. The new pattern is more specific than the existing `epics/[^/]+/epic.json` pattern, but since they don't overlap, ordering is fine. However, the plan should explicitly note that the new nested slice pattern must be placed AFTER the epic.json pattern (or at minimum, that it doesn't conflict) to avoid subtle first-match bugs.

Also: the JSONL wildcard pattern `.*\/learnings\.jsonl$` (line 38) and `.*\/architecture-deltas\.jsonl$` (line 39) will correctly match the new nested paths (`epics/my-epic/slices/01-auth/learnings.jsonl`) without changes. The plan should note this explicitly to prevent someone from adding redundant patterns.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `guardSliceStatus` and `getSlice` signature changes cascade to `slice-plan.ts` sequential enforcement

Phase 2 says `getSlice(state, name)` becomes `getSlice(state, epic, name)`. But `handleBeginPlan` (line 29) calls `getSlice(state, event.slice)` BEFORE it knows the epic — it reads the epic name from the returned slice object (`sliceOrErr.epic`). After the signature change, the handler needs `event.epic` to call `getSlice`. This is fine because Phase 1 adds `epic` to `BEGIN_PLAN` event. But the plan should call out this dependency explicitly: Phase 2 helper signature changes depend on Phase 1 event changes being complete, and `handleBeginPlan` must switch from `sliceOrErr.epic` to `event.epic` for the initial `getSlice` call.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `sliceOverviewItemSchema` duplicates fields from `overviewItemSchema`

The architecture doc and plan both define `sliceOverviewItemSchema` as a standalone `z.object({ name, status, created, completed })`. This duplicates `overviewItemSchema` minus the `epic` and `title` optional fields. Consider using `overviewItemSchema.pick({ name: true, status: true, created: true, completed: true })` or `overviewItemSchema.omit({ epic: true, title: true })` to derive it, reducing maintenance surface. Minor because it still works either way.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `buildInitialEpicJson` types `verifications` as `string[]` instead of `Verification[]`

At helpers.ts line 449, `verifications: [] as string[]` is typed as `string[]`, but `epicSchema.verifications` is `z.array(verificationSchema)` — the Zod schema expects `Verification[]` objects. This pre-existing bug won't cause runtime issues (empty array passes both), but the type assertion is wrong. The plan should fix it to `[] as Verification[]` while touching this function to remove `sliceSequence`. Not blocking but cheap to fix.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 test updates are underspecified for `noUncheckedIndexedAccess`

With `noUncheckedIndexedAccess: true`, any array index access returns `T | undefined`. The plan's sequential enforcement migration (`epicItem?.slices.findIndex(...)`) is correct, but test code that constructs fixture state trees and accesses array elements (e.g., `overview.items[0]`) will need undefined-narrowing. The plan mentions updating test fixtures but should note that existing tests accessing overview items by index may need `!` assertions or proper narrowing after the shape changes.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan demonstrates thorough understanding of the codebase and correctly identifies all files needing changes. However, it has a critical inconsistency around `targetEpic` optionality (contradicting the architecture doc), a schema-validation-breaking issue with `updateOverviewStatus` that's buried as an afterthought, and a contradictory Phase 1 verification claim (tsc passing when adding `epic` to events will break all handlers). Fixing these three issues and clarifying the phase boundary for event changes would bring it to 9+.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
