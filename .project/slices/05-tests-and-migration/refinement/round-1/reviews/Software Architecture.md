# Software Architecture Review

## Issues

**[CRITICAL]** Phase 1 omits 2 failing integration test files with stale flat paths

Phase 1 lists `result-paths.test.ts` as the only integration test needing path updates, but `workflow-slice.test.ts` (lines 20, 35) and `error-transitions.test.ts` (line 119) both contain hardcoded `path.join(env.GOODPLAN_DIR, "slices", ...)` that must change to nested `epics/test-epic/slices/...` paths. These are currently failing tests (confirmed: 2 failures in `workflow-slice.test.ts`, 1 in `error-transitions.test.ts`). Without fixing these, the "bun test -> 0 failures" Phase 1 verification will not pass.

Add explicit tasks for:
- `tests/integration/workflow-slice.test.ts` line 20: `path.join(env.GOODPLAN_DIR, "slices", "new-slice")` -> `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "new-slice")`
- `tests/integration/workflow-slice.test.ts` line 35: `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` -> `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "test-slice")`
- `tests/integration/error-transitions.test.ts` line 119: same pattern

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Phase 3 depends on Phase 2 changes being installed, but the plan uses the installed CLI

Phase 3 says to run `goodplan migrate` on this repo. Per repo rules, this must use the installed CLI (v1.0.0 on PATH). However, the installed CLI still has the `STATE_ALREADY_INITIALIZED` guard that Phase 2 removes. Since `.project/project.json` exists, the installed CLI will reject the migration with `STATE_ALREADY_INITIALIZED`. Phase 3 cannot execute unless Phase 2's changes are built and installed first.

The plan must add an explicit step between Phase 2 and Phase 3: build the updated CLI (`bun run build`) and install it (`bun run install:cli` or equivalent), or document an alternative approach. This is a cross-phase dependency that blocks Phase 3 entirely.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 doesn't address `.project-old/` collision on re-migration

Phase 2 removes the `project.json` guard to allow re-migration, but `renameProjectDir()` (line 430-438 in `migrate.ts`) throws `DATA_MIGRATION_BACKUP_EXISTS` if `.project-old/` already exists from a prior migration. The plan's "migration philosophy" says migrate is a general-purpose "rebuild state" tool, but repeated re-migration will fail on the second run unless `.project-old/` is manually removed first.

Either: (a) document this as a known constraint and add a `--force` flag or instructions for the user, (b) modify `renameProjectDir` to use a timestamped backup name (`.project-old-<timestamp>/`), or (c) add a pre-check that removes or renames the existing `.project-old/` directory. This doesn't block this slice but undermines the re-migration philosophy.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 lists 9 unit test files and 2 fixtures that need no changes

All 9 unit test files listed in Phase 1 (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) already pass. The fixture `epic.json` files already have `sliceSequence` removed. The research document confirms this ("the actual failures are concentrated in 4 integration/fitness test files"). Including ~20 unnecessary tasks creates implementation confusion and risk of unintended changes to passing tests.

Remove the unit test file tasks and fixture `epic.json` tasks from Phase 1. Keep only the actually-failing tests: `workflow-slice.test.ts`, `error-transitions.test.ts`, `result-paths.test.ts`, `stateless-commands.test.ts`, and the `startContext.test.ts` verification task (which correctly says "verify already correct"). Keep the fixture `activity-log.jsonl` scope-string tasks -- those are architecturally correct cleanup even if not test-blocking.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 migration test updates are under-specified

Phase 2 says "verify existing migration unit tests still pass after removing `sliceSequence` from output. Update assertions that check `epic.json` content if they expect `sliceSequence`." But `tests/unit/rpc/migrate.test.ts` has `sliceSequence` in 5 locations (lines 86, 300, 359, 432, 571) and `tests/integration/migrate.test.ts` has it in 8 locations (lines 79, 212, 401, 439, 495, 523, 594, 600). These assertions will fail when `sliceSequence` is removed from `buildMigrationState` output.

Enumerate the specific assertion changes needed in both test files. For each `sliceSequence` reference: if it's in a Q&A input (epicDetailResponseSchema), keep it; if it's in an output assertion checking `epic.json` content, remove or update it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "before" check is inaccurate

The "before implementation" check says `bun test 2>&1 | grep -c 'FAIL'` should show "8 or more failing test files." The actual count is 5 failing test files (3 integration + 1 fitness + 1 migrate unit), with 8 individual test failures. The distinction between failing files and failing tests matters for the verification step.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification doesn't check activity-log scope strings

Phase 3 fixes architecture docs but the verification section doesn't grep for stale `scope: "slices/..."` patterns in the migrated `activity-log.jsonl`. If migration rebuilds state from Q&A, the activity log entries' scope strings may still use flat paths (since they're historical records). Clarify whether historical scope strings should be updated during migration or preserved as-is. If preserved, add a note explaining why stale scope strings in the activity log are expected.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has the right overall structure (tests -> migration code -> self-migrate) and correctly identifies the three concerns. However, two critical issues block execution: Phase 1 omits 3 of the 5 actually-failing test files while listing 9 already-passing ones, and Phase 3 has an unaddressed dependency on installing Phase 2's changes. The re-migration philosophy is also incomplete without addressing `.project-old/` collision. Fixing the critical issues (accurate test file list, install step between Phase 2 and 3) and the important issues (`.project-old/` handling, migration test enumeration) would bring this to 9+.

## Summary
- Critical: 2
- Important: 3
- Minor: 2
