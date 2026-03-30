# TypeScript Review — Phase 1: Source Code Rename (Iteration 1)

## Issues

**[CRITICAL]** Legacy `.project/` migration writes back to `.project/` instead of `.goodplan/`

The `migrate` command's dual-path resolution correctly detects a legacy `.project/` directory, but passes that path directly to `rpcMigrate`. The `executeMigration` function renames `.project/` to `.project-old-<timestamp>/`, then calls `commitState(projectDir, ...)` where `projectDir` is still the `.project/` path. This creates a new `.project/` directory instead of `.goodplan/`. After migration from legacy format, the project should live in `.goodplan/`.

The fix: when the legacy path is detected in `migrate.ts`, the `projectDir` passed to `rpcMigrate` should either be swapped to the `.goodplan/` path, or `executeMigration` should be aware that the output directory differs from the input directory. The simplest approach is to have the command layer pass the desired output path (`.goodplan/`) alongside the source path (`.project/`), or to rewrite `projectDir` to the primary path after the rename step.

File: src/commands/global/migrate.ts:71
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `PROJECT_DIR_NAME` exported but only consumed in two places — consider centralizing legacy constant too

`PROJECT_DIR_NAME` is now exported from `project.ts` and imported in `init.ts` and `migrate.ts`. The `migrate.ts` command also defines a local `LEGACY_DIR_NAME = ".project"`. If other code needs to know about the legacy name (e.g., future migration hints, hook scripts), having it defined locally creates a maintenance risk. Consider exporting `LEGACY_DIR_NAME` from `project.ts` alongside `PROJECT_DIR_NAME` so there is a single source of truth for both directory names.

File: src/commands/global/migrate.ts:12
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Migrate test backup-dir assertion checks `.project-old-` which is correct for legacy tests, but re-migration test checks `.goodplan-old-` — inconsistency could mask the CRITICAL bug above

The learnings re-migration test (line 341) correctly checks for `.goodplan-old-` because the re-migration fixture uses `.goodplan/`. However, the integration migrate test (line 238) and unit migrate test (line 199) both check for `.project-old-` because they test the legacy path. If/when the CRITICAL bug above is fixed (migration writes to `.goodplan/`), the `renameProjectDir` call will rename `.project/` to `.project-old-*` and then `commitState` should write to `.goodplan/`. The existing test assertions on backup dir names are correct for the legacy path, but there is no test that verifies the output directory is `.goodplan/` after migrating from `.project/`. Adding such an assertion would have caught the CRITICAL bug.

File: tests/integration/migrate.test.ts:238
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `schemas.ts` and `validate-source-path.ts` `.project/` references in describe strings are user-facing LLM hints

The `.describe()` strings in `src/commands/global/migrate/schemas.ts` (lines 31, 42, 50, 53, 69) and the JSDoc in `validate-source-path.ts` (line 5) reference "relative to .project/". These are Zod schema descriptions that surface in the migration Q&A protocol as hints to the LLM. While the scope decision says "Migrate-related `.project/` references stay in schemas.ts and rpc/migrate.ts hints," these describe strings could say "relative to the old project directory" or "relative to .project/ (legacy)" for clarity since the project directory name is now `.goodplan/` for non-legacy projects.

File: src/commands/global/migrate/schemas.ts:31
Resolution: USER_INPUT

## Score: 8/10

The rename is comprehensive and mechanically sound across 204 files. The `PROJECT_DIR_NAME` constant is correctly introduced and used in `init.ts` and `migrate.ts`. The `migrate` command properly handles dual-path resolution for both `.goodplan/` and legacy `.project/`. Test fixtures are properly renamed from `.project/` to `.goodplan/`, the `pre-cli-project` fixture correctly retains `.project/`, and test assertions are updated throughout. The one CRITICAL issue (legacy migration writing back to `.project/` instead of `.goodplan/`) is a functional bug that would cause legacy migration users to end up with a `.project/` directory that the rest of the CLI (which now looks for `.goodplan/`) cannot find. Fixing that bug and adding a test assertion for the output directory name brings this to 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
