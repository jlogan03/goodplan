# Software Architecture Review: Slice Goal Definitions and Sequencing

## Issues

**[CRITICAL]** goal-refining.md [01-schema-and-state-machine]: `updateOverviewStatus` type change not scoped to slice 01 but required before slice 01 can work

The plan says slice 01 updates `updateSliceOverviewStatus` to operate on the embedded `slices` array inside `epics/overview.json`. However, `updateOverviewStatus` (the *epic* overview helper at helpers.ts:89-105) currently reads `epics/overview.json` as `Overview` type. After slice 01 changes the schema to `epicOverviewSchema` (which requires a `slices` array on each item), every call to `updateOverviewStatus` that spreads the existing item will silently drop the `slices` array unless the type parameter is also updated to `EpicOverview`. The architecture doc (affected-apis.md) correctly identifies this: "Both `updateOverviewStatus` and `addEpicToOverview` must operate on `EpicOverview`." But slice 01's goal does not list `updateOverviewStatus` or `addEpicToOverview` as in-scope changes. These helpers are called by every epic lifecycle handler (activate, complete, abandon, all phase transitions). If slice 01 ships the new `epicOverviewSchema` in the registry without updating these helpers, schema validation (INV-005) will fail on every epic state transition because the spread items won't include `slices`.

Fix: Add `updateOverviewStatus` and `addEpicToOverview` to slice 01's scope and Behavior list. Both must be updated to read/write `EpicOverview` (preserving the `slices` array on each item).

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** goal-refining.md [01-schema-and-state-machine]: Schema registry update must be in slice 01, not slice 02

The affected-apis.md doc warns: "The registry update to `epics/overview.json` -> `epicOverviewSchema` **must happen before any data migration**. Without it, `slices` arrays are silently stripped by Zod on every `getJson` call, causing silent data loss on every round-trip." Slice 01 introduces `epicOverviewSchema` and rewrites `init.ts` to create epics overview items with `slices: []`. But if the schema registry still maps `epics/overview.json` to `overviewSchema` (which has no `slices` field), then every `getJson<EpicOverview>(state, "epics/overview.json")` call will parse through `overviewSchema`, which strips unrecognized fields -- silently dropping the `slices` array.

Slice 02's scope lists "schema registry" but slice 01's scope says "Out of scope: RPC layer" which is where the schema registry lives (`src/core/data/schema-registry.ts`). However, the schema registry is in the Data Layer, not the RPC layer. The plan's scope boundary incorrectly classifies it.

Fix: Move schema registry pattern updates into slice 01's scope. At minimum: change `epics/overview.json` to use `epicOverviewSchema`, add the new nested slice path pattern, remove the old flat patterns. This is a Data Layer change, consistent with slice 01's "Zod schemas" scope.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [01-schema-and-state-machine]: Missing `addSliceToOverview` in Behavior list despite being mentioned in architecture

The architecture doc (affected-apis.md) specifies a new `addSliceToOverview(state, epicName, sliceItem)` helper that appends to the target epic's embedded `slices` array. Slice 01 mentions `addSliceToOverview` in its "What We're Building" summary but does not include it in the numbered Behavior list or Verification section. The `CREATE_SLICE` handler (`slice-create.ts`) currently writes directly to `slices/overview.json` -- after restructuring, it must instead call `addSliceToOverview` to append to the epic's embedded array in `epics/overview.json`. This is a state machine change and belongs in slice 01.

Fix: Add a Behavior item: "`addSliceToOverview(state, epicName, sliceItem)` appends a new slice entry to the target epic's `slices` array in `epics/overview.json`." Add to slice-create.ts scope. Add a verification item confirming `CREATE_SLICE` produces an epic overview entry with the new slice in its `slices` array.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [02-rpc-and-commands]: `buildCompleteEvent` for slices missing `epic` field propagation

Slice 02's Behavior section describes `begin()`, `complete()`, `submit()` constructing slice events with `epic` from Target. But examining `complete.ts:97-113`, `buildCompleteEvent` for the slice case builds `{ type: "COMPLETE_SLICE", slice: target.name, ts, ... }` -- it does not include `epic`. After the Target type change in slice 01 adds `epic` to the slice variant, slice 02 must update `buildCompleteEvent` to include `epic: target.epic` on `COMPLETE_SLICE` events. The same applies to all event-building paths in `begin.ts` (already mentioned in affected-apis.md but not explicitly in slice 02's Behavior list).

Similarly, `buildCompleteResult` calls `buildSliceCompleteResult(target.name, ...)` but after restructuring, the function needs the epic name to construct nested paths. The function signature must change.

Fix: Expand Behavior item 2 to explicitly list `buildCompleteEvent` alongside `begin()`/`complete()`/`submit()`. Add a Behavior item for `buildSliceCompleteResult` signature change to accept epic.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [03-context-and-learnings]: `priorities.ts` has more silent string literal changes than listed

Examining `priorities.ts` in the actual codebase, the `entityDir()` helper at line 17 returns `slices/${target.name}` for slice targets. This is used by `planSources`, `refinementSources`, and `implementationSources` to construct paths like `slices/${target.name}/plan.md`. The `completeSources` at line 66 references `slices/overview.json` directly. The `refineSlicesSources` at line 110 references `slices` as a directory. That is at least 3 distinct locations (entityDir, completeSources, refineSlicesSources) plus any other path references.

