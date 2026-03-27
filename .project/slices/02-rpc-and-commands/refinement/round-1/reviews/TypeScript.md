## Issues

**[CRITICAL]** `buildSliceCompleteResult` receives bare `sliceName` but needs `epic` for nested paths
Description: The plan says to "update all 6 path references" in `buildSliceCompleteResult`, but the function signature on line 170 of `complete.ts` receives only `sliceName: string` -- not the epic name. The caller on line 157 passes `target.name` but not `target.epic`. Since all 6 internal path references must change from `slices/${sliceName}/...` to `epics/${epic}/slices/${sliceName}/...`, the function must also receive the epic name. The plan should explicitly state: change the function signature to accept `epicName: string` (or the full `target`) and update the call site on line 157 to pass `target.epic`. Without this, the implementer will discover mid-task that the path updates are impossible with the current signature.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `resolveActiveSlice` in `status.ts` uses hardcoded `slices/${name}/slice.json` path
Description: `status.ts` line 83 reads `getJson<Slice>(state, \`slices/${project.activeSlice}/slice.json\`)`. After the migration, slices live at `epics/${epic}/slices/${name}/slice.json`. The plan's status task only mentions updating `countArtifacts()` to read from `epics/overview.json`, but `resolveActiveSlice` (line 81-86) also uses the old flat path and will silently return `null` for active slices. Similarly, `checkStale` on line 247 uses `slices/${project.activeSlice}` as a scope prefix for activity log matching. Both must be updated to use `epics/${activeEpic}/slices/${activeSlice}` paths.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `slice:show` command uses hardcoded flat slice paths
Description: `src/commands/slice/show.ts` lines 36 and 42 use `slices/${args.slice}/slice.json` and `slices/${args.slice}` respectively. After migration, these must resolve through the epic-nested path. The plan lists `show.ts` as needing "derive epic for path resolution" but only in the context of `resolveEntityDir` -- however, `show.ts` does not use `resolveEntityDir`. It directly constructs paths via string templates. The task for `show.ts` must explicitly say: derive epic from `--epic` flag or `project.json.activeEpic`, then use `epics/${epic}/slices/${name}/slice.json` and `epics/${epic}/slices/${name}` for the `getJson` and `getDir` calls.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `context/index.ts` `resolveScope` uses flat `slices/${name}` path
Description: `src/core/context/index.ts` line 101 returns `slices/${target.name}` for the scope of slice targets. This is used for learnings scope resolution. After migration, this should be `epics/${target.epic}/slices/${target.name}`. The plan covers `priorities.ts` (the `entityDir` function, which has the `TODO(slice-02)` annotation) but does not mention `resolveScope` in `context/index.ts`. Since the Target type already has `epic` available, this is a straightforward fix but it is currently missing from the plan.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `priorities.ts` `completeSources` uses hardcoded `slices/overview.json` path
Description: `src/core/context/priorities.ts` line 67 has `{ key: "slices-overview", path: "slices/overview.json", sourceType: "markdown" }`. After migration, slices overview is embedded in `epics/overview.json`. The plan mentions the `entityDir()` TODO fix in `priorities.ts` but does not mention updating `completeSources`. This will cause the context bundler to look for a non-existent file during the "complete" phase.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `slice:list` needs more guidance on reading from `epicOverviewSchema`
Description: The plan says `list.ts` should "read `epics/overview.json`, find epic entry, return its `slices` array." However, the current code uses `Overview` type with `overviewSchema`. The new `epicOverviewSchema` has a different structure -- `EpicOverviewItem` contains a `slices: SliceOverviewItem[]` array, where `SliceOverviewItem` omits `epic` and `title` fields. The plan should specify: (1) change the import from `Overview`/`overviewSchema` to `EpicOverview`/`epicOverviewSchema`, (2) flatten the nested structure for output (epic name comes from the parent, not each slice item), (3) update the `--epic` filter to select the epic entry first then return its slices rather than filtering a flat list. The `--all` flag mentioned in the plan would iterate all epic entries and merge their slices arrays.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `noUncheckedIndexedAccess` handling in `buildSliceCompleteResult` deferred routing loop
Description: `complete.ts` lines 213-216 access `newTarget.deferred[i]` with the `noUncheckedIndexedAccess` guard (`d !== undefined`), which is correct. However, the plan says "update path references" for lines 208-209 where `item.name` is used to construct `slices/${item.name}/slice.json`. After migration to `epics/overview.json`, the iteration changes from walking `overview.items` (which has `item.name` and `item.epic`) to walking epic-specific slice arrays (which have `SliceOverviewItem` without `epic`). The plan should specify how to resolve the epic name for deferred routing targets -- they may belong to different epics than the completing slice. This requires iterating all epics' slice arrays and constructing the correct nested path for each.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not address `slice:show` adding `--epic` flag
Description: Other slice commands (create, plan, etc.) derive `epic` from `--epic` flag or `project.json.activeEpic`. The plan lists `show.ts` as needing "derive epic for path resolution (from --epic or active epic)" but does not mention adding the `--epic` flag to the command's `args` definition. Currently `show.ts` only has `--slice`. An `--epic` flag should be added for consistency, defaulting to active epic.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan verification section does not test `slice:show` with nested paths
Description: The Verification section lists `slice:list --json` and `slice:show --json` in the CLI test sequence, but the Expected Behavior "after" checks only verify annotation counts and test pass counts. Adding a specific Expected Behavior check for `slice:show --json` returning correct data would catch regressions in the path resolution.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10
The plan correctly identifies all 22 annotations and the mechanical work to clear them. However, it misses several hardcoded path references outside the annotated files -- `resolveActiveSlice` and `checkStale` in status.ts, `resolveScope` in context/index.ts, `completeSources` in priorities.ts, and direct path construction in `slice:show`. The `buildSliceCompleteResult` function signature issue means the path updates described in the plan are not implementable without a signature change. These are not edge cases -- they are primary code paths that will produce silent failures (returning null/undefined for valid entities) after migration. To reach 9+: address all hardcoded path references found outside the annotated locations, fix the `buildSliceCompleteResult` signature issue, and add guidance for the `epicOverviewSchema` structural differences in list/complete.

## Summary
- Critical: 3
- Important: 4
- Minor: 2
