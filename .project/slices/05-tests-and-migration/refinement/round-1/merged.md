# Merged Feedback — Slice 05: Tests and Migration (Round 1)

## CRITICAL Issues

### C1. Phase 1 omits 3 actually-failing integration test files
**Flagged by:** Holistic, Software Architecture, TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Phase 1 does not include tasks for:
- `tests/integration/workflow-slice.test.ts` (2 failures) — flat `path.join(env.GOODPLAN_DIR, "slices", ...)` at lines 20, 35
- `tests/integration/error-transitions.test.ts` (1 failure) — flat `slices/test-slice/slice.json` path at line 119
- `tests/integration/migrate.test.ts` (3 failures) — `slices/overview.json` existence check, `state.contents.slices` traversal, `sliceSequence` assertions

These are the tests that actually fail. Without them, Phase 1's verification ("bun test -> 0 failures") cannot pass.

### C2. Phase 1 lists ~9 unit test files that already pass — wasted effort / risk of regression
**Flagged by:** Holistic, Software Architecture, TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

All 9 unit test files listed in Phase 1 (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) already pass — fixed in slice 02's commit (68d9c05). The plan's line-numbered edit tasks reference code that has already been changed. Implementing these tasks will either produce no-ops or introduce regressions.

### C3. Phase 3 cannot execute — depends on Phase 2 changes being installed
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Phase 3 runs `goodplan migrate` on this repo using the installed CLI. But the installed CLI still has the `STATE_ALREADY_INITIALIZED` guard that Phase 2 removes from source. Since `.project/project.json` exists, the installed CLI will reject the migration. The plan must add an explicit build+install step between Phase 2 and Phase 3.

## IMPORTANT Issues

### I1. Phase 2 migration test assertions need specific update tasks
**Flagged by:** Holistic, Software Architecture, TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Phase 2 says "verify existing migration unit tests still pass" and "update assertions" — too vague. Specific changes needed:
- `tests/unit/rpc/migrate.test.ts`: `sliceSequence` appears in ~5 locations (lines 86, 300, 359, 432, 571) — remove from output assertions, keep in Q&A input
- `tests/integration/migrate.test.ts`: `sliceSequence` in ~8 locations — same treatment; also update `slices/overview.json` existence checks and `state.contents.slices` directory traversal to use nested paths

### I2. Phase 2 doesn't address `.project-old/` collision on re-migration
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

`renameProjectDir()` throws `DATA_MIGRATION_BACKUP_EXISTS` if `.project-old/` already exists. The plan's "re-migration" philosophy means a second `migrate` run will fail. Options: (a) timestamped backup names, (b) `--force` flag, (c) remove existing `.project-old/` automatically. At minimum, document this constraint.

### I3. Phase 1 Expected Behavior "before" check is inaccurate
**Flagged by:** Holistic, Software Architecture, TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Says "8 or more failing test files" but the actual count is 5 failing test files with 8 total failing test cases. Update to be accurate.

### I4. Migrate command description/help text not updated after removing project.json guard
**Flagged by:** TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

`src/commands/global/migrate.ts` currently says "Requires .project/ to exist and .project/project.json to NOT exist" in `meta.description`, JSDoc comment, and preconditions. After Phase 2 removes the guard, these descriptions will be inaccurate. Add a task to update them.

### I5. No user-facing messaging for re-migration behavior change
**Flagged by:** TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

Removing the `STATE_ALREADY_INITIALIZED` guard means a user who previously got a clear error will now silently enter Q&A mode, potentially overwriting state. Add a stderr warning when `project.json` exists, explaining that re-migration will rebuild state.

### I6. Phase 2 Expected Behavior checks use installed CLI, not local build
**Flagged by:** Holistic, TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

Phase 2's `echo '' | goodplan migrate --json` runs the installed CLI which won't have Phase 2's changes. Use integration tests (`bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts`) as the primary before/after checks, or use the locally-built binary against a test fixture.

### I7. Phase 2 may need `buildMigrationState` structural changes (slices nesting under epics)
**Flagged by:** TypeScript and JavaScript
**Resolution:** RESEARCH_NEEDED

`buildMigrationState` may still construct `state.contents.slices` as a top-level directory. After entity restructuring, migration output should nest slices under `epics/<epic>/slices/`. Need to examine `buildMigrationState` in `src/core/rpc/migrate.ts` to determine if structural changes are needed or if only test assertions need updating.

## MINOR Issues