The architecture doc identifies 3 specific string literals, but the actual code has the `entityDir()` helper function that generates paths for *every* phase involving slices. This is the highest-impact change because it affects all context bundling for slice workflows -- plan, refinement, implementation, and complete phases.

Fix: List `entityDir()` helper explicitly in Behavior section. It needs to return `epics/${target.epic}/slices/${target.name}` for slice targets, which requires the Target type to carry `epic` (available after slice 01). Ensure Verification includes a check that context bundling resolves correct nested paths.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [03-context-and-learnings]: Context layer depends on Target having `epic` -- must verify slice 01/02 dependency is sufficient

The `entityDir()` function in `priorities.ts` takes a `Target` and switches on `target.type`. For slices, it currently returns `slices/${target.name}`. After restructuring, it needs `target.epic` to return `epics/${target.epic}/slices/${target.name}`. But the `Target` type change (adding `epic` to slice variant) happens in slice 01/02. The context layer imports `Target` from `../rpc/types.js`. The dependency chain is correct (slice 03 depends on 01-02), but the goal file should explicitly state this dependency: "Requires `Target.epic` from slice 01."

Fix: Add an explicit note in slice 03's goal that `entityDir()` relies on the `Target` type change from slice 01.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** sequencing-refining.md: Slice 01 scope is larger than described, risking underestimation

The sequencing rationale says "Schema and state machine are tightly coupled" which is correct. But slice 01 as written also needs: schema registry updates (Data Layer), `updateOverviewStatus` + `addEpicToOverview` helper changes (state machine but not listed), and `addSliceToOverview` (new helper). The Description column says "New epicOverviewSchema with embedded slices, Target type + event epic fields, all transition handler path updates, helper signature changes" which is accurate at a high level but understates the helper changes needed for epic overview operations.

Fix: Update the Description to mention "epic overview helpers (`updateOverviewStatus`, `addEpicToOverview`, new `addSliceToOverview`)" and "schema registry pattern updates" alongside the existing items.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** goal-refining.md [05-tests-and-migration]: Architecture docs update scope is large and could be a separate slice

Slice 05 bundles test updates, migration code, self-migration, AND architecture docs updates (`data-model.md`, `state-machine-api.md`, `rpc-layer-api.md`, `flows.md`, `commands-api.md`). This is a lot of surface area for one slice. The architecture doc update is conceptually independent from migration code -- it does not require the same verification approach (doc updates are checked by grep, migration is checked by running the tool). Bundling them increases the risk that the slice takes too long or that doc updates are rushed at the end.

However, the plan explicitly states "Each slice independently implementable and verifiable" and the doc updates are relatively mechanical (find-and-replace path patterns). This is an observation, not a blocker.

Fix: Consider splitting architecture doc updates into a sub-step or explicit phase within slice 05's verification checklist, ensuring they are not forgotten. At minimum, add verification items: `grep -r '\.project/slices/' .project/architecture/` and `grep -r '"slices/' .project/architecture/` to catch any remaining flat references.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [01-schema-and-state-machine]: `overview.ts` `overviewItemSchema` has optional `epic` field that will become stale

Currently `overviewItemSchema` has `epic: z.string().min(1).optional()` (overview.ts:7). After restructuring, slice overview items live *inside* epic overview items and no longer need an `epic` field (the parent epic item provides the scoping). The `sliceOverviewItemSchema` in the architecture doc (data-model-changes.md) intentionally omits `epic`. But the existing `overviewItemSchema` still carries `epic` as optional -- it is used by `quests/overview.json` and `tasks/overview.json` where `epic` is irrelevant.

This is not a bug (the field is optional and will be unused), but it is dead schema surface area. Consider noting in slice 01 that the `epic` field on `overviewItemSchema` is now only relevant for backward compatibility during migration, and can be removed in a future cleanup.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [02-rpc-and-commands]: `resolveEntityDir` in `paths.ts` needs epic from Target but current function only receives Target

Examining `paths.ts:145-161`, `resolveEntityDir` switches on `target.type` and for slices returns `nodePath.join(projectDir, "slices", target.name)`. After slice 01 adds `epic` to the slice Target variant, this function will have `target.epic` available via TypeScript narrowing in the `case "slice":` branch. The change is straightforward, but the goal file should note that `resolveEntityDir` path construction changes, since this function cascades to all `resolvePathReferences` calls (every begin, submit, and complete operation).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** goal-refining.md [04-skills-update]: No enumeration of the 11 specific skill files

The goal says "Update all 11 skill files" and references `architecture/affected-apis.md Skills section` for the enumeration. For implementability, it would be helpful to list them directly in the goal file or at least in Verification, so the implementer does not need to cross-reference another document.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan demonstrates strong architectural understanding and the sequencing logic is sound. The core issue is that slice 01's scope is incomplete -- it omits schema registry updates and epic overview helper changes that are load-bearing for INV-005 compliance. Without these, the system will fail on every epic state transition after the schema change. The two CRITICAL issues are both about scope gaps where necessary changes are acknowledged in the architecture docs but not carried through to the slice goals. Fixing the CRITICALs and IMPORTANTs would bring this to 9+.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
