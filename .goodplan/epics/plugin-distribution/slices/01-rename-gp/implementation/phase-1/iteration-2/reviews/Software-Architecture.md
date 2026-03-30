# Software Architecture Review — Phase 1: Source Code Rename (iteration 2)

## Issues

**[IMPORTANT]** Migration error recovery message references wrong path for user instructions
The `executeMigration` error handler at `src/core/rpc/migrate.ts:967-968` tells the user: `"To recover: rename ${projectOldDir} back to ${projectDir} and retry."` Here `projectDir` is still the **input** path (e.g., `/path/.project`), but the metadata field on line 970 passes `{ projectDir: outputDir, projectOldDir }` — meaning the structured error detail says `.goodplan/` while the human message says `.project/`. These should be consistent. When migrating from legacy `.project/`, restoring the backup back to `.project/` is correct for recovery (the user would re-run migrate), so the message text is right, but the metadata object is wrong — it should pass the original `projectDir`, not `outputDir`, so the structured detail matches the instructions.
File: src/core/rpc/migrate.ts:970
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Migrate learnings re-migration test checks for `.goodplan-old-` but legacy migration produces `.project-old-`
In `tests/integration/migrate-learnings.test.ts:341`, the re-migration test filters backup directories with `.goodplan-old-`. However, when the *first* migration runs against the `learnings-migration` fixture (which uses `.goodplan/` after the rename), `renameProjectDir` produces a backup named `.goodplan-old-<timestamp>/`. This is correct. But if a re-migration test were to run against a legacy `.project/` input, the backup would be `.project-old-<timestamp>/`. The current test only exercises `.goodplan/` re-migration, so this works. No action required — just noting the asymmetry is intentional given the test fixture uses `.goodplan/`.
File: tests/integration/migrate-learnings.test.ts:341
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `LEGACY_DIR_NAME` export from `project.ts` — consider placement
`LEGACY_DIR_NAME` is exported from `src/core/data/project.ts` but is only consumed by `migrate.ts` (command layer) and `schema.ts` (command layer). The Data Layer module (`project.ts`) is the canonical home for `PROJECT_DIR_NAME` since it's used in `resolveProjectDir()`, but `LEGACY_DIR_NAME` is a migration concept that `project.ts` itself never uses. This is a minor cohesion concern — the constant could live in `migrate.ts` command or the migrate RPC module. However, co-locating both directory name constants in one place has discoverability value, so this is acceptable as-is.
File: src/core/data/project.ts:8
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The iteration cleanly addresses the CRITICAL migration output path bug from iteration 1. The `outputDir = path.join(cwd, PROJECT_DIR_NAME)` fix correctly ensures migration output always goes to `.goodplan/` regardless of input path. The `PROJECT_DIR_NAME` / `LEGACY_DIR_NAME` constant extraction follows good dependency direction (command layer imports from data layer). The dual-path resolution in `migrate.ts` command is well-structured. The structured-errors fitness test was properly updated to create isolated temp dirs instead of relying on the repo's own `.project/`. The one IMPORTANT issue (metadata object inconsistency in error recovery) prevents a 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
