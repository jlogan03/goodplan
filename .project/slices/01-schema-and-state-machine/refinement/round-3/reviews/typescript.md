## Issues

**[IMPORTANT]** Function overload dispatch uses `arguments.length` — incorrect with TypeScript overloads

The plan (Phase 1, line 79) specifies that `getSlice` overload "implementation dispatches on arity (`arguments.length`)." This is incorrect for TypeScript. TypeScript overloads use a single implementation signature; arity dispatch is done via rest parameters or optional parameters, not `arguments.length`. In strict TypeScript with `verbatimModuleSyntax`, `arguments` is a legacy pattern that requires a function expression (not an arrow function) and doesn't work well with strict null checks. The correct pattern is:

```typescript
// Overload signatures
export function getSlice(state: ProjectState, name: string): Slice | undefined;
export function getSlice(state: ProjectState, epic: string, name: string): Slice | undefined;
// Implementation signature covers both
export function getSlice(state: ProjectState, epicOrName: string, name?: string): Slice | undefined {
  if (name === undefined) {
    // old path — @deprecated
    return getJson<Slice>(state, `slices/${epicOrName}/slice.json`);
  }
  return getJson<Slice>(state, `epics/${epicOrName}/slices/${name}/slice.json`);
}
```

Using `name?: string` (optional third parameter) and checking `name === undefined` is the idiomatic TypeScript overload dispatch. `arguments.length` is not needed and introduces ambiguity under `strictFunctionTypes`. The plan should replace the `arguments.length` prescription with the optional-parameter pattern.

Note: `exactOptionalPropertyTypes` is active — ensure the optional parameter uses `name?: string` (not `name: string | undefined`) to avoid issues at call sites, though here it's a function parameter (not an object property), so `exactOptionalPropertyTypes` does not apply.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `buildInitialEpicJson` type fix (`verifications: [] as string[]` → `[] as Verification[]`) requires import — plan should specify the import line

The plan (Phase 1, line 73) correctly identifies that `verifications: [] as string[]` should be `[] as Verification[]` and notes that `import type { Verification } from "../../../schemas/entities/epic.js"` must be added to `helpers.ts`. This is accurate — `helpers.ts` currently imports `Epic` and `EpicStatus` from that path but not `Verification`. The plan should be explicit about where in the import block the new import goes (alongside existing `epic.js` imports) so the implementer does not accidentally add a duplicate import line. This is a minor completeness issue.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 sequential enforcement migration is underspecified — `epic.sliceSequence` removal breaks `handleBeginPlan` in a non-obvious way

`handleBeginPlan` (slice-plan.ts line 43) uses `epic.sliceSequence` for sequential enforcement: it calls `epic.sliceSequence.indexOf(event.slice)` and looks up the previous slice in `slices/overview.json`. After Phase 1 removes `sliceSequence` from `epicSchema` and Phase 2 removes the `slices/overview.json` flat overview, both lookups must change. The Phase 2 plan (line 130) says "read from epic's embedded `slices` array in `epics/overview.json` instead of `epic.sliceSequence`" but does not specify how to determine slice ordering from the embedded array.

The ordering in the embedded `slices` array of `epicOverviewItemSchema` must be insertion-ordered (i.e., slices appended in creation order). The plan should make this explicit: the `slices` array in `EpicOverviewItem` is insertion-ordered, and `handleBeginPlan` finds the slice's index in `epicOverviewItem.slices` (replacing `epic.sliceSequence.indexOf(event.slice)`) and looks up the previous slice in the same array.

This is a correctness risk if an implementer assumes the embedded `slices` array is sorted by name rather than insertion order.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three round-2 IMPORTANT issues are resolved: `@ts-expect-error` strategy replaced with function overloads (correctly justified), `resolveEntityName` note cleaned up, `sliceOverviewItemSchema` committed to `.omit()`. The plan is now well-specified for the type-safety strategy. The remaining issues are: one IMPORTANT (overload dispatch must use optional-parameter pattern, not `arguments.length`), and two MINORs that improve implementer accuracy without affecting plan correctness. Fixing the `arguments.length` prescription brings this to 9.5+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
