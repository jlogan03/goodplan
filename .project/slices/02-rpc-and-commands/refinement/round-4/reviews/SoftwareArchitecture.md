# Software Architecture Review — Slice 02: RPC and Commands

Iteration: 4 | Reviewer: SoftwareArchitecture

## Issues

**[IMPORTANT]** `buildSliceCompleteResult` signature mismatch: plan says add `epicName: string` parameter and update call site, but actual call site at line 157 passes only `(target.name, entity, oldState, newState)` — four arguments, not five. The plan's description is correct about _what_ to fix, but the call site update instruction may mislead: the call site at line 157 (`buildSliceCompleteResult(target.name, entity, oldState, newState)`) will need to become `buildSliceCompleteResult(target.name, target.epic, entity, oldState, newState)` — i.e., `epicName` inserts as the second parameter, shifting `entity` to third. The plan says "add `epicName: string` parameter" without specifying position; if the implementer appends it at the end, the 5 path reference updates inside the function will work correctly but the call site will silently compile wrong. Make the parameter position explicit: `buildSliceCompleteResult(sliceName: string, epicName: string, entity: string, ...)`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Deferred routing loop restructure scope is broader than the plan acknowledges. The plan says to update `overview.items` iteration in the deferred routing block (lines 206-219) to use nested epic-aware flattening. However, the current code at lines 206-219 reads `slices/${item.name}/slice.json` for each overview item — those paths also need updating to `epics/${item's epic}/slices/${item.name}/slice.json`. The plan's task bullet says "Must preserve per-item epic name during flattening — e.g., map to `{ epicName, ...sliceItem }` tuples" which implies the path fix is included, but does not explicitly call it out. The architecture-deltas path at line 259 is correctly flagged for separate attention; the deferred routing path at line 208 deserves the same explicit callout. Low risk of being missed given the plan's detailed treatment, but the gap exists.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `resolveActiveEpic` in `src/core/context/index.ts` (line 91-95) reads `project.json` from state via `getJson` — this is correct and works today. However, after `resolveScope()` is updated to use `target.epic` for slices (the plan's Context Layer change), there is an asymmetry: `entityDir()` in `priorities.ts` will use `target.epic` directly, but `resolveScope()` in `index.ts` currently derives its path from `target.name` only. The plan addresses `resolveScope()` update correctly. However, a new concern emerges: if a slice Target is constructed by a `start-*` command using `requireActiveEpic`, but the `activeEpic` in `project.json` has since changed (e.g., a different terminal activated a new epic), the Target's `epic` and the state's `project.json.activeEpic` could diverge — `resolveActiveEpic` would return a different epic than `target.epic`. For context bundling (read-only), this is a minor inconsistency risk; the plan does not need to resolve it in this slice. Worth noting as a known limitation but not a blocker.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `requireActiveEpic` placement in `src/commands/slice/utils.ts` is appropriate, but the plan does not specify what error code to use when `activeEpic` is null. INV-007 requires structured errors with namespaced codes. The function should throw a `GoodplanError` with an appropriate code (e.g., `"NO_ACTIVE_EPIC"` or consistent with existing error taxonomy). Without this, an implementer may use a generic throw or a non-standard code. Worth adding to the task spec.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:list --all` grouping output: the plan says "group output by epic with epic name as a section header." This is consistent with the target architecture. However, since `SliceOverviewItem` omits the `epic` field (per `sliceOverviewItemSchema` which calls `.omit({ epic: true, title: true })`), the only way to know which epic a slice belongs to when rendering grouped output is to iterate `epicOverviewItem.slices` within each epic item — which is the correct approach. The plan implies this but does not state it explicitly. An implementer could iterate a flattened array with a synthetic `epicName` marker instead, which would work but is slightly awkward. Low risk; easy to infer from the schema.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** INV-004 (every command is stateless — target flags required) deserves a note. The plan introduces `requireActiveEpic` which reads ambient state (`activeEpic` from `project.json`) rather than requiring an explicit flag. This is a pragmatic relaxation of INV-004 for usability (already established by the pre-existing `--slice` flag not requiring `--epic` on mutation commands). The plan correctly distinguishes `create.ts` (required `--epic` flag, fully explicit) from the others (derive from active state). The invariant doc says "requires explicit target flags" — `requireActiveEpic` is a convention that the active epic is always ambient context, not a target. This is consistent with how `activeSlice` works today and is architecturally sound. No action needed, but the plan could note the INV-004 boundary explicitly for clarity. Out of scope for this slice.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is mechanically precise with strong codebase grounding. Annotation counts verified, file-level tasks are detailed, ordering concerns (context tests updated in same pass as scope/entityDir changes) are well-reasoned, and the deferred routing structural complexity is identified explicitly.

Two gaps bring it below 9: (1) the `buildSliceCompleteResult` parameter position ambiguity could cause a subtle call-site bug that compiles cleanly but passes wrong arguments; (2) the deferred routing inner path fix (`slices/${item.name}` → nested path) is implied but not explicitly stated alongside the structural change. Both are DIRECTLY_ACTIONABLE and low-effort to address in the plan text.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
