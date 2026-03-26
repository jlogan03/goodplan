# Holistic Review: Entity Restructuring Architecture

## Issues

**[IMPORTANT]** State events for slice lifecycle lack `epic` field despite architecture requiring it

The architecture's `_overview.md` (Subsystem Impact) and `data-model-changes.md` (State Event Changes) state that "All slice events gain an `epic` field." However, in the actual codebase (`src/schemas/state-events.ts`), only `CREATE_SLICE` carries an `epic` field. The remaining 8 slice events (`BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, `COMPLETE_REFINEMENT_ROUND`, `BEGIN_IMPLEMENTATION`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE`) use only a `slice: string` field with no `epic`.

The architecture must clarify the resolution strategy: either (a) add `epic` to all slice events (large change, breaks purity of events that don't need it), or (b) resolve `epic` from the state tree at transition time (look up `slice.json.epic` or derive from path). Option (b) is simpler and consistent with the current pattern where `CREATE_SLICE` is the only event that sets the epic, and subsequent events find it in state. The architecture should explicitly document which approach is chosen, because the current wording "all slice events gain an `epic` field" implies option (a) which is a much larger change.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `addEpicToOverview` in helpers.ts does not include `slices` array

The target `epicOverviewSchema` requires every epic item to have a `slices: []` array. The current `addEpicToOverview()` helper creates `{ name, status, created, completed }` with no `slices` field. The architecture's `affected-apis.md` mentions `addSliceToOverview()` adds to the epic's slices array, but doesn't document the change needed to `addEpicToOverview()` to include `slices: []` on creation. This should be called out explicitly as a required change.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `epic.sliceSequence` redundancy not addressed

The current `epic.json` schema includes a `sliceSequence: string[]` field (visible in `buildInitialEpicJson()` in helpers.ts and used in `slice-create.ts` line 77-80). The architecture proposes that array order in `epics/overview.json` replaces sequencing. But the architecture documents don't mention removing or deprecating `epic.sliceSequence`. This creates two sources of truth for slice ordering. The architecture should explicitly state that `sliceSequence` is removed from `epic.json` since `epics/overview.json` embedded slices array order is the new canonical sequencing.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `buildSliceCompleteResult` hardcodes `slices/` paths and uses `slice.epic` field

In `src/core/rpc/complete.ts`, `buildSliceCompleteResult()` reads `slices/${sliceName}/slice.json` (line 175-176), reads `slices/overview.json` (line 187), and filters by `item.epic === newSlice.epic` (line 189). The architecture says `slice.json` drops the `epic` field (data-model-changes.md: "drops `epic` field (now encoded in path, no longer denormalized)"). But `buildSliceCompleteResult` relies on `newSlice.epic` to find sibling slices. The architecture must document how epic completion detection works without the `epic` field on `slice.json` -- presumably by reading the epic name from the `Target` type instead. This is a non-trivial refactor that the affected-apis.md under-specifies for `complete.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing documentation update plan

The architecture changes `.project/slices/` paths across 45+ files and 15 skills. The project has a `CLAUDE.md` referencing `.project/architecture/` paths, `conventions.md`, and `learnings.md`. Several architecture docs under `.project/architecture/` (e.g., `data-model.md`, `flows.md`, `rpc-layer-api.md`, `commands-api.md`, `state-machine-api.md`) reference the current `slices/` path structure. The architecture proposal should include a documentation update phase covering: (1) all `.project/architecture/*.md` files that reference `slices/` paths, (2) `CLAUDE.md` if it references slice paths, (3) transition table docs. Without this, the architecture docs will be stale immediately after implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice.json` `epic` field removal contradicts learnings derivation pattern

In `complete.ts` line 241-243, epic-level learnings are derived using `newSlice.epic` to construct the path `epics/${newSlice.epic}/learnings.jsonl`. If `epic` is removed from `slice.json`, every call site that derives the parent epic from the slice entity needs to use the `Target.epic` field instead. The architecture mentions this for path resolution but should enumerate all call sites in `complete.ts` that depend on `slice.epic` for non-path purposes (learnings rollup, architecture delta paths, deferred item routing).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Migration strategy missing handling for `epic.sliceSequence`

The migration strategy (section "Migration Strategy" in `_overview.md`) describes moving directories and rebuilding `epics/overview.json`, but doesn't mention migrating `epic.sliceSequence` data into the new embedded slices array ordering. The `sliceSequence` field on each epic should be the source for ordering slices in the consolidated overview during migration.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Schema registry change incomplete -- missing removal of `slices/overview.json` pattern

The `affected-apis.md` shows removing `slices/` patterns from the schema registry and updating the epic overview schema. It correctly shows removing `{ pattern: /^slices\/[^/]+\/slice\.json$/, ... }` and adding the nested pattern. However, it doesn't explicitly list removing `{ pattern: /^slices\/overview\.json$/, schema: overviewSchema }` from the registry. This is implied by "remove slices/ patterns" but should be explicit since the schema registry is a validation boundary (INV-005).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No verification steps for the architecture itself

The architecture is detailed enough for slice planning but has no "how to verify this architecture is correct" section -- for example, confirming that `assembleState()` recursive walker actually discovers files at the new nested paths, or that the schema registry patterns match correctly. Since this is an architecture doc (not a plan), formal Expected Behavior sections aren't required, but a brief "Verification Approach" section would help the implementer confirm the design works before building all 45+ file changes.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The architecture captures the three core changes well and correctly identifies the major subsystem impacts. The brainstorm research is solid. However, there are several internal inconsistencies: the event schema change claim doesn't match reality (only CREATE_SLICE has `epic`), the `slice.json.epic` removal creates unaddressed downstream dependencies in `complete.ts`, and `epic.sliceSequence` redundancy is not addressed. The documentation update gap is significant for a 45+ file change. To reach 9+: resolve the event `epic` field strategy explicitly, address `sliceSequence` removal, enumerate all `slice.epic` usage sites that need refactoring, and add a documentation update section.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
