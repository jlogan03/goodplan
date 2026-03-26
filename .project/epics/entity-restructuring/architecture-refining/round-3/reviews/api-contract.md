# API Contract Review: Entity Restructuring Architecture (Round 3)

## Issues

**[IMPORTANT]** `buildSliceCompleteResult` in `complete.ts` reads flat slice paths — not listed in `affected-apis.md`

`complete.ts` `buildSliceCompleteResult` (lines 175-267) reads from multiple flat slice paths that all change under this epic:
- Line 175-176: `getJson<Slice>(oldState, \`slices/${sliceName}/slice.json\`)` and `newState` equivalent
- Lines 187-219: `getJson<Overview>(newState, "slices/overview.json")` — the file being eliminated; also iterates `overview.items` and calls `getJson<Slice>(oldState/newState, \`slices/${item.name}/slice.json\`)` for deferred routing detection
- Lines 258-259: `getJsonl<unknown>(newState, \`slices/${sliceName}/architecture-deltas.jsonl\`)` — path changes to `epics/${epic}/slices/${sliceName}/architecture-deltas.jsonl`

The `affected-apis.md` `complete.ts` section mentions only the epic completion scan (COMPLETE_EPIC path). `buildSliceCompleteResult` is the larger and more complex consumer. All five path references above must update, and the overview iteration must switch to the embedded `epics/overview.json` slices array for the relevant epic. This is a TypeScript-silent gap — string literals won't fail compilation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Context layer `priorities.ts` has two TypeScript-silent flat path references not enumerated in `affected-apis.md`

`src/core/context/priorities.ts` has two structural gaps that will silently produce empty context bundles after restructuring:

1. `completeSources` (line 66): `{ key: "slices-overview", path: "slices/overview.json", sourceType: "markdown" }` — references the file being eliminated. Post-restructuring, this source will return no content. The equivalent data is now embedded in `epics/overview.json`. The source should either be updated to `"epics/overview.json"` or scoped to the active epic's embedded slices array.

2. `entityDir()` helper (line 15-25): returns `slices/${target.name}` for slice targets. This drives the `plan`, `refinement`, and `implementation` priority table paths (e.g., `${entityDir(rt.target)}/plan.md`). After restructuring, the slice entity directory is `epics/${epic}/slices/${name}`, so `entityDir()` must use the epic-scoped path.

3. `refineSlicesSources` (line 110): `{ key: "slice-definitions", path: "slices", sourceType: "directory" }` — references the top-level `slices/` directory being eliminated.

The `affected-apis.md` Context Layer section says "Priority tables and learnings paths update accordingly" without enumerating specific files, functions, or string literals. These are string literals — TypeScript will not catch them. They will cause silent context degradation (missing content in skill bundles) rather than runtime errors or test failures.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice:plan`, `slice:refine-plan`, `slice:implement`, `slice:abandon`, `slice:complete` command files not individually listed — `--epic` flag gap

`affected-apis.md` says "All slice commands resolve epic from `project.json.activeEpic` or `--epic` flag" and "Construct `Target` with `epic` field from `--epic` flag or active epic". The current commands (`slice/plan.ts`, `slice/refine-plan.ts`, `slice/implement.ts`, `slice/abandon.ts`, `slice/complete.ts`) all pass `{ type: "slice", name: args.slice }` with no `epic` field. After restructuring, the `Target` slice variant requires `epic: string` — these commands will fail TypeScript compilation on the `begin()` or `complete()` call. TypeScript will catch these, but a complete enumeration of affected command files in `affected-apis.md` would improve implementation planning.

Only `slice/create.ts`, `slice/list.ts`, and `slice/show.ts` are listed by filename. The remaining 5 mutation commands are covered by the generic statement but benefit from explicit listing given the 45+ file change scope.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Round-2 minor issues: verify all addressed

Checking the current plan docs against round-2 minors:

- **MINOR-1** (`COMPLETE_EPIC` does not clear `activeSlice`): `_overview.md` now has "Note: `COMPLETE_EPIC` does not explicitly clear `activeSlice` — by workflow ordering, all slices must be completed/abandoned (each clears `activeSlice`) before epic completion fires, so `activeSlice` is already null." Addressed.
- **MINOR-2** (`CREATE_SLICE` guard): `affected-apis.md` now says "Document this assumption or add the check as part of this epic." Addressed (deferred to implementer decision).
- **MINOR-3** (sequential enforcement migration): `affected-apis.md` now has explicit `slice-plan.ts` sequential enforcement migration with the target code pattern. Addressed.
- **MINOR-4** (`slice show` call site): `data-model-changes.md` now includes `src/commands/slice/show.ts` in the call-site table. Addressed.
- **MINOR-5** (skill file count): `affected-apis.md` Skills section now enumerates 11 specific files, matching codebase reality. Addressed.
- **MINOR-6** (verification step for `epicOverviewSchema` round-trip): `_overview.md` verification section now includes step 6: "epicOverviewSchema round-trip". Addressed.
- **MINOR-7** (schema registry test assertions): `affected-apis.md` Schema Registry section explicitly calls out the two test assertions to change/delete. Addressed.
- **MINOR-8** (`CompleteInput` unchanged): `data-model-changes.md` now has a "CompleteInput Note" section confirming `epic` comes from `Target` and clarifying the `CREATE_SLICE` event dual-source approach. Addressed.

---

**[MINOR]** `slice:show` reads `getDir(state, \`slices/${args.slice}\`)` for artifact detection — not tracked

`slice/show.ts` line 42 calls `detectArtifacts(getDir(state, \`slices/${args.slice}\`), ...)`. `affected-apis.md` mentions `slice/show.ts` for the JSON path change, but the `getDir` call for artifact detection uses the same flat directory path and must also update to `epics/<epic>/slices/<name>`. TypeScript will catch the `getJson` path because `resolveEntityJsonPath` will change, but `getDir` uses a string literal and is a separate call site. Worth explicitly noting alongside the `getJson` path change for `slice:show`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round-2 important and minor issues are all confirmed resolved in the current plan docs. The architecture is now internally consistent: `DeferredItem` has the `targetEpic` optional field, the helper signatures are fully specified, the test fixture list is comprehensive, event builders are enumerated, and the invariant description is accurate.

Two IMPORTANT issues remain: `buildSliceCompleteResult` in `complete.ts` has multiple flat-path references not covered by the `affected-apis.md` entry, and `priorities.ts` has three TypeScript-silent path strings that will cause silent context degradation. Both are directly actionable additions to `affected-apis.md`. Resolving these would bring the architecture to 9.5–10.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