### M1. `sliceSequence` in non-migration test fixtures — incomplete cleanup
**Flagged by:** Holistic
**Resolution:** DIRECTLY_ACTIONABLE

`startContext.test.ts` line 43 has `sliceSequence` in an epic.json fixture. Clarify whether these fixtures are validated against `epicSchema` — if yes, remove `sliceSequence`; if no, note as latent inconsistency.

### M2. Phase 3 backup step lacks verification
**Flagged by:** Holistic
**Resolution:** DIRECTLY_ACTIONABLE

Add a brief check after `cp -r .project .project-backup` (e.g., `ls .project-backup/project.json`).

### M3. Phase 3 `goodplan status --json | grep totalSlices` field name unverified
**Flagged by:** Holistic
**Resolution:** CODEBASE_EXPLORATION

Verify `totalSlices` is the actual field name in `goodplan status --json` output.

### M4. Fitness test exemption comment for `migrate` is misleading
**Flagged by:** TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

Plan says to add `migrate` to `READ_ONLY_COMMANDS` with comment "it's read-only at the command level." This is inaccurate — `migrate` writes files and calls `commitState()`. Use a separate exemption category or add to `STDIN_ENTITY_COMMANDS` with a comment that it operates on the entire project scope rather than targeting a specific entity.

### M5. Phase 2 `grep -c 'sliceSequence'` verification is imprecise
**Flagged by:** TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

`grep -c` returns a count, not locations. Use `grep -n` and confirm matches are only in Q&A collection, not in `buildMigrationState`.

### M6. `startContext.test.ts` task is ambiguous
**Flagged by:** TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Task says "verify already correct" — either remove the task or investigate and specify the concrete change.

### M7. `reduce.test.ts` `STATE_ALREADY_INITIALIZED` test may need updating
**Flagged by:** Holistic
**Resolution:** CODEBASE_EXPLORATION

Verify whether `reduce.test.ts` line 84's `STATE_ALREADY_INITIALIZED` test relates to `init` (keep) or `migrate` (update for Phase 2).

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Replace Phase 1 unit test tasks with actual failing integration tests** (C1 + C2)
   - Remove all 9 unit test file tasks and 2 fixture epic.json tasks from Phase 1
   - Add task: `tests/integration/workflow-slice.test.ts` — change `path.join(env.GOODPLAN_DIR, "slices", "new-slice")` to `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "new-slice")` at line 20; same pattern at line 35
   - Add task: `tests/integration/error-transitions.test.ts` — change flat `slices/test-slice/slice.json` path to nested `epics/test-epic/slices/test-slice/slice.json` at line 119
   - Add task: `tests/integration/migrate.test.ts` — move to Phase 1 for path fixes (or split: path fixes in Phase 1, `sliceSequence` assertion changes in Phase 2)
   - Keep fixture `activity-log.jsonl` scope-string tasks and `result-paths.test.ts`/`stateless-commands.test.ts` tasks
   - Add verification pre-check: `bun test tests/unit/` to confirm unit tests still pass

2. **Add build+install step between Phase 2 and Phase 3** (C3)
   - After Phase 2 completion, add explicit tasks: `bun run build` then `bun run install:cli` (or equivalent) so the installed CLI has the `STATE_ALREADY_INITIALIZED` guard removed before Phase 3 runs `goodplan migrate`

3. **Enumerate specific migration test assertion changes in Phase 2** (I1)
   - `tests/unit/rpc/migrate.test.ts`: remove `sliceSequence` from output assertions at lines 86, 300, 359, 432, 571; keep in Q&A input assertions
   - `tests/integration/migrate.test.ts`: remove `sliceSequence` from output assertions; update `slices/overview.json` existence checks; update `state.contents.slices` directory traversal to use `epics/<epic>/slices/` paths

4. **Document `.project-old/` collision constraint** (I2)
   - Add a note in Phase 2 acknowledging that re-migration will fail if `.project-old/` exists from a prior run. At minimum, add a task to document this; optionally, add a pre-check that removes/renames existing `.project-old/`

5. **Fix Phase 1 Expected Behavior "before" check** (I3)
   - Change "8 or more failing test files" to "5 failing test files with 8 total failing test cases"

6. **Update migrate command description in Phase 2** (I4)
   - File: `src/commands/global/migrate.ts`
   - Update `meta.description`, JSDoc comment (line 19), and preconditions block to reflect that `migrate` now supports re-migration of initialized projects

