## Issues

**[CRITICAL]** migrate.ts copies slice artifacts to wrong destination path
The `copyMigrationArtifacts` function copies per-slice artifacts to `path.join(projectDir, "slices", slice.name)` (line 538), which is the old flat layout. The state tree constructed by `buildMigrationState` correctly nests slices under `epics/<epic>/slices/<name>/`, and the filesystem layout written by `commitState` will place slice.json at `epics/<epic>/slices/<name>/slice.json`. But the artifact copy writes markdown files to `<projectDir>/slices/<name>/` — a directory that no longer exists in the new structure. These artifacts will be silently lost (they end up in a directory the CLI never reads).

The destination should be `path.join(projectDir, "epics", epic.name, "slices", slice.name)`.
File: src/core/rpc/migrate.ts:538
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** requireActiveEpic loads full project state redundantly
`requireActiveEpic(projectDir)` calls `loadState(projectDir)` to read `project.json.activeEpic`. Every caller that uses it (plan, refine-plan, implement, complete, abandon, show, and all 6 subagent commands) then proceeds to call `loadState` again (directly or indirectly via `begin`/`submit`/`complete`). Each `loadState` walks the entire `.project/` directory tree, parses all JSON/JSONL, and builds the full state tree. For projects with many epics/slices, this doubles the I/O cost.

This is an architectural depth issue: the command layer is doing work that the RPC layer already does. A deeper approach would be to either (a) accept an optional `--epic` flag on all slice commands and resolve the default inside the RPC layer where state is already loaded, or (b) have `requireActiveEpic` read only `project.json` via a lightweight targeted read instead of `loadState`.

Option (b) is the minimal fix. Replace the `loadState` + `getJson` in `requireActiveEpic` with a direct `fs.readFileSync` of `path.join(projectDir, "project.json")` and parse just that one file.
File: src/commands/slice/utils.ts:17
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Integration test not updated for eliminated slices/overview.json
The `workflow-init.test.ts` integration test at line 29 asserts `slices/overview.json` exists after `init`. This file was eliminated by the entity restructuring epic (consolidated into `epics/overview.json` with embedded slices). The test failure confirms it: the init command no longer creates `slices/overview.json`. The assertion should be removed.

This was caught by the test run (9 failures), but it is an architectural concern because the test is asserting the old data model shape. The init path should be audited to confirm `slices/` top-level directory is no longer created.
File: tests/integration/workflow-init.test.ts:29
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fitness test uses unsupported `expect.fail()` API
The `stateless-commands.test.ts` fitness test (INV-004) calls `expect.fail()` which is not a Bun test runner API. This causes the fitness function to error instead of reporting a proper failure. This fitness test is a guard on INV-004 (stateless commands) and must work correctly.

Replace with `throw new Error(...)` or `expect(violations).toHaveLength(0)` with a descriptive message.
File: tests/fitness/stateless-commands.test.ts:84
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Slice commands lack --epic override flag for non-active-epic operations
All slice mutation commands except `create` resolve epic exclusively from `project.json.activeEpic` via `requireActiveEpic`. There is no `--epic` flag on `plan`, `refine-plan`, `implement`, `complete`, or `abandon`. This means it is impossible to operate on a slice belonging to a non-active epic. While `show` accepts `--epic`, all mutation commands do not. The `commands-api.md` documentation (line 82-84) already documents `--epic` flags on slice commands, and the epic architecture assumes this capability. The `list` command correctly has both `--epic` and `--all`.

This is a completeness concern for the commands-api contract, not a blocking bug for current single-epic workflows.
File: src/commands/slice/plan.ts:32
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** rpc-layer-api.md updated but still shows stale Target type
The research file flagged that `rpc-layer-api.md` shows the old `Target` type without `epic` on the slice variant (line 59). The diff shows a 2-line change to this file, but the Target type definition at line 57-61 now correctly shows `{ type: 'slice'; name: string; epic: string }`. Confirmed this is resolved in the diff. No issue here -- removing.

No further issues on this item.

## Score: 6/10

The core architectural changes are well-structured: `@ts-expect-error` annotations are fully cleared, path resolution is correctly updated to nested `epics/<epic>/slices/<name>` patterns, the `Target` type flows properly through all RPC operations, and the new `requireActiveEpic` utility correctly centralizes the epic resolution pattern. The layering (Commands -> RPC -> State Machine) is preserved, and dependency direction is correct.

However, there is a CRITICAL bug where migration artifact copy writes to the old flat `slices/` path instead of the nested `epics/<epic>/slices/<name>/` path, causing silent data loss. The redundant `loadState` calls via `requireActiveEpic` are an architectural depth concern that doubles I/O for every slice command. Two test infrastructure issues (integration test asserting eliminated path, fitness test using unsupported API) mean key guards are broken.

To reach 9+: fix the migrate.ts artifact copy path (critical), make requireActiveEpic lightweight (important), fix both failing tests.

## Summary
- Critical: 1
- Important: 3
- Minor: 1
