# Merged Architecture Review: Entity Restructuring (Round 2)

Reviewers: software-architecture (7/10), holistic (8/10), api-contract (8/10)
No critical issues. 6 important, 8 minor (after deduplication: 6 important, 7 minor).

---

## Important Issues

**[IMPORTANT-1] `DeferredItem.targetSlice` lacks epic qualification for cross-epic deferred routing**
Source: software-architecture

`DeferredItem` carries only `{ description, targetSlice }`. After restructuring, same-named slices in different epics are allowed ("Per-epic, not global"), so a bare slice name is no longer a unique key. Current code (`slice-complete.ts` line 52) does `getSlice(tree, item.targetSlice)` with a global flat lookup — this breaks post-restructuring.

Options: (a) add `targetEpic` to `DeferredItem`, (b) restrict deferred routing to same-epic slices and document this, (c) scan all epics (fragile on name collision). Option (b) is simplest and matches typical workflow.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] `activeSlice` invariant: `BEGIN_PLAN` enforcement description is inaccurate**
Source: software-architecture

`_overview.md` states: "The state machine enforces this: `BEGIN_PLAN` sets both `activeEpic` and `activeSlice`." But `BEGIN_PLAN` (`slice-plan.ts`) only sets `activeSlice` — `activeEpic` is set by `ACTIVATE_EPIC` (`epic-lifecycle.ts`). The invariant itself is sound, but the enforcement description is wrong and will mislead implementers.

Fix: change to "ACTIVATE_EPIC sets activeEpic; BEGIN_PLAN sets activeSlice within the active epic."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] `updateOverviewStatus` will use wrong type after restructuring, risking INV-005 violations**
Source: api-contract

`updateOverviewStatus` reads `epics/overview.json` as `getJson<Overview>(...)`. After restructuring, epic overview items carry a `slices` array. At runtime JavaScript spreads preserve unknown keys, but the TypeScript type won't include `slices` — and if `epicOverviewSchema` requires `slices`, schema validation (INV-005) will fail on every write. All overview-mutating helpers that touch `epics/overview.json` (`updateOverviewStatus`, `addEpicToOverview`) must be updated to use the new `EpicOverview` type, not the shared `Overview` type.

Note: `addEpicToOverview` is called out in `affected-apis.md` for the `slices: []` addition, but `updateOverviewStatus` is not explicitly listed there. Both require the type parameter change.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] `buildInitialEpicJson` not mentioned in architecture despite needing `sliceSequence` removal**
Source: holistic

`affected-apis.md` documents the `addEpicToOverview` change (add `slices: []`) but omits `buildInitialEpicJson()` (`helpers.ts` line 444-456), which constructs initial `epic.json` content with `sliceSequence: []`. This function must be updated to remove `sliceSequence` as part of the `epic.json` schema change in `data-model-changes.md`. It is not mentioned anywhere in the architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] Test fixtures with `sliceSequence` not identified for update**
Source: holistic

The architecture identifies ~15 skill files and 45+ source files but omits test fixtures. At least 4 fixture `epic.json` files contain `sliceSequence`:
- `tests/fixtures/slice-refining-max-rounds/.project/epics/test-epic/epic.json`
- `tests/fixtures/slice-in-progress/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-activated/.project/epics/test-epic/epic.json`
- `tests/fixtures/epic-created/.project/epics/test-epic/epic.json`

These fixtures also use `slices/overview.json` flat paths. After schema changes, they will fail INV-005 schema validation. The Subsystem Impact table needs a "Test Infrastructure" row enumerating fixture updates.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-6] Four event-building helpers in `begin.ts` construct slice events without `epic` field**
Source: api-contract

`buildAbandonEvent`, `buildPlanPhaseEvent`, `buildRefinePlanEvent`, and `buildImplementEvent` (lines 296-349) construct slice events using only `target.name`. After restructuring, all slice events require an `epic` field (e.g., `{ type: "BEGIN_PLAN", epic: target.epic, slice: target.name, ts }`). These four functions are not listed in `affected-apis.md`. They will be caught by TypeScript compilation, but should be listed explicitly for planning purposes.

Resolution: DIRECTLY_ACTIONABLE

---

## Minor Issues

**[MINOR-1] `COMPLETE_EPIC` does not clear `activeSlice` — invariant claim is aspirational**
Source: software-architecture

