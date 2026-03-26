# API Contract Review: Entity Restructuring Architecture

## Issues

**[CRITICAL]** Slice events missing `epic` field breaks state machine path resolution

The architecture proposes that all slice transition handlers change from `slices/${event.slice}` to `epics/${event.epic}/slices/${event.slice}`. However, the affected-apis.md only shows `epic` being added to `CREATE_SLICE` events — the data-model-changes.md says "All slice events gain an `epic` field" but the current `StateEvent` type (in `src/schemas/state-events.ts`) has `BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, `COMPLETE_REFINEMENT_ROUND`, `BEGIN_IMPLEMENTATION`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_SLICE`, and `ABANDON_SLICE` all carrying only `slice: string` (no `epic`). The architecture must specify exactly which events gain `epic` and clarify the alternative: the handler could derive the epic from the state tree (reading `project.json.activeEpic` or walking the epic's `slices` array). Today, `handleBeginPlan` already reads `sliceOrErr.epic` from `slice.json` to find the parent epic. If `epic` is removed from `slice.json` (as data-model-changes.md says: "drops `epic` field — now encoded in path"), then the handler can no longer derive it from the entity. The architecture must pick one consistent approach and document it:

- **Option A**: Add `epic` to every slice event. This requires changes to all event construction in `begin.ts`, `submit.ts`, `complete.ts`.
- **Option B**: Keep `epic` on `slice.json` (don't drop it). Handlers continue deriving from the entity. Path is denormalized but safe.
- **Option C**: Require callers to always pass epic via `Target`, and have the RPC layer inject it into events. Document the injection point.

Currently the architecture contradicts itself: data-model-changes.md says `slice.json` "drops `epic` field" AND that "All slice events gain an `epic` field" but neither the `StateEvent` type change nor the event construction changes are specified in enough detail to implement.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `updateSliceOverviewStatus` contract changes incompletely specified

The architecture says `updateSliceOverviewStatus(state, name, ...)` gains an `epic` parameter and "updates embedded slice in `epics/overview.json` epic item." This is a fundamentally different data structure traversal: instead of finding an item by name in a flat array (`slices/overview.json.items`), it must find the epic item in `epics/overview.json.items`, then find the slice within that epic's `slices` array. The architecture should specify:

1. The new function signature: `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)`
2. The lookup algorithm: find epic by name in `epics/overview.json.items`, then find slice by name in `epic.slices`
3. Error handling: what happens if the epic or slice is not found in the overview? Currently `updateSliceOverviewStatus` silently returns `state` if `slices/overview.json` is missing. Should the same apply for a missing epic entry?
4. The `addSliceToOverview` equivalent: `CREATE_SLICE` currently appends to `slices/overview.json.items`. The new version must append to the correct epic's `slices` array. This function doesn't exist yet and is not mentioned by name in the architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `epic.sliceSequence` redundant with overview `slices` array order — migration ambiguity

The architecture proposes that "Slice array order = sequencing (replaces `sequencing.md`)." Currently, `epic.json` has a `sliceSequence` field that defines ordering, and `handleBeginPlan` uses it for sequential enforcement (line 43: `epic.sliceSequence.indexOf(event.slice)`). After restructuring, `epics/overview.json` also has an ordered `slices` array per epic. The architecture doesn't address whether `epic.sliceSequence` is kept, removed, or replaced by the overview's `slices` array. This creates two potential sources of truth for slice ordering:

- `epic.json.sliceSequence` (used by guards)
- `epics/overview.json.items[].slices` (ordered array, the new canonical sequence per the overview)

The architecture should explicitly state: (a) `sliceSequence` is removed from `epic.json` and sequential enforcement reads from `epics/overview.json`, OR (b) `sliceSequence` remains the source of truth for guards and the overview array is kept in sync. Option (a) is cleaner but changes the guard's data dependency. Option (b) preserves existing guard logic but adds a sync obligation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Schema registry changes incomplete — tasks overview pattern preserved but tasks not restructured

The affected-apis.md shows the schema registry changing `epics/overview.json` from `overviewSchema` to `epicOverviewSchema` (a new schema with embedded slices). However, the architecture doesn't address that the existing `overviewSchema` is shared across epics, slices, quests, and tasks overviews. After removing `slices/overview.json`, the registry still uses `overviewSchema` for `quests/overview.json` and `tasks/overview.json`. The new `epicOverviewSchema` needs to be a separate schema, not a replacement. The data-model-changes.md defines the Zod schemas correctly (`sliceOverviewItemSchema`, `epicOverviewItemSchema`, `epicOverviewSchema`) but the affected-apis.md section on schema registry shows a comment "changed schema" without clarifying that `overviewSchema` must still exist for quests and tasks. Spell this out to avoid an implementer accidentally removing the shared `overviewSchema`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** State Key Dependencies table in `state-machine-api.md` needs updating but not mentioned

The architecture modifies every slice event's read/write paths (e.g., `CREATE_SLICE` reads `slices/overview.json` -> now reads `epics/overview.json`). The State Key Dependencies table in `state-machine-api.md` documents these paths as a contract. The architecture should flag that this table must be updated as part of the restructuring. Without this, the documented contract diverges from implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `hasChild` guard paths need updating but not enumerated

Several state machine guards use `hasChild(state, "slices/${event.slice}", "plan.md")` and similar patterns. After restructuring, these become `hasChild(state, "epics/${event.epic}/slices/${event.slice}", "plan.md")`. The architecture mentions path changes for transition handlers but does not enumerate the guard path changes. Since these guards gate critical transitions (`COMPLETE_PLAN` requires `plan.md`, `BEGIN_IMPLEMENTATION` requires `plan-refined.md`), the exact new paths should be specified. This ties back to the critical issue above — the guard needs the epic name, which must come from somewhere.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Activity log `scope` field format change not documented

All transition handlers write activity log entries with `scope: "slices/${event.slice}"`. After restructuring, these should presumably become `scope: "epics/${event.epic}/slices/${event.slice}"` to match the new path structure. The architecture doesn't mention this change. While not breaking (the scope field is informational), inconsistency between paths in the activity log and actual filesystem paths would be confusing for debugging.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `Target` type in architecture vs codebase — missing `project`, `decision`, `rollup` variants

The data-model-changes.md shows the `Target` type with 4 variants (epic, slice, quest, task). The actual codebase `Target` type (in `src/core/rpc/types.ts`) has 7 variants including `project`, `decision`, and `rollup`. The architecture should use the complete type to avoid confusion during implementation. The slice variant change `{ type: "slice"; name: string; epic: string }` is correct — just ensure the full union is shown.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `resolveEntityName` not mentioned but affected

`resolveEntityName(target)` in `src/core/rpc/types.ts` returns just the name for display/logging. For slices, it currently returns `target.name`. The architecture says this is "unchanged" in affected-apis.md. However, with the epic field now on the target, callers may want `${epic}/${name}` for disambiguation. Not critical (display only), but worth a conscious decision.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The architecture correctly identifies the major structural changes and their cascading effects. However, the critical gap around how slice events obtain the `epic` field — combined with the contradictory removal of `epic` from `slice.json` — would block implementation. The `sliceSequence` vs overview array ordering ambiguity creates a dual-source-of-truth risk. Addressing the two CRITICAL issues and the four IMPORTANT issues would bring this to 9+. The overall direction is sound; the issues are about specification completeness, not design direction.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
