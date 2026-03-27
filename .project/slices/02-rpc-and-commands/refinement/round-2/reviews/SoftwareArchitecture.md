# Software Architecture Review: RPC and Commands (Slice 02) — Round 2

## Issues

**[IMPORTANT]** Subagent commands lack specified mechanism for deriving epic name

The plan says "add `epic` to slice Target" for all 6 subagent commands (`start-plan`, `start-refinement`, `start-implementation`, `submit-plan`, `submit-refinement`, `submit-implementation`), but does not specify how they obtain the epic name. These commands have `--slice` and `--quest` flags but no `--epic` flag, and the plan does not instruct adding one. The `start-*` commands already call `loadState(projectDir)` and can read `project.json.activeEpic` from the assembled state. The `submit-*` commands call `resolveProjectDir()` but do not currently load state before constructing the Target — they would need to either (a) add a `loadState` call to read `activeEpic` before constructing Target, or (b) add `--epic` flag. The plan should specify the pattern: read `project.json.activeEpic` from state (consistent with how the slice mutation commands handle it), and note that `submit-*` commands need a new `loadState` call specifically for this purpose. Without this, implementers may choose inconsistent approaches across the 6 files.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete.ts` cross-epic deferred routing is underspecified

The plan (line 41) says "Handle cross-epic deferred targets by resolving each target's epic independently" but does not specify the mechanism. Currently, deferred items are `{ description, targetSlice }` (string fields). `targetSlice` is a bare slice name with no epic qualifier. After restructuring, to route a deferred item to `epics/${epicName}/slices/${targetSlice}/slice.json`, the code needs to know which epic the target belongs to. The plan's restructured iteration walks the current epic's embedded slices array — but if a deferred target names a slice in a different epic, that walk will miss it. The plan should specify: (a) whether deferred targets are always within the same epic (simplifying to just the current epic's slices array), or (b) if cross-epic is supported, the resolution algorithm (walk all epics in overview to find which epic contains the target slice name). Given the `activeSlice` invariant (always scoped to `activeEpic`), same-epic-only is likely correct and should be stated explicitly as a simplifying constraint.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `slice:list` output format change not covered in Expected Behavior checks

The plan specifies that `SliceOverviewItem` omits `epic` and `title` fields compared to the old `OverviewItem`. The human-readable format currently outputs `(epic: ${item.epic})` per slice (line 53 of `list.ts`). After restructuring, `SliceOverviewItem` no longer has `epic` — the human-readable format must change. The plan's Expected Behavior check `slice:list --json` would catch JSON shape issues, but there is no check for the human-readable output format. A minor verification gap.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `resolveEntityJsonPath` already returns nested paths — potential state lookup failures during transition

`resolveEntityJsonPath` in `types.ts:233` already returns `epics/${target.epic}/slices/${target.name}/slice.json` (updated in slice 01). This means `buildBeginResult` in `begin.ts` (line 363) and `resolveStatuses` in `submit.ts` (line 221) already use nested paths to look up slice state — they will work correctly only when the state tree has slices at nested paths. Since this slice is a big-bang migration (CLI and data updated together), this is correct: callers pass `epic` in Target, `resolveEntityJsonPath` returns nested path, and the state tree has the slice at that path. However, the plan should note that `begin.ts` and `submit.ts` result builders do NOT need path updates — they already use `resolveEntityJsonPath` which is correct. This avoids an implementer wasting time searching for paths to update in those files' result-building code.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has comprehensively addressed all round 1 feedback. All 3 critical issues (buildSliceCompleteResult signature, status.ts paths, slice:show paths) are now fully specified with line numbers and concrete changes. The 7 important issues from round 1 are resolved: slice:list data access pattern is concrete, deferred routing describes the structural change, priorities.ts overview path is covered, context/index.ts scope is covered, submit.test.ts is listed, and create vs other commands are distinguished. The two remaining important issues are: (1) subagent epic derivation mechanism is unspecified (pattern is clear but mechanism is not), and (2) cross-epic deferred routing needs clarification. Neither is likely to cause incorrect implementation — both have obvious correct answers — but specifying them prevents inconsistency.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