7. **Add re-migration warning to stderr** (I5)
   - In `rpcMigrate` (or the command handler), when `project.json` exists, emit a stderr warning: "Project is already initialized. Re-migration will rebuild state from directory contents."

8. **Fix Phase 2 Expected Behavior to use local build or tests** (I6)
   - Replace `echo '' | goodplan migrate --json` with `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` as primary verification, or note that manual check requires rebuilding

9. **Fix fitness test exemption comment** (M4)
   - Don't add `migrate` to `READ_ONLY_COMMANDS` — use a separate exemption with comment explaining it operates on entire project scope, not a specific entity

10. **Fix Phase 2 grep verification** (M5)
    - Change `grep -c 'sliceSequence'` to `grep -n 'sliceSequence'` and verify matches are only in Q&A section

11. **Clarify `startContext.test.ts` task** (M6)
    - Either remove the "verify already correct" task or replace with a concrete action

12. **Add Phase 3 backup verification** (M2)
    - After `cp -r .project .project-backup`, add `ls .project-backup/project.json` check

13. **Clarify `sliceSequence` in `startContext.test.ts` fixture** (M1)
    - If fixture is validated against `epicSchema`, remove `sliceSequence`; if raw JSON blob, note as latent inconsistency

## RESEARCH_NEEDED

1. **`buildMigrationState` structural changes** (I7) — Examine `buildMigrationState` in `src/core/rpc/migrate.ts` (~lines 200-300) to determine if it still constructs a top-level `slices/` directory structure. If so, determine whether the function needs to be restructured to nest slices under `epics/<epic>/slices/` or if only test assertions need updating.

2. **`reduce.test.ts` `STATE_ALREADY_INITIALIZED` test scope** (M7) — Check whether the test at line 84 of `tests/unit/state/reduce.test.ts` tests `init` behavior (keep as-is) or `migrate` behavior (needs Phase 2 update).

3. **Phase 3 `totalSlices` field name** (M3) — Verify the actual field name in `goodplan status --json` output matches the plan's `totalSlices` reference.

4. **Activity-log scope strings after migration** (from Software Architecture M2) — Determine whether historical `scope: "slices/..."` strings in `activity-log.jsonl` should be updated during migration or preserved as historical records.

## Contradictions Resolved

1. **TUI/CLI reviewer scored Phase 1 as "solid on test path fixes" (7/10) while all other reviewers flagged Phase 1 as critically flawed.** Trusted the three domain specialists (Holistic, Architecture, TypeScript) who independently verified the specific test files and confirmed the unit tests already pass. The TUI/CLI reviewer's higher score reflects its narrower scope (command surface, help text) rather than Phase 1 test accuracy.

2. **TypeScript reviewer lists `migrate.test.ts` as a Phase 1 issue; Holistic and Architecture reviewers place it in Phase 2.** No real contradiction — `migrate.test.ts` has both path-related failures (Phase 1 scope) and `sliceSequence`/structural failures (Phase 2 scope). The fix should be split across phases: path fixes in Phase 1, `sliceSequence` assertion changes in Phase 2.

## Unresolved (USER_INPUT required)

(All resolved — see below)

## USER_INPUT Resolved

1. **`.project-old/` collision policy**: User chose **timestamped backups** — use `.project-old-<timestamp>/` so multiple backups accumulate. Update `renameProjectDir()` in `src/core/rpc/migrate.ts` to use timestamped names instead of fixed `.project-old/`.

2. **Re-migration warning**: User chose **yes, emit warning** — when `project.json` exists, emit stderr warning: "Project is already initialized. Re-migration will rebuild state from directory contents." before proceeding.

## Available Research

Research findings are in `/Users/iwhite/Repos/goodplan/.project/slices/05-tests-and-migration/research/`:

1. **build-migration-state.md** — `buildMigrationState` already nests slices under `epics/<epic>/slices/`. No structural changes needed (I7 resolved — only test assertions need updating).
2. **reduce-test-scope.md** — `STATE_ALREADY_INITIALIZED` in `reduce.test.ts` relates to `INIT_PROJECT`, not migration. Keep as-is (M7 resolved — no Phase 2 update needed).
3. **total-slices-field.md** — `artifacts.totalSlices` is the correct field name in `goodplan status --json` output (M3 resolved).
4. **activity-log-scopes.md** — No migration of historical scope strings needed. Migration starts with a clean log (activity-log question resolved).
