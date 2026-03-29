# Merged Review — Phase 1: Source Code Rename (Iteration 1)

**Reviewers:** Generalist (9/10), Software-Architecture (8/10), TypeScript (8/10), TUI-and-CLI (9/10)
**Merged Score: 8.5/10**

## Critical

### 1. Legacy migration writes back to `.project/` instead of `.goodplan/`
**Source:** TypeScript
**File:** `src/commands/global/migrate.ts:71`
**Resolution:** DIRECTLY_ACTIONABLE

The migrate command's dual-path resolution correctly detects a legacy `.project/` directory, but passes that path directly to `rpcMigrate`. The `executeMigration` function renames `.project/` to `.project-old-<timestamp>/`, then `commitState` writes to the same `.project/` path instead of `.goodplan/`. After legacy migration, the project ends up in `.project/` which the renamed CLI (now looking for `.goodplan/`) cannot find.

Fix: when legacy path is detected, swap `projectDir` to the `.goodplan/` path before passing to `rpcMigrate`, or have `executeMigration` accept a separate output directory parameter.

No existing test asserts that the output directory is `.goodplan/` after migrating from `.project/` — adding one would have caught this.

## Important

### 2. Migrate command bypasses `resolveProjectDir` abstraction
**Source:** Software-Architecture
**File:** `src/commands/global/migrate.ts:50`
**Resolution:** DIRECTLY_ACTIONABLE

The migrate command introduces its own project directory resolution logic (`fs.existsSync` + `fs.statSync` checking `.goodplan/` then `.project/`) instead of going through `resolveProjectDir()` in `src/core/data/project.ts`. This creates a second code path that will drift if `resolveProjectDir` gains new logic (symlinks, logging, env-specific behavior). Consider extending `resolveProjectDir` with a legacy-path option or extracting a shared helper.

### 3. `PROJECT_DIR_NAME` not used consistently — string literals remain in user-facing messages
**Sources:** Software-Architecture, TypeScript (related: export `LEGACY_DIR_NAME` too)
**Files:** `src/commands/global/status.ts:33`, `src/commands/global/schema.ts:121`, `src/commands/global/migrate.ts:12`
**Resolution:** DIRECTLY_ACTIONABLE

The constant was correctly extracted and used in `init.ts` and `migrate.ts`, but several other files still use `.goodplan/` string literals in user-facing error messages and schema descriptions (e.g., `"No project.json found in .goodplan/ directory"`). A future rename would require another sweep. Additionally, `LEGACY_DIR_NAME = ".project"` is defined locally in `migrate.ts` — exporting it from `project.ts` alongside `PROJECT_DIR_NAME` creates a single source of truth for both names.

## Minor

### 4. Inconsistent temp directory prefixes in tests
**Sources:** Generalist, TUI-and-CLI
**Files:** `tests/integration/helpers.ts:122`, `tests/integration/migrate.test.ts:287`, `tests/integration/migrate-learnings.test.ts:332`, plus ~20 others
**Resolution:** DIRECTLY_ACTIONABLE

`helpers.ts` was updated from `goodplan-` to `gp-` prefixes, but many test files still use `goodplan-` prefixes (`goodplan-schema-val-`, `goodplan-determinism-`, `goodplan-migrate-*`, etc.). Cosmetic only — temp dir names are not user-facing — but inconsistent.

### 5. Stale `.project` path strings in non-migration unit tests
**Source:** TUI-and-CLI
**Files:** `tests/unit/rpc/paths.test.ts:6`, `tests/unit/data/assemble.test.ts:62`, `tests/unit/data/load.test.ts:74`
**Resolution:** DIRECTLY_ACTIONABLE

Several unit tests use `.project` in fake path strings (e.g., `"/test/.project"`). These are not real directory lookups so they work fine, but are inconsistent with the rename. Migration tests correctly keep `.project` since they test legacy handling.

### 6. Init command description says "goodplan project" instead of "gp project"
**Source:** Software-Architecture
**File:** `src/commands/global/init.ts:19`
**Resolution:** DIRECTLY_ACTIONABLE

The citty `description` field reads `"Initialize a new goodplan project"`. Ambiguous whether "goodplan" is the system name or binary name, but inconsistent with the rest of the rename.

### 7. Migrate RPC summary string slightly misleading for re-migrations
**Source:** Generalist
**File:** `src/rpc/migrate.ts:198`
**Resolution:** USER_INPUT

Summary says "Migrated from pre-CLI .project/ format" which is correct for legacy migrations but slightly misleading for re-migrations from `.goodplan/`. Very low priority.

### 8. Schema `.describe()` strings reference `.project/` in LLM-facing hints
**Source:** TypeScript
**File:** `src/commands/global/migrate/schemas.ts:31`
**Resolution:** USER_INPUT

Zod `.describe()` strings surface in migration Q&A as LLM hints. Could say "relative to the old project directory" or "relative to .project/ (legacy)" for clarity. Covered by the plan's scope exclusion, so this is optional.

### 9. No test for `.goodplan/` missing in migrate error case
**Source:** Software-Architecture
**File:** `tests/integration/migrate.test.ts:289`
**Resolution:** DIRECTLY_ACTIONABLE

The error case test only covers the legacy `.project/` path being missing. No corresponding test for when `.goodplan/` is missing.

## What Went Well

- `LEGACY_DIR_NAME` constant in `migrate.ts` makes the legacy fallback explicit and self-documenting
- Entity command files (54 files) have minimal, consistent 1-line changes — no over-editing
- Dual-path resolution uses `statSync().isDirectory()` guard — robust against stale files
- No accidental renames of product name references (`GoodplanError`, `__GOODPLAN_VERSION__`, etc.)
- Structured-errors fitness test decoupled from repo's own `.project/` state — genuine architectural improvement
- Fixtures renamed via `git mv`; `pre-cli-project` correctly retains `.project/`
- All 1474 tests pass with no regressions
