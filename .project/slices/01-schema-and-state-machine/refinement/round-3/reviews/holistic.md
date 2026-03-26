# Holistic Review — Round 3

## Issues

**[IMPORTANT]** `migrate.ts` writes flat slice paths and uses `sliceSequence` — not addressed by the plan

`src/core/rpc/migrate.ts` is the migration command's orchestrator. It constructs the full initial state tree when migrating a pre-CLI project. Codebase verification shows:

- Line 315: `slicesContents[slice.name] = { type: "directory", contents: sliceDirContents }` — builds flat `slices/<name>/` directory entries
- Line 323: `slicesContents["overview.json"] = slicesOverview` — writes flat `slices/overview.json`
- Line 386: `slices: { type: "directory", contents: slicesContents }` — places all slices under `slices/` in the root tree
- Line 241: `sliceSequence: detail?.sliceSequence ?? []` — writes `sliceSequence` into `epic.json`

The plan's Scope Boundary section lists `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, and `src/core/rpc/paths.ts` as deferred to slice 02, but omits `migrate.ts`. Unlike `begin.ts`/`complete.ts` which build events for the state machine, `migrate.ts` builds the entire state tree structure directly — it writes `slices/` flat paths and `sliceSequence` into epic JSON. After this slice lands, any migrated project would have a flat path structure that breaks every subsequent CLI command (all state machine handlers will look for `epics/<epic>/slices/<name>/slice.json` and find nothing). This is not the same class of issue as the `begin.ts`/`complete.ts` event-builder updates — those produce events that the state machine handles; `migrate.ts` writes the final entity files directly.

The plan must either: (a) add `migrate.ts` as an in-scope file in this slice (updating flat path construction to nested), or (b) explicitly defer it to slice 02 with a `@ts-expect-error` or schema-type workaround that prevents `tsc` failure, and document the migration-output inconsistency as a known gap until slice 02 lands. Option (a) is safer — migration must produce the new structure for the post-migration state to be usable.

The `EpicDetailResponse.sliceSequence` field in `src/commands/global/migrate/schemas.ts` is also used by `migrate.ts` to populate `epic.sliceSequence`. After this slice removes `sliceSequence` from `epicSchema`, writing it during migration will cause a schema validation failure (INV-005) on the next read. This must be addressed before or alongside the `epicSchema` change.

Finally, `tests/integration/migrate.test.ts` (line 212: `expect(epicJson.sliceSequence)...`) and `tests/unit/rpc/migrate.test.ts` (lines 86, 301, 360, 433, 572) all reference `sliceSequence` inline and are not covered by any fixture update task.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `fresh-init` fixture has `slices/overview.json` — not listed in fixture update tasks

The fixture update task in Phase 2 lists 4 fixture directories: `slice-refining-max-rounds`, `slice-in-progress`, `epic-activated`, `epic-created`. Codebase check shows a fifth fixture directory `fresh-init` also contains `slices/overview.json` (confirmed at `tests/fixtures/fresh-init/.project/slices/overview.json`). The `fresh-init` fixture is used by 8 test files (fitness and integration). While `slices/overview.json` in `fresh-init` is empty (`{ "items": [] }`), it still exists as a flat path and will need to be removed once Phase 2 lands. Add `fresh-init` to the fixture update task list.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 before-check for slice events still not slice-specific

The Round-2 review noted this as a minor: Phase 1 Expected Behavior "before" check uses `grep -c "epic:" src/schemas/state-events.ts` which will return a large count (16+) matching epic lifecycle events, not just slice events. The current plan partially addresses this by adding "manual inspection of slice event types" as a caveat, but the "before" check is still not a runnable falsifiable assertion as required by criterion 6a. An implementer following the plan literally cannot use this check to verify the before state. Replace with a slice-specific grep such as:
```
grep -E "(BEGIN_PLAN|COMPLETE_PLAN|BEGIN_REFINEMENT|COMPLETE_REFINEMENT_ROUND|BEGIN_IMPLEMENTATION|COMPLETE_IMPLEMENTATION|COMPLETE_SLICE|ABANDON_SLICE):" src/schemas/state-events.ts | grep "epic:"
```
This would return zero matches before implementation and 8 matches after.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round-2 IMPORTANT issues are all correctly resolved: scope boundary now explicitly documents `types.ts` as in-scope, `Verification` import is explicitly called out in the task, and `rollup-learnings` task is cleanly marked as verification-only with a grep check. The plan is otherwise thorough and well-structured. Score is held at 8/10 due to the new IMPORTANT finding: `migrate.ts` writes flat paths and uses `sliceSequence` — an omission that would cause migrated projects to be unreadable by the post-slice-01 CLI. Fixing the migrate gap and the two minors would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
