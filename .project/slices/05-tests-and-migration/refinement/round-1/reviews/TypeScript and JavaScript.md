## Issues

**[CRITICAL]** Phase 1 lists ~12 unit test files that were already fixed in slice 02 (commit 68d9c05)
The research file confirms only 4 integration/fitness test files actually fail (migrate.test.ts, workflow-slice.test.ts, error-transitions.test.ts, result-paths.test.ts, stateless-commands.test.ts). The plan lists 9 unit test files (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) and 2 fixture files with specific line-numbered edits that have already been applied. Implementing these tasks will either fail (the old strings don't exist anymore) or silently produce no-ops, wasting effort. The plan must be scoped to the actual failing tests only.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 1 is missing 3 of the 5 actually-failing test files
The plan's Phase 1 does not include tasks for `tests/integration/workflow-slice.test.ts` (2 failures — flat `slices/test-slice` path references at lines 20, 35, 102), `tests/integration/error-transitions.test.ts` (1 failure — flat `slices/test-slice/slice.json` path at line 119), or `tests/integration/migrate.test.ts` (3 failures — `slices/overview.json` existence check at line 186, `state.contents.slices` directory traversal at lines 443-457, `sliceSequence` assertion at line 439/212). The plan mentions `migrate.test.ts` only in Phase 2 as "verify existing tests still pass" but the actual fixes needed are substantial: the full-flow integration test checks for a `slices/overview.json` file that no longer exists, `buildMigrationState` unit tests traverse `state.contents.slices` which is no longer a top-level directory, and `sliceSequence` is asserted on `epic.json` output.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2: `buildMigrationState` still outputs `sliceSequence` in `epic.json` but also still outputs slices under a top-level `slices/` directory — both need fixing
The plan correctly identifies `sliceSequence` removal from `buildMigrationState` output (line 256) and the `STATE_ALREADY_INITIALIZED` guard removal. However, it does not address the fact that `buildMigrationState` currently constructs `state.contents.slices` as a top-level directory with `overview.json` and slice entities. After the entity restructuring, migration output should nest slices under `epics/<epic>/slices/` and omit the top-level `slices/` directory and `slices/overview.json`. The existing integration tests for `buildMigrationState` (lines 443-457) fail precisely because this structural change has already happened in the schema/state machine but not in `buildMigrationState`. The plan should explicitly include a task to restructure `buildMigrationState` to nest slices under their parent epic directory entry.
Resolution: CODEBASE_EXPLORATION

Research: Examine `buildMigrationState` in `src/core/rpc/migrate.ts` (around lines 200-300) to understand the full state tree it constructs and identify all locations that build the flat `slices/` directory structure. Determine whether slices should be nested under `epics/<epic>/slices/` in the migration output or if the current code already does this and the tests just need updating.

**[IMPORTANT]** Phase 2: migration integration test assertions need specific update tasks, not just "verify still passes"
The plan says "verify existing migration unit tests still pass after removing `sliceSequence` from output. Update assertions that check `epic.json` content if they expect `sliceSequence`." This is too vague for an implementation plan. The specific changes needed are: (1) line 212: remove `expect(epicJson.sliceSequence).toEqual(...)`, (2) lines 186-194: remove `slices/overview.json` existence check and slice overview assertions, (3) lines 214-218: update `slices/first-slice/slice.json` path to `epics/test-epic/slices/first-slice/slice.json`, (4) lines 443-457: restructure `buildMigrationState` unit test to traverse `epics/<epic>/slices/<name>` instead of `state.contents.slices`, (5) lines 530-536: same for zero-slices test case.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 Expected Behavior "before" check is inaccurate
The plan states `bun test 2>&1 | grep -c 'FAIL'` should show "8 or more failing test files." Current test output shows exactly 8 failures across 5 files (not 8+ files). This is a minor accuracy issue for the "before" check, but the "after" check (`bun test → 0 failures`) is the one that matters and is correct.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: `startContext.test.ts` task is ambiguous ("verify already correct")
The task says "verify `sliceSequence` usage is in migration context or remove if it's in an epic.json fixture that no longer has the field." This is not actionable — it's a conditional task with no clear resolution. Since all unit tests currently pass, this file likely needs no changes. Either remove this task or investigate and specify the concrete change.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: `grep -c 'sliceSequence' src/core/rpc/migrate.ts` verification is imprecise
The Expected Behavior says the grep should show `sliceSequence` "only in Q&A collection (not in `buildMigrationState` output)." But `grep -c` just returns a count — it doesn't tell you where the matches are. A better verification: `grep -n 'sliceSequence' src/core/rpc/migrate.ts` and confirm matches are only in the Q&A question/hint section (line ~725), not in `buildMigrationState`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10
The plan has two critical issues: it lists ~12 already-fixed unit test files as tasks (wasted effort / will fail during implementation), and it is missing 3 of the 5 actually-failing test files. Phase 2 is also incomplete — it identifies `sliceSequence` removal but misses the structural change needed in `buildMigrationState` to nest slices under epics. To reach 9+: (1) replace the Phase 1 unit test file list with the actual failing files (workflow-slice.test.ts, error-transitions.test.ts, result-paths.test.ts, stateless-commands.test.ts, migrate.test.ts), (2) add explicit tasks for restructuring `buildMigrationState` output, (3) add specific line-level migration test assertion updates.

## Summary
- Critical: 2
- Important: 3
- Minor: 2
