# Merged Review Feedback — Slice 02: RPC and Commands (Round 1)

### CRITICAL Issues

**C1. `buildSliceCompleteResult` signature needs `epicName` parameter**
The function (line 170, `complete.ts`) receives only `sliceName: string` but all 6 internal path references must change from `slices/${sliceName}/...` to `epics/${epic}/slices/${sliceName}/...`. Plan must specify: (a) add `epicName: string` parameter, (b) update call site on line 157 to pass `target.epic`, (c) list all 6 path references explicitly (lines 176-177, 188, 208-209, 259).
Sources: SoftwareArchitecture, TypeScript, Holistic

**C2. `status.ts` has 3 hardcoded `slices/` paths beyond `countArtifacts` that the plan omits**
- `resolveActiveSlice()` line 83: reads `slices/${project.activeSlice}/slice.json` — will return `null` for every active slice post-migration.
- `checkStale()` line 247: uses scope prefix `slices/${project.activeSlice}` — stale warnings will never trigger.
- Both must become `epics/${project.activeEpic}/slices/${project.activeSlice}/...`.
Sources: SoftwareArchitecture, TypeScript

**C3. `slice:show` has 2 hardcoded flat paths the plan underspecifies**
Lines 36 (`getJson`) and 42 (`getDir`) use `slices/${args.slice}/...` directly — `show.ts` does not use `resolveEntityDir`. Plan must specify: (a) add `--epic` flag defaulting to active epic, (b) update both paths to `epics/${epic}/slices/${args.slice}/...`.
Sources: SoftwareArchitecture, TypeScript, Holistic

### IMPORTANT Issues

**I1. `slice:list` needs concrete data access pattern for `epics/overview.json`**
Current code reads `slices/overview.json` (flat list). Plan must specify: (a) change import from `Overview`/`overviewSchema` to `EpicOverview`/`epicOverviewSchema`, (b) for default/`--epic`: find epic entry, return its `slices` array, (c) for `--all`: flatten all epics' slice arrays, (d) output format adjustments since `SliceOverviewItem` omits `epic` and `title` fields.
Sources: SoftwareArchitecture, TypeScript, Holistic

**I2. `complete.ts` deferred routing loop needs restructured iteration for nested overview**
Lines 206-219 iterate `overview.items` (flat list) to find sibling slices. After restructuring: (a) find the epic entry in `epics/overview.json`, (b) iterate its embedded `slices` array, (c) construct nested paths `epics/${epicName}/slices/${item.name}/slice.json`. Note: deferred targets may belong to different epics — the plan should specify cross-epic resolution.
Sources: SoftwareArchitecture, TypeScript, Holistic

**I3. `priorities.ts` line 67 has hardcoded `slices/overview.json` not covered by plan**
`completeSources` references `{ key: "slices-overview", path: "slices/overview.json" }` — must change to `epics/overview.json`. This is separate from the `entityDir()` TODO on line 17.
Sources: Holistic, TypeScript

**I4. `context/index.ts` `resolveScope` returns flat `slices/${name}` path**
Line 101 returns `slices/${target.name}` for slice scope resolution. Must become `epics/${target.epic}/slices/${target.name}`. Not mentioned in the plan. `target.epic` is available since the Target type already includes it.
Sources: TypeScript

**I5. `submit.test.ts` not explicitly listed in test tasks**
Line 141 constructs `{ type: "slice", name: "s1" }` without `epic`. Since `submit.ts` has 3 annotations being cleared, its test file should be explicitly listed alongside `begin.test.ts`, `complete.test.ts`, `paths.test.ts`, `status.test.ts`.
Sources: Holistic, SoftwareArchitecture

**I6. `slice:create` already has `--epic` flag — other commands need different pattern**
`create.ts` already has `--epic` as a required arg (line 30). The other 5 mutation commands (`plan`, `refine-plan`, `implement`, `complete`, `abandon`) need to derive epic from `project.json.activeEpic`. Plan uses the same description for all 6, obscuring this distinction.
Sources: SoftwareArchitecture

### MINOR Issues

**M1. Plan does not include `rpc-layer-api.md` documentation update task**
Research file flags it as stale (old Target type without `epic`). Should be added as a task or explicitly deferred with a note.
Sources: Holistic, SoftwareArchitecture

**M2. `complete.ts` overview filter logic needs structural change, not just path swap**
Line 190's `overview.items.filter((item) => item.epic === newSlice.epic)` must change to: find the epic entry in overview, iterate its embedded `slices` array. This is a structural change the plan should describe.
Sources: Holistic (subsumed by I2 but separately flagged for the filter-specific logic)

**M3. Before-check grep pattern is overly broad**
`grep -rc "@ts-expect-error.*slice" src/` could match unrelated `@ts-expect-error` comments containing "slice". A more precise pattern like `@ts-expect-error.*slice.02` would be safer. After-check should verify `TODO(slice-02)` count is exactly 0.
Sources: Holistic

**M4. Verification section does not test `slice:show` with nested paths**
Expected Behavior checks only verify annotation counts and test pass counts. A specific check for `slice:show --json` returning correct data from nested paths would catch regressions.
Sources: TypeScript

**M5. `slice:show` needs `--epic` flag added to args definition**
For consistency with other commands. Plan mentions deriving epic but doesn't mention adding the flag definition.
Sources: TypeScript (subsumed by C3)

### DIRECTLY_ACTIONABLE

C1, C2, C3, I1, I2, I3, I4, I5, I6, M1, M2, M3, M4, M5

### RESEARCH_NEEDED

None — all issues are directly actionable from existing codebase knowledge.

### Contradictions Resolved

1. **I1 resolution type**: SoftwareArchitecture tagged `slice:list` as `CODEBASE_EXPLORATION`, but both Holistic and TypeScript provided sufficient concrete detail (schema type names, access patterns) to make it DIRECTLY_ACTIONABLE. Resolved in favor of DIRECTLY_ACTIONABLE since the needed information is already in the reviews.

### Unresolved (USER_INPUT required)

None.
