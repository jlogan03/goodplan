# Holistic Review: Entity Restructuring Architecture (Round 2)

## Issues

**[IMPORTANT]** `addEpicToOverview` change not documented in affected-apis.md

The `affected-apis.md` has a section for `epic-create.ts / addEpicToOverview` (line 65-66) that correctly notes `slices: []` must be included. However, the current `addEpicToOverview()` in `helpers.ts` (line 414-421) creates `{ name, status, created, completed }` without `slices`. The architecture should also note that `buildInitialEpicJson()` (helpers.ts line 444-456) creates the `epic.json` content with `sliceSequence: []` — this function needs updating to remove `sliceSequence` as part of the `epic.json` schema change documented in `data-model-changes.md`. The `addEpicToOverview` fix is documented but `buildInitialEpicJson` is not mentioned anywhere in the architecture despite being the function that constructs initial epic JSON.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Test fixtures with `sliceSequence` not identified for update

The architecture identifies ~15 skill files and 45+ source files but does not mention test fixtures. Codebase exploration reveals at least 4 test fixture `epic.json` files containing `sliceSequence`:
- `tests/fixtures/slice-refining-max-rounds/.project/epics/test-epic/epic.json`
- `tests/fixtures/slice-in-progress/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-activated/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-created/.project/epics/test-epic/epic.json`

These fixtures also use `slices/overview.json` (flat paths). Test fixtures that embed the old data model shape will fail schema validation (INV-005) after the schema changes. The Subsystem Impact table or a dedicated "Test Infrastructure" row should enumerate fixture updates.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice show` command uses `slice.epic` for display but not listed as a call site

`src/commands/slice/show.ts` (line 46) displays `slice.epic` in human-readable output: `(epic: ${slice.epic})`. The architecture's `data-model-changes.md` "Call sites that use `slice.epic`" table (lines 105-112) enumerates state machine and RPC layer usages but omits command-layer display usages. While not critical (the field is being retained), the table claims to be exhaustive. Either add this call site or clarify the table scope is "non-path, non-display purposes."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Skills impact count may be understated

The architecture says "~15 skill files reference `.project/slices/` paths." Codebase search finds 11 skill files with literal `.project/slices/` references. The ~15 estimate is reasonable if including indirect references, but the `affected-apis.md` Skills section (lines 123-131) only lists 6 specific skills. For a 45+ file change, the plan phase will need the complete list. Consider enumerating all 11 affected skill files rather than "~15."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification Approach missing schema validation step for `epicOverviewSchema`

The Verification Approach section (lines 77-81 of `_overview.md`) has 5 checks but none explicitly verify that the new `epicOverviewSchema` correctly validates a round-tripped `epics/overview.json` with embedded slices. Step 2 mentions "schema registry matches" but focuses on pattern matching, not schema shape validation. A specific check like "create epic with slices, serialize, parse through `epicOverviewSchema`, confirm no validation errors" would close this gap. This is especially important because `epicOverviewSchema` is a new schema type, not an extension of the existing `overviewSchema`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All 4 IMPORTANT issues from round 1 have been properly addressed. The architecture now explicitly documents: the event `epic` field strategy (all events gain `epic`), `slice.json.epic` retention with call-site enumeration, `sliceSequence` removal and migration, the `activeSlice` invariant, verification approach, and documentation update phase. The remaining issues are completeness gaps (test fixtures, `buildInitialEpicJson`, skill file enumeration) rather than design problems. To reach 9+: enumerate test fixtures in scope, add `buildInitialEpicJson` to the affected functions list, and tighten the verification approach to cover the new `epicOverviewSchema`.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
