## Issues

**[IMPORTANT]** Slice commands need a mechanism to read `project.json.activeEpic` but plan does not specify how
Description: Commands like `plan.ts`, `refine-plan.ts`, `implement.ts`, `complete.ts`, and `abandon.ts` currently only import `resolveProjectDir` and `begin` -- they never call `loadState` or read `project.json`. The plan says "derive `epic` from `project.json.activeEpic`" but does not specify the mechanism. There is no existing `resolveActiveEpic` helper in the commands layer (only in `status.ts` and `context/index.ts`, both with different signatures). The implementer needs guidance: either (a) add a shared helper like `requireActiveEpic(projectDir): string` that reads `project.json` and throws if `activeEpic` is null, or (b) use `loadState` + `getJson` inline in each command. Option (a) is strongly preferred -- it avoids duplicating the `loadState`+`getJson`+null-check pattern across 6+ commands and keeps the error message consistent. The plan should specify creating this helper (or reusing an existing one) and importing it in each affected command.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Context test files construct bare slice targets that will fail at runtime
Description: `tests/unit/context/startContext.test.ts` has 9 instances of `{ type: "slice", name: "01-data-layer" }` without `epic`. The plan says "context unit tests are slice 03" (line 46), but after this slice updates `resolveScope()` and `entityDir()` to use `target.epic`, these context tests will fail at runtime with `undefined` in path strings (e.g., `epics/undefined/slices/01-data-layer`). Since tests are excluded from `tsconfig.json`, `tsc --noEmit` won't catch this. The plan's verification includes `bun test tests/unit/` which WILL catch it. Either (a) the context tests must be updated in this slice (contradicting the "slice 03" note) or (b) the plan should explicitly add `@ts-expect-error`-style annotations or note that some context tests are expected to break and will be fixed in slice 03. Option (a) is cleaner -- the context code changes live in this slice, so the corresponding test fixes should too.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `buildSliceCompleteResult` deferred routing loop needs cross-epic iteration strategy
Description: The plan says to "handle cross-epic deferred targets by resolving each target's epic independently" (line 41) but does not specify the implementation. Currently the loop iterates `overview.items` (flat list). After migration to `epicOverviewSchema`, the data is nested: `overview.items[].slices[]`. The plan should specify: iterate all `overview.items` (epics), then for each epic iterate its `slices` array, constructing paths as `epics/${epicItem.name}/slices/${sliceItem.name}/slice.json`. This is not just a path swap -- it is a structural change from a single flat loop to a nested loop. The deferred item's target slice could be in any epic, so the loop must walk all epics. This guidance is partially present but the "resolve each target's epic independently" phrasing is ambiguous about the iteration strategy.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `data/tree.test.ts` and `state.test.ts` reference `slices/overview.json` in fixtures
Description: `tests/unit/data/tree.test.ts:315` and `tests/unit/commands/state.test.ts:74` write fixtures to `slices/overview.json`. If the data layer or state machine changes to expect `epics/overview.json`, these may need updating. The plan's "Update any other unit test files" catch-all should cover these, but the plan should explicitly list them since they are not obvious from the `@ts-expect-error` annotation search.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `refineSlicesSources` in `priorities.ts` uses bare `slices` path for slice definitions
Description: `src/core/context/priorities.ts` line 111 has `{ key: "slice-definitions", path: "slices", sourceType: "directory" }`. After migration, slice definitions live under `epics/${epic}/slices/`. This is not covered by the plan's `priorities.ts` task, which only addresses `entityDir()` and `completeSources`. If the "slices" directory no longer exists at the top level, this source will silently resolve to nothing. However, this may be intentional if slice definitions as context are being deferred -- worth noting.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
All 3 critical issues from round 1 have been addressed: `buildSliceCompleteResult` signature now includes `epicName`, `resolveActiveSlice`/`checkStale` in status.ts are covered, and `slice:show` hardcoded paths are fixed with `--epic` flag addition. All 4 important issues from round 1 are also resolved: `resolveScope` in context/index.ts, `completeSources` in priorities.ts, `slice:list` epic overview guidance, and deferred routing loop. The plan is now implementable end-to-end. Remaining issues are about implementation guidance gaps (how commands read activeEpic, context test breakage, nested loop strategy) rather than missing work items. To reach 9+: add the shared `requireActiveEpic` helper guidance, clarify context test handling, and make the deferred routing nested iteration explicit.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
