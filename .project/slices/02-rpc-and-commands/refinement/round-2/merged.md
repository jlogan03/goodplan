# Merged Review Feedback — Slice 02: RPC and Commands (Round 2)

Reviewers: Holistic (8/10), SoftwareArchitecture (9/10), TypeScript (8/10)

### CRITICAL Issues

None.

### IMPORTANT Issues

**[IMP-1]** Commands lack a shared mechanism for deriving `activeEpic` (TypeScript + SoftwareArchitecture)
Commands like `plan.ts`, `refine-plan.ts`, `implement.ts`, `complete.ts`, `abandon.ts`, and the 6 subagent commands (`start-plan`, `start-refinement`, `start-implementation`, `submit-plan`, `submit-refinement`, `submit-implementation`) need to read `project.json.activeEpic` but the plan does not specify how. None currently call `loadState` or have access to `activeEpic`. The plan should specify: create a shared helper like `requireActiveEpic(projectDir): string` that reads `project.json`, throws if `activeEpic` is null, and is imported by all affected commands. This avoids duplicating the `loadState`+`getJson`+null-check pattern across 8+ commands and keeps error messages consistent.
Resolution: DIRECTLY_ACTIONABLE

**[IMP-2]** `complete.ts` cross-epic deferred routing is underspecified (all 3 reviewers)
The plan says "Handle cross-epic deferred targets by resolving each target's epic independently" but does not specify the mechanism. Currently the loop iterates a flat `overview.items` list. After migration, data is nested: `overview.items[].slices[]`. The plan must clarify: (a) whether deferred targets are always within the same epic (simplifying constraint, likely correct given `activeSlice` is always scoped to `activeEpic`), or (b) if cross-epic is supported, the iteration is a nested loop over all epics' slice arrays. SoftwareArchitecture argues same-epic-only is the likely correct constraint. Specify whichever is true, and make the iteration strategy explicit.
Resolution: CODEBASE_EXPLORATION

**[IMP-3]** `list.ts` human-readable output format unspecified after `SliceOverviewItem` change (Holistic + SoftwareArchitecture)
`SliceOverviewItem` omits `epic` and `title` fields. The current human-readable output references `item.epic` (line 53). After the switch, this will type-error. The plan covers JSON output and `--all` aggregation but is silent on the human-readable format. Specify: remove `epicStr` referencing `item.epic`, and add epic header/grouping when `--all` is used.
Resolution: DIRECTLY_ACTIONABLE

**[IMP-4]** Context test files construct bare slice targets without `epic` field (TypeScript)
`tests/unit/context/startContext.test.ts` has 9 instances of `{ type: "slice", name: "..." }` without `epic`. After this slice updates `resolveScope()` and `entityDir()` to use `target.epic`, these tests will produce `epics/undefined/slices/...` paths. Since tests are excluded from `tsconfig.json`, `tsc --noEmit` won't catch this but `bun test` will. Either update the context tests in this slice (preferred, since the context code changes live here) or explicitly note they are expected to break until slice 03.
Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**[MIN-1]** `status.ts` `resolveActiveSlice` needs null guard for `activeEpic` (Holistic)
`project.activeEpic` must be checked for null before path interpolation to avoid `epics/null/slices/...`. Same applies to `checkStale`. No signature change needed — just a path string update plus null guard.
Resolution: DIRECTLY_ACTIONABLE

**[MIN-2]** Verification section missing `--all` flag test for `slice:list` (Holistic)
The plan adds `--all` but verification only tests `slice:list --json` without `--all`. Add: `goodplan slice:list --all --json` returning slices from multiple epics.
Resolution: DIRECTLY_ACTIONABLE

**[MIN-3]** `show.ts` verification not explicitly listed (Holistic)
`slice:show` gets a new `--epic` flag and two path changes but lacks its own verification bullet. Add one covering: flag defaults to `activeEpic`, errors cleanly when neither is set.
Resolution: DIRECTLY_ACTIONABLE

**[MIN-4]** `resolveEntityJsonPath` already returns nested paths — note in plan to avoid wasted effort (SoftwareArchitecture)
`begin.ts` and `submit.ts` result builders already use `resolveEntityJsonPath` (updated in slice 01). The plan should note these do NOT need path updates, so implementers don't waste time searching.
Resolution: DIRECTLY_ACTIONABLE

**[MIN-5]** `data/tree.test.ts` and `state.test.ts` fixture paths may need updating (TypeScript)
These tests write fixtures to `slices/overview.json`. If the data layer expects `epics/overview.json`, they need updating. The plan's catch-all doesn't explicitly list them.
Resolution: DIRECTLY_ACTIONABLE

**[MIN-6]** `refineSlicesSources` in `priorities.ts` uses bare `slices` path (TypeScript)
Line 111 has `{ key: "slice-definitions", path: "slices", sourceType: "directory" }`. After migration, slice definitions live under `epics/${epic}/slices/`. This source will silently resolve to nothing. May be intentional deferral but worth noting.
Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

1. IMP-1: Add shared `requireActiveEpic` helper, specify import in all affected commands
2. IMP-3: Specify human-readable output format for `slice:list` after `SliceOverviewItem` change
3. IMP-4: Update context test targets to include `epic` field (or document expected breakage)
4. MIN-1: Add null guard for `activeEpic` in `status.ts`
5. MIN-2: Add `--all` verification step for `slice:list`
6. MIN-3: Add explicit `slice:show` verification bullet
7. MIN-4: Note that `begin.ts`/`submit.ts` result builders need no path changes
8. MIN-5: List `tree.test.ts` and `state.test.ts` fixture paths explicitly
9. MIN-6: Note `refineSlicesSources` bare `slices` path needs updating or deferral annotation

### RESEARCH_NEEDED

1. IMP-2: Cross-epic deferred routing — explore codebase to determine if deferred targets are always same-epic, then specify iteration strategy accordingly

### Contradictions Resolved

**Deferred routing scope**: Holistic suggests iterating all epics' slice arrays (cross-epic support). SoftwareArchitecture argues same-epic-only is likely correct given the `activeSlice`-scoped-to-`activeEpic` invariant. TypeScript says iterate all epics. Resolved in favor of SoftwareArchitecture (domain specialist): recommend clarifying as same-epic-only if the invariant holds, but this requires codebase exploration to confirm — hence RESEARCH_NEEDED.

### Unresolved (USER_INPUT required)

None.

### Available Research

**IMP-2 Resolution (cross-epic deferred routing)**:
- `DeferredItem.targetEpic` is `string | undefined` — defaults to same epic but can target a different epic.
- `overview.items` is a flat project-wide slice list. The deferred routing loop must iterate ALL items (not just same-epic), which the current code already does.
- After migration to nested overview (`epics/overview.json`), the loop must flatten all epics' slice arrays to preserve cross-epic routing.
- The `epicComplete` check (line 190) correctly filters to same-epic only — that's the one place where same-epic scoping is appropriate.
- No invariant constrains deferred targets to same-epic.
- **Plan should specify**: flatten all epics' slice arrays for the deferred routing loop, construct paths as `epics/${item's epic}/slices/${item.name}/slice.json`.
