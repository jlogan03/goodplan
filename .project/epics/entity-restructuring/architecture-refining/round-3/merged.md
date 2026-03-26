# Merged Review: Entity Restructuring (Round 3)

Reviewers: software-architecture (9/10), api-contract (9/10). holistic reviewer failed (API error — omitted).

---

## Issues

### IMPORTANT-1: Schema registry change is load-bearing for reads, not just write validation

`updateOverviewStatus` in `helpers.ts` spreads `{ ...item, status: newStatus }`. After restructuring, each epic overview item carries a `slices` array. The spread preserves it at runtime *if* the object has it, but `getJson<Overview>(...)` uses Zod `.parse()` against the schema registered for that path. If the schema registry is updated to map `epics/overview.json` → `epicOverviewSchema` but the `getJson` call still uses `Overview` / the old schema, the `slices` array is silently stripped on every read.

`affected-apis.md` notes the type annotation change but does not explicitly state that the schema registry change is also required for read correctness. An implementer who updates the type annotation but omits the schema registry update will see no TypeScript error and no runtime error — just silent data loss on every round-trip.

**Resolution:** Add a note to `affected-apis.md` (helpers.ts / updateOverviewStatus section) stating: "The schema registry path→schema mapping for `epics/overview.json` must be updated to `epicOverviewSchema` — this is required for read correctness, not just write validation. Without it, `slices` arrays are silently stripped by Zod on every `getJson` call."

---

### IMPORTANT-2: `buildSliceCompleteResult` in `complete.ts` — multiple flat paths not listed in `affected-apis.md`

*(Raised by both reviewers — merged.)*

`complete.ts` `buildSliceCompleteResult` (lines ~169–267) contains multiple flat `slices/` path references that are not enumerated in the `affected-apis.md` `complete.ts` section:

- `getJson<Slice>(oldState, \`slices/${sliceName}/slice.json\`)` (x2, old and new state)
- `getJson<Overview>(newState, "slices/overview.json")` — the file being eliminated
- `getJson<Slice>(oldState/newState, \`slices/${item.name}/slice.json\`)` (x2, for deferred routing detection)
- `getJsonl<unknown>(newState, \`slices/${sliceName}/architecture-deltas.jsonl\`)`

After restructuring, all `slices/<name>/` paths become `epics/<epic>/slices/<name>/`, `slices/overview.json` is eliminated (sibling-slice detection must switch to the embedded slices array in `epics/overview.json` for the relevant epic), and `architecture-deltas.jsonl` moves to `epics/<epic>/slices/<name>/architecture-deltas.jsonl`.

The current `affected-apis.md` `complete.ts` entry only describes the COMPLETE_EPIC epic-completion scan. `buildSliceCompleteResult` is the larger consumer. All path references are string literals — TypeScript will not catch them.

**Resolution:** Enumerate all six path references and the sibling-slice detection logic change in the `affected-apis.md` `complete.ts` section.

---

### IMPORTANT-3: `priorities.ts` has three TypeScript-silent flat path references not in `affected-apis.md`

`src/core/context/priorities.ts` contains three string literals that will silently produce empty context bundles after restructuring:

1. `completeSources` (line ~66): `{ key: "slices-overview", path: "slices/overview.json", sourceType: "markdown" }` — references the file being eliminated. Post-restructuring this source returns no content. Should update to `"epics/overview.json"` (or scope to the active epic's embedded slices array).
2. `entityDir()` helper (lines ~15–25): returns `slices/${target.name}` for slice targets, driving `plan`, `refinement`, and `implementation` priority-table paths. After restructuring the slice entity dir is `epics/${epic}/slices/${name}`.
3. `refineSlicesSources` (line ~110): `{ key: "slice-definitions", path: "slices", sourceType: "directory" }` — references the top-level `slices/` directory being eliminated.

The `affected-apis.md` Context Layer section says "Priority tables and learnings paths update accordingly" without listing files, functions, or string literals. These will cause silent context degradation (missing content in skill bundles) rather than compilation or runtime errors.

**Resolution:** Add `priorities.ts` to `affected-apis.md` with the three specific string literals and their replacements.

---

### MINOR-1: `buildCompleteEvent` in `complete.ts` not listed in `affected-apis.md`

`complete.ts` line ~104 builds `COMPLETE_SLICE` as `{ type: "COMPLETE_SLICE", slice: target.name, ts, ... }`. The architecture specifies all slice events gain an `epic` field (data-model-changes.md lines 90–99). After restructuring, the slice `Target` variant carries `epic: string`, so `target.epic` is available in the `case "slice"` branch. `affected-apis.md` explicitly enumerates `buildBeginEvent` and `buildAbandonEvent` but omits `buildCompleteEvent`.

**Resolution:** Add `buildCompleteEvent` to the `complete.ts` change list in `affected-apis.md`.

---

### MINOR-2: Remaining 5 slice mutation command files not individually listed — `--epic` flag gap

`affected-apis.md` states "All slice commands resolve epic from `project.json.activeEpic` or `--epic` flag" generically. The current commands `slice/plan.ts`, `slice/refine-plan.ts`, `slice/implement.ts`, `slice/abandon.ts`, `slice/complete.ts` all pass `{ type: "slice", name: args.slice }` with no `epic` field. After restructuring the `Target` slice variant requires `epic: string` — TypeScript will catch these at the call sites to `begin()` / `complete()`, but only `slice/create.ts`, `slice/list.ts`, and `slice/show.ts` are listed by filename.

**Resolution:** List all 5 remaining mutation command files explicitly in `affected-apis.md` for complete implementation traceability.

---

### MINOR-3: `slice:show` `getDir` call for artifact detection not tracked

`slice/show.ts` line ~42 calls `detectArtifacts(getDir(state, \`slices/${args.slice}\`), ...)`. `affected-apis.md` mentions `slice/show.ts` for the `getJson` path change, but `getDir` uses a separate string literal that also needs updating to `epics/<epic>/slices/<name>`. TypeScript will catch the `getJson` path (via `resolveEntityJsonPath`) but not the `getDir` string literal.

**Resolution:** Add the `getDir` call site to the `slice:show` entry in `affected-apis.md`.

---

## Confirmed Resolved (Round 2)

All round-2 issues confirmed addressed:
- `COMPLETE_EPIC` / `activeSlice` relationship documented (workflow ordering, not defensive clearing)
- `CREATE_SLICE` guard assumption surfaced with implementer note
- Sequential enforcement migration traced through `slice-plan.ts` with code examples
- `slice show` call site added to data-model-changes.md
- Skills section enumerates 11 specific files
- `epicOverviewSchema` round-trip added to verification steps
- Schema registry test assertions explicitly called out
- `CompleteInput` unchanged / `CREATE_SLICE` dual-source approach clarified
- `DeferredItem.targetEpic` optional field with same-epic default

---

## Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| software-architecture | 9/10 | 0 | 1 | 2 |
| api-contract | 9/10 | 0 | 2 | 3 |
| **Merged** | **9/10** | **0** | **3** | **3** |

Note: IMPORTANT-2 (`buildSliceCompleteResult` paths) was raised by both reviewers and counted once. holistic reviewer omitted due to API failure.

Architecture is ready for slicing. All remaining issues are directly actionable additions to `affected-apis.md` — no architectural rethinking required.
