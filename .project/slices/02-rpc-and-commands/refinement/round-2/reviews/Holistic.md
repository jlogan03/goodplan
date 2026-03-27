# Holistic Review — Slice 02: RPC and Commands (Round 2)

## Issues

**[IMPORTANT]** `list.ts` plan says "Adjust output format since `SliceOverviewItem` omits `epic` and `title` fields" but doesn't specify the human-readable output change
The current human-readable output (lines 52-55) formats `item.epic` and relies on the `OverviewItem` shape. After switching to `SliceOverviewItem` (which omits `epic` and `title`), the human-readable branch needs updating: remove the `epicStr` that references `item.epic`, and potentially add an epic header or grouping since the epic is now implicit from the query. The plan covers the JSON output and `--all` aggregation but is silent on what the human-readable output should look like. An implementer will hit a type error on `item.epic` and have to decide the format. Specify the human-readable output format (e.g., header per epic when `--all`, no epic suffix when filtering by single epic).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete.ts` deferred routing loop needs epic context for cross-epic targets but plan underspecifies how
The plan says "Handle cross-epic deferred targets by resolving each target's epic independently" (line 41) but the mechanism is unclear. Currently the deferred routing loop (lines 206-219) iterates `overview.items` (a flat list) and reads `slices/${item.name}/slice.json`. After the change, it needs to iterate the embedded `slices` array within a specific epic entry. But deferred items can target slices in *different* epics. The plan says to "find the epic entry in `epics/overview.json`" but doesn't specify: does the loop iterate all epics' slices, or only the completing slice's epic? Deferred items carry a `target` field — what is the shape of that target, and does it include an epic name? Clarify the iteration strategy: iterate all epics' slice arrays (since deferred can be cross-epic), and for each match, construct the path using that epic's name.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `status.ts` `resolveActiveSlice` needs `activeEpic` but plan doesn't show where it comes from
The plan (line 75) says update `slices/${project.activeSlice}/slice.json` to `epics/${project.activeEpic}/slices/${project.activeSlice}/slice.json`. This is correct, but `resolveActiveSlice` currently receives only `(project, state)` — it already has `project.activeEpic` available via the `project` parameter. Worth confirming in the task that no signature change is needed, just a path string update. The same applies to `checkStale` (line 76) — `project.activeEpic` must be checked for null before interpolation to avoid `epics/null/slices/...`. The plan doesn't mention the null guard.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Verification section doesn't test `--all` flag behavior for `slice:list`
The plan adds `--all` to `list.ts` for cross-epic aggregation, but the verification section (lines 93-101) only tests `slice:list --json` without `--all`. Add a verification step: `goodplan slice:list --all --json` returns slices from multiple epics (requires at least two epics with slices in the test data).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `show.ts` verification not explicitly listed
The plan's CLI e2e verification (line 97) mentions `slice:show --epic <name> --json` but this is buried in a compound verification line. Since `show.ts` is getting a new `--epic` flag and two path changes, it deserves its own verification bullet to ensure the flag defaults correctly to `activeEpic` and errors cleanly when neither is set.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were comprehensively addressed. The plan now has explicit line numbers, path references, and sub-tasks for `show.ts`, `list.ts`, `complete.ts`, and `priorities.ts`. The `submit.test.ts` gap is closed. Documentation task added. The remaining issues are: (1) the `list.ts` human-readable output format is unspecified, (2) the cross-epic deferred routing in `complete.ts` needs exploration to clarify iteration strategy, and (3) minor null-guard and verification gaps. To reach 9+: specify `list.ts` human output format, clarify the deferred routing cross-epic iteration, and add null guards for `activeEpic` in `status.ts`.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
