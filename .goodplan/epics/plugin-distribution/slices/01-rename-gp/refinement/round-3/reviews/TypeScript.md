## Issues

**[IMPORTANT]** `migrate.ts` command needs dual-path resolution logic, not just `.project`
The plan says migrate should "accept both `.project/` (legacy) and `.goodplan/` (re-migration) as input directories" but the command-level code at `src/commands/global/migrate.ts:44` hardcodes `const projectDir = path.join(cwd, ".project")`. The plan's task for `migrate.ts` mentions importing `PROJECT_DIR_NAME` and "update to accept both `.project/` (legacy) and `.goodplan/` (re-migration)", but does not specify the actual resolution logic. Since `PROJECT_DIR_NAME` will be `.goodplan` after the rename, simply importing it would break legacy `.project/` detection. The command needs to check for `.goodplan/` first, then fall back to `.project/` — this dual-path lookup logic is not described in the plan tasks.

Concrete fix: add a task step specifying the dual-path resolution — e.g., check `path.join(cwd, ".goodplan")` first, then `path.join(cwd, ".project")` as fallback, and pass whichever exists to `rpcMigrate`. This is distinct from the `rpcMigrate` error message update.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `init.ts` hardcodes `.project` but plan says to import `PROJECT_DIR_NAME` — import path not specified
The plan says `init.ts` should "import `PROJECT_DIR_NAME` from `project.ts`" but `PROJECT_DIR_NAME` is currently module-scoped (`const`, not `export`). The plan separately says to "export `PROJECT_DIR_NAME`" in the `project.ts` task. This creates a cross-task dependency: `init.ts` changes will fail to compile if applied before the `project.ts` export is added. The plan does not mention this ordering constraint. Additionally, the `init.ts` task should explicitly state that the error message at line 41 (`".project/ exists"`) becomes `".goodplan/ exists"`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `withFixture` and `withTempDir` set `GOODPLAN_DIR` to `.project` path — atomicity note is good but scope is broader
The plan correctly identifies the atomicity requirement for `GOODPLAN_DIR` path updates in `helpers.ts`. However, `withTempDir` at line 153 also sets `GOODPLAN_DIR: path.join(tmpDir, ".project")` and is used by tests that call `init` (which creates `.goodplan/` after the rename). After the rename, `init` will create `.goodplan/` but `GOODPLAN_DIR` would point to `.project/` in the temp dir — causing subsequent commands in those tests to fail with `DATA_NO_PROJECT`. The plan mentions updating `withTempDir` but does not highlight that `withTempDir` callers do not use the `GOODPLAN_DIR` env to locate the project dir (they rely on walk-up from cwd). Verify that `withTempDir` callers actually pass `env` to `runCommand` — if not, the `GOODPLAN_DIR` value in `withTempDir` may be unused and could be removed or updated without concern.

Resolution: CODEBASE_EXPLORATION

**[MINOR]** Bulk task for "~64 files" lacks safeguard against over-renaming
The task "All remaining `src/` files with `.project/` in string literals..." targets ~64 files and applies a JSDoc policy (backtick-quoted CLI invocations change, prose product name stays). This is a significant number of files with a nuanced rule. The plan would benefit from a verification step after this bulk task: `grep -rn 'goodplan' src/ | grep -v '// kept:' | head -40` to manually inspect remaining references. The "Expected Behavior" section does not include a post-phase grep check for stray `goodplan` CLI references in source.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan is solid and well-structured with clear task decomposition and good atomicity callouts. The main gap is the `migrate.ts` dual-path resolution logic, which is critical to the "migrate accepts both `.project/` and `.goodplan/`" requirement stated in scope decisions. The `init.ts` cross-task dependency is a minor ordering risk. To reach 9+: specify the dual-path lookup logic for migrate, note the task ordering constraint for `PROJECT_DIR_NAME` export, and add a post-phase grep verification step for stray references.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
