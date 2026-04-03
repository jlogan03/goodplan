# Holistic Review — Data Model Changes Plan

Reviewer: holistic
Iteration: 3
Scope: Entire plan

## Round 2 Fix Verification

All 6 issues from round 2 (0C, 3I, 3M) have been addressed in the revised plan:

- **[IMPORTANT] entityPath acceptable paths list incomplete**: Fixed. Phase 1 entityPath validation task now explicitly states "Decisions excluded (circular self-reference); project excluded (all decisions are already project-scoped)."
- **[IMPORTANT] `mapLearningInputs` code location**: Fixed. Phase 2 now specifies the exact location: "in the `entries.push({ ... })` call at ~line 144" with `!== undefined` guard.
- **[IMPORTANT] `complete.ts` epicComplete derivation**: Fixed. Phase 3 now has an explicit task: "Update `complete.ts` epicComplete derivation (~line 309): change path from `epics/overview.json` to `overview.json`, access `.epics` instead of `.items`, and update the `EpicOverview` type import to `UnifiedOverview`."
- **[MINOR] `migrate.ts` output structure**: Fixed. Phase 3 task now reads: "Update `buildMigrationState()` in `migrate.ts` to write a single `overview.json` with `{ epics, quests, tasks }` structure instead of separate entries."
- **[MINOR] Type export strategy**: Fixed. Phase 3 unified schema task now includes explicit guidance: preserve item-level schemas as building blocks, replace wrapper types with `UnifiedOverview`.
- **[MINOR] `decision:show` human-readable format**: Fixed. Task now specifies: display `entityPath` as "Scope: <path>" (omit if absent), `reconsiderWhen` as "Reconsider when:" header with bullet items (omit if absent).

## Issues

**[IMPORTANT]** Phase 3 `task-lifecycle.ts` directly constructs overview paths — plan claims helpers fully encapsulate access

The plan says: "helpers encapsulate overview access, so this is transitively covered by the helper updates above. Ensure helpers fully encapsulate overview access so `task-lifecycle.ts` never constructs overview paths directly. No direct changes expected unless helpers are incomplete."

Codebase exploration shows this assumption is wrong. At line 108 of `src/core/state/transitions/task-lifecycle.ts`, the `handleConvertTask` function directly constructs an overview path:

```ts
const targetOverview = getJson<Overview>(state, `${targetNamespace}/overview.json`);
```

where `targetNamespace` is `"quests"` or `"epics"`. This is a guard that checks the target overview exists before converting a task to a quest/epic. After the overview consolidation, this path (`quests/overview.json` or `epics/overview.json`) will not exist — it becomes `overview.json`. This will cause `CONVERT_TASK` to always fail with "overview.json not found."

The helpers do NOT fully encapsulate overview access for this file. The `addQuestToOverview` and `addEpicToOverview` helpers (used later in the same function) do encapsulate their paths, but the existence guard at line 108 is a direct path construction.

Resolution: DIRECTLY_ACTIONABLE

Fix: Change the Phase 3 `task-lifecycle.ts` task from a verification-only note to an explicit code change task: "Update `task-lifecycle.ts` line 108: change `getJson<Overview>(state, \`${targetNamespace}/overview.json\`)` to read from the consolidated `overview.json` and check the appropriate sub-key (`.quests` or `.epics`). Also update the `Overview` type import to `UnifiedOverview`."

---

**[MINOR]** Phase 4 HMAC stale entry removal could be more specific about mechanism

Phase 4 task says: "update HMAC — add entry for `overview.json` AND remove stale entries for `quests/overview.json` and `tasks/overview.json` to prevent `gp verify` phantom mismatches." This is correct intent, but the implementation path is unclear. The HMAC system in `src/core/data/hmac.ts` computes signatures over the full state tree generically — it doesn't have per-path add/remove operations. The migration uses `commitState()` which recomputes the entire HMAC from scratch. So the "remove stale entries" part happens automatically when the old files are deleted from the state tree before `commitState` runs. The plan should clarify that `commitState` handles HMAC recomputation automatically, and the real concern is sequencing: the old files must be absent from the state tree when `commitState` runs.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify the migration task: "Write consolidated `overview.json` to the state tree and remove old `quests/overview.json` and `tasks/overview.json` entries before calling `commitState()` — the HMAC is recomputed over the full tree automatically by `commitState`, so stale entries are handled by their absence."

---

**[MINOR]** Phase 3 `epic/list.ts` has a pre-existing type mismatch that the consolidation should fix

`src/commands/epic/list.ts` line 6 imports `Overview` (the quests/tasks shape with `{ items: OverviewItem[] }`) but uses it to type `epics/overview.json` which is actually an `EpicOverview` (with `slices` arrays on each item). This works at runtime because both have `.items`, but it's a latent type bug. The plan's consolidation to `UnifiedOverview` is a natural opportunity to fix this — the task "Update commands: `epic:list`..." should note that the type import changes from `Overview` to `UnifiedOverview` and the data access changes from `.items` to `.epics`.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a note to the epic:list update task: "Fix pre-existing type mismatch — currently imports `Overview` but should use `EpicOverview`/`UnifiedOverview`. Update to `UnifiedOverview` and access `.epics` instead of `.items`."

## Score: 9/10

The plan is well-structured, thorough, and all round 2 issues have been properly addressed. Phase ordering is logical with increasing blast radius. Verification sections are concrete and falsifiable with proper before/after checks. The `exactOptionalPropertyTypes` conditional spread guidance is correctly applied throughout. The single remaining IMPORTANT issue (task-lifecycle.ts direct path construction) is a real correctness bug that would cause test failures during implementation — it needs an explicit fix task rather than a verification-only note. The two MINOR issues are improvements to clarity and type hygiene. To reach 10: fix the task-lifecycle.ts path construction issue, and the plan is implementation-ready.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
