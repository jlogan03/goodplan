# Software Architecture Review - Phase 1: Source Code Rename

## Issues

**[IMPORTANT]** Migrate command's dual-path resolution bypasses resolveProjectDir abstraction
The `migrateCommand` in `src/commands/global/migrate.ts` introduces its own project directory resolution logic (checking `.goodplan/` then `.project/` with `fs.existsSync` + `fs.statSync`) rather than going through the existing `resolveProjectDir()` function in `src/core/data/project.ts`. This creates a second code path for locating the project directory, breaking the pattern where all directory resolution is centralized. If `resolveProjectDir` later gains logic (symlink handling, logging, environment-specific behavior), the migrate command will be out of sync. Consider extending `resolveProjectDir` with an option to also check the legacy `.project/` path, or extracting a shared helper that both can call.
File: src/commands/global/migrate.ts:50
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `PROJECT_DIR_NAME` export not used consistently across the codebase
The constant `PROJECT_DIR_NAME` was correctly extracted and exported from `src/core/data/project.ts` and adopted by `init.ts` and `migrate.ts`. However, several other files still use the string literal `.goodplan/` in user-facing error messages and doc comments rather than referencing the constant. For example, `src/commands/global/status.ts:33` has `"No project.json found in .goodplan/ directory"` and `src/commands/global/schema.ts:121` has `"Initialize a new .goodplan/ directory"`. While comments are acceptable, user-facing error messages and schema descriptions should reference the constant so a future rename is a one-line change. The current state means a directory name change would require another 200-file sweep.
File: src/commands/global/status.ts:33
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Init command description still says "goodplan project" rather than "gp project"
The citty `description` field for the init command reads `"Initialize a new goodplan project in the current directory"`. Every other user-facing string referencing the binary was renamed from `goodplan` to `gp`. This one is ambiguous -- "goodplan" could be the system name rather than the binary name -- but for consistency with the rest of the rename (especially `schema.ts` which says `"Initialize a new .goodplan/ directory"`), it should match.
File: src/commands/global/init.ts:19
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fitness test structured-errors previously relied on repo's own `.project/` for init test -- good fix but cleanup needed in temp dir naming
The structured errors fitness test was correctly updated to create isolated temp directories instead of relying on the repo's own `.project/`. The temp dir prefix uses `gp-fitness-init-` and `gp-fitness-shape-` which is consistent with the rename. No issue here -- just noting this was a good architectural improvement that decouples tests from the repo's own state.
File: tests/fitness/structured-errors.test.ts:119
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Migrate integration test error case still uses `.project` string literal for temp dir path
In `tests/integration/migrate.test.ts:289`, the error case test creates `path.join(tmpDir, ".project")` as the missing directory path. This is correct behavior (testing legacy path resolution), but the test name was updated to "project directory" while the implementation still passes `.project` as the path. This is fine since `rpcMigrate` takes an explicit path, but it's worth noting that this test now only covers the legacy path -- there's no corresponding test for when `.goodplan/` is missing. Consider adding one.
File: tests/integration/migrate.test.ts:289
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The rename is thorough and well-executed across 204 files. The core architectural decisions are sound: centralizing the directory name in `PROJECT_DIR_NAME`, keeping the legacy `.project/` path in migrate-specific code, updating all fixtures from `.project/` to `.goodplan/`, and correctly scoping the `pre-cli-project` fixture to retain `.project/`. The dual-path migrate resolution and inconsistent constant usage are the main items preventing a 9+. The structured-errors test fix is a genuine architectural improvement.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
