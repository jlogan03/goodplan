# Software Architecture Review: RPC and Commands (Slice 02)

## Issues

**[CRITICAL]** `buildSliceCompleteResult` uses 6 hardcoded `slices/${name}` paths that must become `epics/${epic}/slices/${name}`
The plan mentions "update all 6 path references to use nested paths" for `buildSliceCompleteResult()` in `complete.ts`, but the task description is too vague to ensure correctness. Lines 176-177 read `slices/${sliceName}/slice.json` for both old and new state. Line 188 reads `slices/overview.json`. Lines 206-208 iterate siblings using `slices/${item.name}/slice.json`. Line 259 reads `slices/${sliceName}/architecture-deltas.jsonl`. These 6 references form a tightly coupled cluster. The fix requires the epic name, but `buildSliceCompleteResult` currently receives only `sliceName: string` -- it needs the epic name passed in. The plan does not specify this signature change. Additionally, the overview read on line 188 (`slices/overview.json`) must change to read from `epics/overview.json` and navigate the nested structure (find the epic entry, iterate its `.slices` array). The current code filters `overview.items` by `item.epic === newSlice.epic` -- after restructuring, the logic must find the epic entry in `items` and iterate its embedded `slices` array. This is a structural change to the iteration logic, not just a path swap.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `status.ts` has 3 additional hardcoded `slices/` paths beyond `countArtifacts` that the plan does not mention
The plan lists only `countArtifacts()` for status.ts updates. But `resolveActiveSlice()` (line 83) reads `slices/${project.activeSlice}/slice.json` -- this must become `epics/${project.activeEpic}/slices/${project.activeSlice}/slice.json`. Similarly, `checkStale()` is called (line 247) with scope prefix `slices/${project.activeSlice}` -- this should become `epics/${project.activeEpic}/slices/${project.activeSlice}` to match the new activity log scope format (per the epic architecture doc's "Documentation Update Phase" table: activity-log scope changes from `slices/${name}` to `epics/${epic}/slices/${name}`). If these paths are not updated, `resolveActiveSlice` will return `null` for every active slice (state tree no longer has `slices/` at the top level), and stale warnings will never trigger for slices.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `slice:show` command has 2 hardcoded `slices/${name}` paths the plan underspecifies
The plan lists `show.ts` with "derive epic for path resolution (from --epic or active epic)" but `show.ts` does not use `resolveEntityDir` -- it directly reads `slices/${args.slice}/slice.json` (line 36) and `getDir(state, slices/${args.slice})` (line 42). Both must become `epics/${epic}/slices/${args.slice}/...`. The plan must specify: (a) add `--epic` flag or read from `project.json.activeEpic`, (b) update both path references. Without this, `slice:show` will fail with "Slice not found" for every slice after migration.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `slice:list` plan description is incomplete -- needs concrete data access pattern
The plan says "read `epics/overview.json`, find epic entry, return its `slices` array" but the current code reads `slices/overview.json` (line 36) which returns `{ items: [...] }` with a flat list. After restructuring, `epics/overview.json` has `{ items: [{ name, status, slices: [...] }] }` -- the code needs to: (1) read `epics/overview.json`, (2) for `--epic` or active epic, find the matching entry and return its `slices` array, (3) for `--all`, flatten all epics' `slices` arrays. The plan mentions `--all` flag but doesn't specify the flattening/aggregation logic. Also, the `Overview` type import may need to change to use the new `EpicOverview` type (or whatever the schema type for `epicOverviewSchema` is). The plan should specify the exact type to use.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** `slice:create` already has `--epic` flag and passes `epic` in payload but not in Target
The plan says "construct Target with `epic` from `--epic` flag or `project.json.activeEpic`". Looking at the actual code (line 42-43), create.ts already has `args.epic` available (it's a required arg, line 29). The fix is just adding `epic: args.epic` to the Target literal on line 43. However, the plan says "from `--epic` flag or `project.json.activeEpic`" -- for `slice:create`, `--epic` is already required (line 30: `required: true`). The other 5 slice mutation commands (`plan`, `refine-plan`, `implement`, `complete`, `abandon`) do NOT have `--epic` flags and need to derive epic from `project.json.activeEpic`. The plan uses the same description for all 6 commands, obscuring this important distinction: `create` already has the flag, the rest need to read from project state. The plan should distinguish these two patterns to avoid the implementer adding a redundant `--epic` flag to commands that should use active epic.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `buildSliceCompleteResult` signature change specification
As noted in the first critical issue, `buildSliceCompleteResult(sliceName, entity, oldState, newState)` needs the epic name. The caller `buildCompleteResult` (line 157) has access to `target.epic` since `target.type === "slice"`. The plan should specify: change signature to `buildSliceCompleteResult(sliceName, epicName, entity, oldState, newState)` and pass `target.epic` from the call site. This is architecturally important because it determines whether epic name flows through function parameters (clean) or is re-extracted from state inside the function (duplicated logic).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete.ts` deferred routing loop iterates via `overview.items` -- needs restructured iteration
Lines 206-219 of `complete.ts` iterate `overview.items` to find sibling slices. After restructuring, this must iterate the epic's embedded `slices` array, then look up each sibling at `epics/${epicName}/slices/${item.name}/slice.json`. The plan says "read sibling slices from `epics/overview.json` embedded array" but doesn't specify the new iteration pattern. The current code uses `overview.items` as a flat list and reads `slices/${item.name}/slice.json` -- this needs two changes: (1) find the right epic entry in the overview, (2) read from nested paths. The plan should make this explicit.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test task list may be incomplete -- `submit.test.ts` not explicitly listed
The plan lists `begin.test.ts`, `complete.test.ts`, `paths.test.ts` for test updates but does not explicitly list `submit.test.ts`. Since `submit.ts` has 3 `@ts-expect-error` annotations being cleared, its tests will need `epic` added to slice Target fixtures and event assertions. The catch-all "Update any other unit test files that construct slice Targets" partially covers this, but an explicit listing would prevent oversight.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `status.ts` `generateWarnings` scope prefix will diverge from activity log format
After the restructuring, activity log entries for slices will use scope `epics/${epic}/slices/${name}` (per epic architecture doc). The `checkStale` call on line 247 passes `slices/${project.activeSlice}` as `scopePrefix`. This must change to `epics/${project.activeEpic}/slices/${project.activeSlice}`. The plan does not mention this change.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not mention `rpc-layer-api.md` documentation update
The research notes flag `rpc-layer-api.md` as stale (still shows old Target type without `epic`). The epic architecture's "Documentation Update Phase" table lists it for update. While doc updates may be deferred to a later slice, the plan's Verification section should at minimum note this as a known gap, or the plan should include a task to update it.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies all 22 annotation locations and the mechanical fixes (adding `epic` to event builders, adding `epic` to command Targets). However, it significantly underspecifies the data access pattern changes needed in `complete.ts` (6 path references + iteration logic restructuring), misses 3 path references in `status.ts`, and underspecifies the `show.ts` and `list.ts` changes. These are not minor omissions -- they represent the majority of the architectural complexity in this slice. The annotation-clearing work is straightforward; the path migration and overview data access restructuring are where bugs will hide. To reach 9+: (1) fully specify the `buildSliceCompleteResult` changes including signature, new iteration pattern for deferred routing, and all 6 path updates; (2) add the 3 missing `status.ts` path updates; (3) specify `show.ts` path changes explicitly; (4) specify `list.ts` data access pattern with type changes; (5) distinguish the `create` (already has --epic) vs other commands (need activeEpic) patterns.

## Summary
- Critical: 3
- Important: 4
- Minor: 3
