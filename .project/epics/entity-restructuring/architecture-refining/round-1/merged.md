# Merged Architecture Review — Entity Restructuring (Round 1)

Reviewers: software-architecture (5/10), holistic (6/10), api-contract (5/10)

---

## CRITICAL

### C1. `slice.json` dropping `epic` field contradicts downstream usage — pick a consistent strategy

*Sources: software-architecture (CRITICAL), api-contract (CRITICAL), holistic (IMPORTANT)*

The architecture says `slice.json` "drops `epic` field (now encoded in path)" AND that "all slice events gain an `epic` field." These two claims create a contradiction that blocks implementation:

- **Current usage of `slice.epic`**: `handleBeginPlan` reads `sliceOrErr.epic` for sequential enforcement. `buildSliceCompleteResult` uses `newSlice.epic` to find sibling slices, derive learnings paths (`epics/${newSlice.epic}/learnings.jsonl`), and route deferred items. `slice-complete.ts` line 102 uses it for learnings rollup.
- **Event gap**: Only `CREATE_SLICE` currently carries `epic`. The remaining 8 slice events (`BEGIN_PLAN`, `COMPLETE_PLAN`, `BEGIN_REFINEMENT`, etc.) have only `slice: string`.
- **Deferred routing ambiguity**: `getSlice(tree, item.targetSlice)` needs to know which epic the target slice belongs to. The deferred item schema carries no epic information, and the target slice could belong to a different epic than the completing slice.

The architecture must pick ONE approach and document it fully:

