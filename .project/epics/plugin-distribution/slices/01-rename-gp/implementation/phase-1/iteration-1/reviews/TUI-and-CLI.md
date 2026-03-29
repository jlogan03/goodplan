# TUI and CLI Review — Phase 1: Source Code Rename

## Issues

**[MINOR]** Inconsistent temp directory prefix rename in tests
Some temp directory prefixes were renamed from `goodplan-` to `gp-` (in `tests/integration/helpers.ts` and new fitness tests), but many existing test files still use `goodplan-` prefixes (e.g., `goodplan-schema-val-`, `goodplan-determinism-`, `goodplan-migrate-no-project-`, and ~20 others across fitness, integration, and unit tests). This is cosmetic since temp dir names are not user-facing, but the inconsistency could cause confusion about what was intentionally renamed.
File: tests/integration/helpers.ts:122
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Stale `.project` path strings in non-migration unit tests
A few unit tests still use `.project` in path strings passed to functions: `tests/unit/rpc/paths.test.ts:6` (`const PROJECT_DIR = "/test/.project"`), `tests/unit/data/assemble.test.ts:62` (`"/nonexistent/path/.project"`), and `tests/unit/data/load.test.ts:74` (`"/nonexistent/path/.project"`). These are fake paths used for testing (not real directory lookups), so they work fine, but they are inconsistent with the rename. The migration tests (`tests/integration/migrate.test.ts`, `tests/unit/rpc/migrate.test.ts`) correctly keep `.project` since they test legacy path handling.
File: tests/unit/rpc/paths.test.ts:6
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The rename is thorough and well-executed across 204 files. User-facing strings (error messages, help text, command descriptions, version output, debug prefixes) are consistently updated from `goodplan` to `gp`. The `.project/` to `.goodplan/` directory rename is properly handled with the `PROJECT_DIR_NAME` constant exported from `project.ts` and used in `init.ts`. The migrate command correctly implements dual-path resolution for both `.goodplan/` (re-migration) and `.project/` (legacy). Scoped exclusions (`__GOODPLAN_VERSION__`, `GOODPLAN_DIR`, `GoodplanError`, `package.json` name, `pre-cli-project` fixture, migrate hints) are all correctly preserved. The two minor issues are cosmetic inconsistencies in test infrastructure that do not affect functionality or user experience.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
