# Software Architecture Review — Rename to gp

## Issues

**[CRITICAL]** `init` and `migrate` commands hardcode `.project` path construction, bypassing `resolveProjectDir`

Both `src/commands/global/init.ts` (line 31) and `src/commands/global/migrate.ts` (line 44) construct the project directory path inline as `path.join(cwd, ".project")` rather than using the `PROJECT_DIR_NAME` constant in `src/core/data/project.ts`. The plan's task list says to update `src/core/data/project.ts` (the constant and walk-up logic) but does not mention `init.ts` or `migrate.ts` as files requiring `.project` literal changes. These are separate hardcoded `.project` strings that will be missed, causing `gp init` to create `.project/` instead of `.goodplan/` and `gp migrate` to look for `.project/` instead of `.goodplan/`.

The plan's catch-all task "All remaining `src/` files with `.project/` in string literals" could theoretically cover these, but init and migrate are structurally important commands that deserve explicit task entries -- especially since the init command is the first Expected Behavior verification item.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `GOODPLAN_DIR` env var in test helpers will point to `.project` after the rename, creating a mismatch

The `withFixture` and `withTempDir` helpers in `tests/integration/helpers.ts` set `GOODPLAN_DIR: path.join(tmpDir, ".project")`. The plan correctly identifies that helpers.ts needs updating for `BINARY_PATH` and `path.join(tmpDir, ".project")`, but the `GOODPLAN_DIR` value in these helpers is the mechanism by which ALL integration tests locate the state directory. Since `GOODPLAN_DIR` is an env var that overrides directory-name-based discovery, changing the walk-up constant without also updating `GOODPLAN_DIR` references will cause a subtle split: the CLI walks up looking for `.goodplan/` but tests point `GOODPLAN_DIR` at a `.project/` path. The plan does mention updating `path.join(tmpDir, ".project")` to `.goodplan`, but this is buried in a single task line alongside `BINARY_PATH`. Given that 30+ test files also construct `path.join(tmpDir, ".project")` directly (not through helpers), the plan's "approximately 14 files" count appears to significantly undercount the actual test files requiring changes. The grep shows at least 25 distinct test files with hardcoded `.project` paths.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error message in `resolveProjectDir` still references `goodplan init` after rename

`src/core/data/project.ts` line 41 has the error message `"No .project/ directory found. Run \`goodplan init\` to create one."` The plan's task for this file only mentions changing the `".project"` literal in walk-up logic. The error message contains both the old directory name AND the old binary name, and should be updated to `"No .goodplan/ directory found. Run \`gp init\` to create one."` This is user-facing output that will be confusing post-rename.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Fixture directories require coordinated rename with `GOODPLAN_DIR` env var values

The plan correctly identifies that fixture directories `tests/fixtures/*/.project/` need renaming to `.goodplan/`. However, the `withFixture` helper copies fixtures to a temp dir and then sets `GOODPLAN_DIR` to `path.join(tmpDir, ".project")`. If fixtures are renamed to `.goodplan/` but `GOODPLAN_DIR` still points to `.project`, all fixture-based tests break. If `GOODPLAN_DIR` is updated to `.goodplan/` but fixtures aren't renamed yet, tests also break. The plan lists these as separate tasks without noting the atomicity requirement. Both the fixture rename and the `GOODPLAN_DIR` update in `withFixture`/`withTempDir` must happen in the same commit/step to avoid a broken intermediate state.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan undercounts affected test files

The plan estimates "approximately 14 files" for test files with `.project/` path assertions. The actual grep shows 25+ test files with hardcoded `.project` path construction (fitness tests, unit tests for data/rpc/commands, integration tests). While the catch-all task would cover them, an accurate count helps estimate effort and prevents surprises during implementation. The discrepancy suggests the audit was incomplete.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 scope creep -- `.project/architecture/*.md` updates are documentation about a directory that hasn't been renamed yet

Phase 2 includes updating `.project/architecture/*.md` to reference `.goodplan/` instead of `.project/`. But this plan only renames the source code references -- the actual `.project/` directory in this repo is managed by the installed CLI (#2 in the three-world separation). Renaming references in `.project/architecture/*.md` to `.goodplan/` while the directory is still literally called `.project/` creates a confusing inconsistency. The architecture docs should reference what currently exists. The directory rename (from `.project/` to `.goodplan/` in live repos) only happens when users run the new `gp init` or migrate. Consider deferring architecture doc updates to when the actual state directory migration happens.

Resolution: USER_INPUT

## Score: 6/10

The plan correctly identifies the three areas of change (source, skills/docs, build config) and the "clean break" approach is sound for an early-stage project. The two-phase structure is logical. However, it has a critical gap (init/migrate hardcoded paths not explicitly called out), undercounts affected files by ~40%, and doesn't address the atomicity requirement for coordinated fixture + env var changes. The error message gap means user-facing output would reference the old binary name. To reach 9+: explicitly list init.ts and migrate.ts as task items, correct the file count, note the fixture/GOODPLAN_DIR atomicity requirement, and update the error message in project.ts.

## Summary
- Critical: 1
- Important: 3
- Minor: 2
