# Holistic Review — Slice 05: Tests and Migration

## Issues

**[CRITICAL] Phase 1 is missing 3 failing test files — plan will not achieve "all tests pass"**
The plan lists 12 test files + 2 fixtures needing updates, but the actual failing tests are in files the plan either omits or only partially covers:
- `tests/integration/workflow-slice.test.ts` (2 failures) — uses `path.join(env.GOODPLAN_DIR, "slices", "new-slice")` at line 20 and `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` at line 35. Not listed in the plan's Phase 1 tasks at all.
- `tests/integration/error-transitions.test.ts` (1 failure) — uses `path.join(env.GOODPLAN_DIR, "slices", "test-slice", "slice.json")` at line 119. Not listed in the plan's Phase 1 tasks.
- `tests/integration/migrate.test.ts` (3 failures) — partially covered in Phase 2 but not in Phase 1. The failures involve `state.contents.slices` (flat top-level directory) and `sliceSequence` in `epic.json` output assertions. Phase 2 mentions "verify existing migration unit tests still pass" and "update assertions," but the 3 integration test failures need explicit task items.

Meanwhile, the 9 unit test files listed in Phase 1 (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) all pass already. The research file confirms this: "All unit tests pass (13/13 migrate unit tests, all others)." The plan's Phase 1 unit test tasks are unnecessary work — the real failures are in integration tests.

Fix: Replace the 9 unit test task items with explicit tasks for `workflow-slice.test.ts`, `error-transitions.test.ts`, and `migrate.test.ts` (integration test path fixes). Keep fixture activity-log and fitness test tasks.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 unit test tasks are wasted effort — all 9 listed files already pass**
Running `bun test` against all 9 unit test files listed in Phase 1 (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) shows 192 pass, 0 fail. These were already fixed in slice 02's commit (68d9c05, which touched 14 test files). The plan's unit test tasks reference specific line numbers with specific changes that are either already done or no longer applicable. Implementing these tasks would either be no-ops (if the code is already changed) or introduce regressions (if the implementer force-applies changes to already-correct code based on stale line numbers).

Fix: Remove all 9 unit test file tasks from Phase 1. Add a verification step confirming they pass (`bun test tests/unit/` as a pre-check). Focus Phase 1 exclusively on the 4 actually-failing integration/fitness test files plus the 2 fixture activity-log updates.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 Expected Behavior "before" check overestimates failures**
The before check says `bun test 2>&1 | grep -c 'FAIL'` should show "8 or more failing test files." Actual count is 8 failing tests across 5 files (3 in migrate.test.ts, 2 in workflow-slice.test.ts, 1 each in error-transitions.test.ts, result-paths.test.ts, and stateless-commands.test.ts). The check counts test cases, not test files. While the number happens to be 8, the description says "8 or more failing test files" which is misleading — it's 5 files with 8 failing test cases. The imprecision could cause the implementer to think they've missed something.

Fix: Update to "5 failing test files with 8 total failing tests" for accuracy.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 Expected Behavior checks are not runnable against this repo**
Phase 2's before/after checks use `echo '' | goodplan migrate --json` — this runs the **installed** CLI, not the locally-built binary. But Phase 2 changes `src/core/rpc/migrate.ts` in the repo source. The "after" check will always show the old behavior (installed CLI unchanged) regardless of whether the code change is correct. The verification section at the bottom of Phase 2 acknowledges this with "on a test fixture with `project.json`" but the Expected Behavior section doesn't.

Fix: Phase 2's Expected Behavior should use the locally-built binary against a test fixture directory, or explicitly note that these checks require rebuilding and installing the CLI first. Better: rely on the unit/integration test commands (`bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts`) as the primary before/after checks, since those use the local build.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 lacks explicit task items for the 3 failing migration integration tests**
`tests/integration/migrate.test.ts` has 3 failing tests. Phase 2 says "verify existing migration unit tests still pass after removing `sliceSequence` from output. Update assertions that check `epic.json` content if they expect `sliceSequence`" and "verify `tests/integration/migrate.test.ts` still passes." These are vague — the implementer needs to know what specific assertions to update:
1. `state.contents.slices` directory no longer exists at the top level — tests that check for it need to look under `epics/<epic>/slices/` instead
2. `sliceSequence` in `epic.json` output needs to be removed from assertions
3. The `STATE_ALREADY_INITIALIZED` test (line 300) needs to be either removed or converted to a test that verifies migrate proceeds on initialized projects

Fix: Add explicit task items with the specific test names and what to change.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 doesn't address `STATE_ALREADY_INITIALIZED` test in `tests/unit/state/reduce.test.ts`**
`reduce.test.ts` at line 84 has a test `"returns STATE_ALREADY_INITIALIZED when project.json exists"`. If the `project.json` guard is being removed from `migrate.ts`, this test in `reduce.test.ts` may also need updating if the state machine's INIT event has a similar guard. The plan only mentions `migrate.test.ts` and `migrate.test.ts` (integration).

Fix: Verify whether `reduce.test.ts`'s `STATE_ALREADY_INITIALIZED` test relates to `init` (which keeps the guard) or `migrate` (which removes it). If it's `init`-specific, no change needed. If it tests migrate behavior, add it to Phase 2 tasks.
Resolution: CODEBASE_EXPLORATION

**[MINOR] `sliceSequence` in non-migration test fixtures — plan task is incomplete**
The plan's Phase 1 task for `status.test.ts` says "Remove `sliceSequence` from non-migration epic.json fixtures (lines 98, 310, 382)." But `startContext.test.ts` line 43 also has `sliceSequence` in an epic.json fixture. The plan's task for `startContext.test.ts` says "verify `sliceSequence` usage is in migration context or remove if it's in an epic.json fixture." Since both files currently pass (the schema likely uses `.passthrough()` or the fixtures are raw JSON objects not validated against `epicSchema`), this is a minor cleanup for correctness rather than a test fix. But the plan should be explicit about what to do: if these fixtures should match `epicSchema`, remove `sliceSequence`; if they're raw JSON blobs, leave them.

Fix: Clarify the decision: are these fixtures validated against `epicSchema`? If yes, remove `sliceSequence`. If no, note that this is a latent inconsistency and add a comment.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 backup step is good but lacks verification criteria**
Phase 3 includes `cp -r .project .project-backup` as a backup step, which aligns with the user's CLAUDE.md preference. However, the backup task doesn't include a verification that the backup completed successfully (e.g., `diff -rq .project .project-backup` or `ls .project-backup/project.json`). For the self-migration of this repo's state, a verified backup provides stronger safety.

Fix: Add a brief backup verification check.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 Expected Behavior "before" check for `goodplan status --json | grep totalSlices` uses a field name not confirmed in the output**
The check says `totalSlices` with expected count 26. This should be verified against the actual `goodplan status --json` output field name.
Resolution: CODEBASE_EXPLORATION

## Score: 5/10

The plan has correct high-level structure and goals, but Phase 1 — the largest phase — is fundamentally misaligned with reality. It lists 9 unit test files for updates that all already pass, while omitting 3 integration test files that actually fail. An implementer following this plan would do unnecessary work on passing tests and miss the actual failures, leaving the test suite broken after Phase 1. Phase 2 has workable tasks but vague test-update items and unrunnable expected behavior checks. Phase 3 is the strongest phase with clear, correct tasks.

To reach 9+: (1) Replace Phase 1's unit test tasks with the actual failing integration test files, (2) add explicit task items for the 3 failing migration tests in Phase 2, (3) fix the expected behavior checks to be runnable and accurate.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