The invariant says "switching activeEpic clears activeSlice." `COMPLETE_EPIC` currently clears `activeEpic` but does NOT clear `activeSlice`. In practice the invariant holds because all slices must be completed/abandoned (each clears `activeSlice`) before the epic can complete. Options: (a) note explicitly that `activeSlice` is already null when `COMPLETE_EPIC` fires (by workflow ordering), or (b) have `COMPLETE_EPIC` defensively clear `activeSlice`. Option (a) is more honest.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] `CREATE_SLICE` guard says "requires epic in `activated` status" but code does not check this**
Source: software-architecture

`affected-apis.md` states `addSliceToOverview` has guard "CREATE_SLICE requires epic in `activated` status", but `slice-create.ts` only checks uniqueness and existence — not `epic.status === "activated"`. Either add the guard as part of this epic or document the workflow ordering assumption that makes the check unnecessary.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] Sequential enforcement migration from `epic.sliceSequence` to overview array order not traced through `slice-plan.ts`**
Source: software-architecture

`slice-plan.ts` (lines 43-66) reads `epic.sliceSequence` for sequential enforcement. The `affected-apis.md` describes helper signature changes but does not explicitly state how `handleBeginPlan` changes its sequential enforcement lookup. Must switch from `epic.sliceSequence.indexOf()` to finding the slice's index in the overview's `slices` array for the epic.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] `slice show` command call site omitted from `slice.epic` call-site table**
Source: holistic

`src/commands/slice/show.ts` (line 46) displays `slice.epic` in human-readable output. The `data-model-changes.md` "Call sites that use `slice.epic`" table enumerates state machine and RPC layer usages but omits command-layer display usages. Either add this call site or clarify the table scope.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Skill file count is inconsistent: architecture says ~15, enumerated list has 6**
Source: holistic

The architecture says "~15 skill files reference `.project/slices/` paths" but `affected-apis.md` Skills section only lists 6 specific skills, and a codebase search finds 11 with literal references. For a 45+ file change, the plan phase needs the complete list. Enumerate all affected skill files rather than estimating.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Verification Approach missing schema validation step for `epicOverviewSchema`**
Source: holistic (overlaps api-contract MINOR-7 below — distinct but related)

The Verification Approach section has 5 checks but none explicitly verify the new `epicOverviewSchema` against a round-tripped `epics/overview.json` with embedded slices. Add: "create epic with slices, serialize, parse through `epicOverviewSchema`, confirm no validation errors." This is especially important because `epicOverviewSchema` is a new schema type, not an extension of existing `overviewSchema`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Schema registry test will break: `slices/overview.json` and `epics/overview.json` assertions are stale**
Source: api-contract

`schema-registry.test.ts` line 24 asserts `slices/overview.json` resolves to `overviewSchema` (path being removed) and line 20 asserts `epics/overview.json` resolves to `overviewSchema` (must change to `epicOverviewSchema`). The Verification Approach mentions schema registry matching but does not explicitly list updating these test assertions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-8 — INFORMATIONAL] `CompleteInput` and `BeginPayloadMap` do not need changes; confirm in docs**
Source: api-contract

`CompleteInput` for the slice variant does not include `epic` — this is correct because `epic` comes from `Target`, not user input. Similarly, `BeginPayloadMap["create"]` has `epic?: string` via payload, but after restructuring `target.epic` is available. The plan should add a note confirming `CompleteInput` is intentionally unchanged, and clarify whether `CREATE_SLICE` events derive `epic` from `Target` or from payload (currently payload; `target.epic` would be more consistent).

Resolution: DIRECTLY_ACTIONABLE

---

## Conflict Notes

No direct conflicts between reviewers. Where topics overlapped:
- `updateOverviewStatus` / `addEpicToOverview` type changes: api-contract reviewer is more specific (trusted per conflict resolution rule for domain-specialist on type contract issues).
- Schema validation verification: holistic and api-contract both raise this from different angles (new schema round-trip vs. stale test assertions) — kept as two distinct minors (MINOR-6 and MINOR-7).

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| software-architecture | 7/10 | 0 | 2 | 3 |
| holistic | 8/10 | 0 | 2 | 3 |
| api-contract | 8/10 | 0 | 2 | 3 |
| **merged** | **7/10** | **0** | **6** | **8** |

Merged score reflects software-architecture's 7/10 as the floor (it identified the most structurally significant gap: `DeferredItem` cross-epic routing). Resolving the 6 important issues would bring the architecture to 9+.