- **Option A**: Add `epic` to every slice event. Requires changes to all event construction in `begin.ts`, `submit.ts`, `complete.ts`.
- **Option B**: Keep `epic` on `slice.json` (don't drop it). Handlers continue deriving from the entity. Path is denormalized but safe.
- **Option C**: Require callers to always pass epic via `Target`, and have the RPC layer inject it into events. Document the injection point.

Enumerate all call sites that depend on `slice.epic` for non-path purposes (learnings rollup, architecture delta paths, deferred item routing, sibling slice detection).

Resolution: DIRECTLY_ACTIONABLE

---

### C2. `hasChild` uniqueness guard and path resolution break with nested paths

*Sources: software-architecture (CRITICAL), api-contract (IMPORTANT)*

`slice-create.ts` uses `hasChild(state, "slices", event.name)` for uniqueness. With nested paths, this must become `hasChild(state, \`epics/${event.epic}/slices\`, event.name)`. Additionally, several state machine guards use patterns like `hasChild(state, "slices/${event.slice}", "plan.md")` which must become `hasChild(state, "epics/${event.epic}/slices/${event.slice}", "plan.md")`. Since these guards gate critical transitions (`COMPLETE_PLAN` requires `plan.md`, `BEGIN_IMPLEMENTATION` requires `plan-refined.md`), the exact new paths must be specified.

This ties directly to C1: the guard needs the epic name, which must come from somewhere (event field, state tree lookup, or Target).

Also: cross-epic name collisions — the architecture says directory structure eliminates them, but if same-named slices in different epics are truly supported, `activeSlice` in `project.json` (currently just a string name) becomes ambiguous. Document the uniqueness scope (per-epic vs global).

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT

### I1. `epic.sliceSequence` redundancy with overview `slices` array not addressed

*Sources: software-architecture (IMPORTANT), holistic (IMPORTANT), api-contract (IMPORTANT)*

All three reviewers flag this. `epic.json` has `sliceSequence: string[]` used for sequential enforcement in `slice-plan.ts`. The architecture proposes array order in `epics/overview.json` replaces `sequencing.md`, but never mentions `sliceSequence`. This creates two sources of truth.

The architecture must explicitly state: (a) `sliceSequence` is removed from `epic.json` and sequential enforcement reads from `epics/overview.json`, OR (b) `sliceSequence` remains and the overview is kept in sync. Option (a) is cleaner. If chosen, the migration must transfer `sliceSequence` ordering into the new embedded slices array. Also document what happens to completed/abandoned slices in the ordered array.

Resolution: DIRECTLY_ACTIONABLE

---

### I2. `updateSliceOverviewStatus` contract changes incompletely specified

*Sources: software-architecture (IMPORTANT), api-contract (CRITICAL)*

The helper changes from flat array lookup to nested epic->slice traversal. The architecture must specify:

1. New signature: `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)`
2. Lookup algorithm: find epic in `epics/overview.json.items`, then slice within `epic.slices`
3. Error handling: behavior when epic or slice not found (currently silently returns state)
4. Cascade: `setSliceStatus` calls `updateSliceOverviewStatus` and also needs the epic parameter — trace all callers of `setSliceStatus`
5. New `addSliceToOverview` equivalent: `CREATE_SLICE` must append to the correct epic's `slices` array. This function doesn't exist yet.

Resolution: DIRECTLY_ACTIONABLE

---

### I3. `addEpicToOverview` must include `slices: []` on creation

*Sources: software-architecture (MINOR), holistic (IMPORTANT)*

The new `epicOverviewItemSchema` requires `slices` to always be present. The current `addEpicToOverview()` creates `{ name, status, created, completed }` with no `slices` field. This must be updated to include `slices: []`. Implied but not called out in affected-apis.md.

Resolution: DIRECTLY_ACTIONABLE

---

### I4. `activeSlice` in `project.json` needs epic qualification

*Source: software-architecture (IMPORTANT)*

`project.json.activeSlice` is `string | null`. The brainstorm says "resolve epic from `project.json.activeEpic`" but this assumes activeSlice always belongs to activeEpic. If a user switches active epic while a slice is active, the invariant breaks. The architecture should explicitly document this constraint (activeSlice always belongs to activeEpic) or change the type to `{ epic: string; name: string } | null`.

Resolution: DIRECTLY_ACTIONABLE

---

### I5. Schema registry — `overviewSchema` still needed for quests/tasks

*Sources: api-contract (IMPORTANT), holistic (MINOR)*

The new `epicOverviewSchema` must be a separate schema, not a replacement of `overviewSchema`. The shared `overviewSchema` is still used for `quests/overview.json` and `tasks/overview.json`. Also explicitly list removing the `slices/overview.json` pattern from the registry (INV-005 boundary).

Resolution: DIRECTLY_ACTIONABLE

---

### I6. State Key Dependencies table and architecture docs need updating

*Sources: api-contract (IMPORTANT), holistic (IMPORTANT)*

The architecture modifies every slice event's read/write paths. The State Key Dependencies table in `state-machine-api.md` documents these as a contract. Additionally, `.project/architecture/` docs (`data-model.md`, `flows.md`, `rpc-layer-api.md`, `commands-api.md`) reference current `slices/` paths. The architecture should include a documentation update phase — without this, docs diverge from implementation immediately after the 45+ file change.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR

### M1. Migration step 5 ("Handle slices without epic field") is unnecessary

*Source: software-architecture (MINOR)*

`slice.json`'s Zod schema has `epic: z.string().min(1)` as required — no slice can exist without it today. Remove this step unless legacy data predates the schema.

Resolution: DIRECTLY_ACTIONABLE

---

### M2. Activity log `scope` field format change not documented

*Source: api-contract (MINOR)*

Transition handlers write `scope: "slices/${event.slice}"`. After restructuring, these should become `scope: "epics/${event.epic}/slices/${event.slice}"`. While informational, inconsistency with filesystem paths would confuse debugging.

Resolution: DIRECTLY_ACTIONABLE

---

### M3. `Target` type shown with 4 variants but codebase has 7

*Source: api-contract (MINOR)*

data-model-changes.md shows `Target` with 4 variants (epic, slice, quest, task). The codebase has 7 including `project`, `decision`, `rollup`. Show the complete union to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

---

### M4. `resolveEntityName` display format — conscious decision needed

*Source: api-contract (MINOR)*

With epic field now on target, callers may want `${epic}/${name}` for disambiguation. Not critical (display only), but worth documenting.

Resolution: DIRECTLY_ACTIONABLE

---

### M5. No verification approach section in architecture

*Source: holistic (MINOR)*

A brief section on how to verify the architecture works (e.g., `assembleState()` discovers files at new paths, schema registry patterns match) would help the implementer.

Resolution: DIRECTLY_ACTIONABLE

---

## Score Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Important | 6 |
| Minor | 5 |
