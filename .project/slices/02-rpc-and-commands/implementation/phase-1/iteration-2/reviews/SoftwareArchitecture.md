## Issues

**[CRITICAL]** Five integration tests still use old flat `slices/<name>` paths instead of nested `epics/<epic>/slices/<name>`
Tests construct filesystem paths using the eliminated flat layout. The fixtures already use the correct nested paths (`epics/test-epic/slices/test-slice/`), but the test code constructs paths like `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` or `path.join(env.GOODPLAN_DIR, "slices", "new-slice")`. This causes 5 test failures:

1. `workflow-slice.test.ts:20` — `slices/new-slice` should be `epics/test-epic/slices/new-slice`
2. `workflow-slice.test.ts:35` — `slices/test-slice` should be `epics/test-epic/slices/test-slice`
3. `error-transitions.test.ts:119` — `slices/test-slice/slice.json` should be `epics/test-epic/slices/test-slice/slice.json`
4. `result-paths.test.ts:47` — `slices/test-slice` should be `epics/test-epic/slices/test-slice`
5. `workflow-slice.test.ts:100+` (full lifecycle) — same pattern throughout the test

These are not pre-existing failures — they are caused by this slice's path restructuring. The tests verify critical end-to-end behavior (slice creation, full lifecycle, abandonment, plan submission) and all fail because the test code writes/reads artifacts at the wrong path.

Fix: update all `path.join(env.GOODPLAN_DIR, "slices", ...)` to `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", ...)` in the affected test files.
File: tests/integration/workflow-slice.test.ts:20
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Three migrate tests assert eliminated `slices/overview.json` and top-level `slices/` directory
The entity restructuring eliminates `slices/overview.json` (consolidated into `epics/overview.json` with embedded slices) and the top-level `slices/` directory. Three tests in `migrate.test.ts` still assert the old structure:

1. Line 186-194: Integration test asserts `slices/overview.json` exists and checks its content. Should verify slices are embedded in `epics/overview.json` items instead.
2. Line 443-448: Unit test `buildMigrationState` asserts `state.contents.slices` is a directory. After the restructuring, `buildMigrationState` correctly nests slices under `epics/<epic>/slices/` — there is no top-level `slices` directory in the state tree. Test should navigate to `state.contents.epics.contents["epic-one"].contents.slices` instead.
3. Line 530-536: Unit test for zero-slices epic asserts `state.contents.slices`. Same fix — navigate the nested path.

The implementation correctly builds the nested structure (confirmed by reading `buildMigrationState`), but the tests assert the old shape. This is CRITICAL because these tests are the only guards on migration correctness.
File: tests/integration/migrate.test.ts:186
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fitness test INV-004 fails: `migrate` command classified as mutation but has no entity-identifying args
`stateless-commands.test.ts` reports: `migrate: no entity-identifying arg found (args: force)`. The `migrate` command only has `globalArgs` (json, quiet, query, verbose) — no entity-identifying flag. The test correctly flags this because `migrate` is not in the `READ_ONLY_COMMANDS` set.

However, `migrate` is not truly a mutation command in the INV-004 sense — it operates on the entire project, not a specific entity. It is analogous to `init` (which is in `READ_ONLY_COMMANDS`). Fix: add `"migrate"` to the `READ_ONLY_COMMANDS` set in `stateless-commands.test.ts`. This preserves the fitness function's intent (catching commands that should target specific entities but don't) without false-flagging a project-wide operation.

Note: the iteration 1 review flagged the `expect.fail()` API issue, which has been fixed (now uses `throw new Error()`). But this new failure means the fitness function's allowlist was not updated for `migrate`.
File: tests/fitness/stateless-commands.test.ts:15
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Slice mutation commands still lack `--epic` override flag
This was flagged as MINOR in iteration 1 and remains unaddressed. Commands `plan`, `refine-plan`, `implement`, `complete`, and `abandon` resolve epic exclusively from `requireActiveEpic(projectDir)` with no `--epic` flag. The `commands-api.md` documents `--epic` flags on slice commands. This is not blocking for single-epic workflows but is a gap vs the documented API contract.

Since this was already noted in iteration 1 and acknowledged as non-blocking, no action is required in this iteration. Noting for completeness.
File: src/commands/slice/plan.ts:32
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The core architectural changes from iteration 1 are solid and the iteration-1 CRITICAL issue (migrate.ts artifact copy path) is correctly fixed. The `requireActiveEpic` function was properly refactored to read only `project.json` instead of loading the full state tree. All 22 `@ts-expect-error` and `TODO(slice-02)` annotations are cleared. TypeScript compiles clean. Path resolution in `paths.ts` and `priorities.ts` correctly uses nested `epics/<epic>/slices/<name>` patterns. The layering (Commands -> RPC -> State Machine) is preserved.

However, 8 tests fail (up from the iteration-1 review). The integration tests for slice lifecycle, error transitions, result paths, and migration all assert the old flat `slices/` layout instead of the new nested `epics/<epic>/slices/<name>/` layout. These tests are the primary guards on end-to-end correctness and migration data integrity. Without passing tests, the implementation cannot be verified.

To reach 9+: fix all test path references to use nested layout (2 CRITICALs), add `migrate` to the INV-004 allowlist (1 IMPORTANT).

## Summary
- Critical: 2
- Important: 1
- Minor: 1
