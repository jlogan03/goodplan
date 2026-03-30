# Learnings: 01-rename-gp

## Migrate output path must be independent of input path
_Source: 01-rename-gp_

The dual-path detection correctly found `.project/` as legacy input, but passed that path through to the RPC layer's `executeMigration`, causing output to write back to `.project/` instead of `.goodplan/`. Fixed by introducing a separate `outputDir = path.join(cwd, PROJECT_DIR_NAME)`. Any command that reads from a legacy path must ensure output goes to the canonical current path, not the input path.

## Blanket find-replace in skill docs breaks semantic correctness
_Source: 01-rename-gp_

The migrate skill's purpose is converting `.project/` directories, so `.project/` references in its filesystem scanning instructions describe the legacy input format and must stay. Mechanical `.project/` → `.goodplan/` replacement broke the skill's pre-flight checks and entity discovery commands. Skill documentation requires semantic review — understanding what each reference means — not blanket replacement.

## JSDoc command reference count is much larger than expected in cross-codebase renames
_Source: 01-rename-gp_

The plan estimated ~15 files with JSDoc `goodplan` CLI references; grep found ~64. Each command file contains JSDoc with the CLI invocation pattern. Future plans involving cross-codebase string renames should use grep-based counts from the audit, not estimates, and should include an explicit policy for which references change (CLI invocations) vs stay (product name prose).

## Phase-dependent config changes must be in the earliest phase that needs them
_Source: 01-rename-gp_

`.gitignore` binary entry (ignoring `gp`) and `biome.json` ignore (adding `.goodplan`) were originally planned for Phase 2, but Phase 1 verification (`bun run check`, `git status`) needed them. Moved to Phase 1 during refinement. Config changes that affect build/lint/git tooling should be phased with the code changes they support, not deferred to a "docs and config" phase.

## Happy-path tests miss output location bugs
_Source: 01-rename-gp_

The migration integration test verified that migration succeeded (exit 0, valid JSON output) but didn't assert which directory the output landed in. The output-path bug (writing to `.project/` instead of `.goodplan/`) passed all existing tests. Tests for path-sensitive operations should assert the actual output path, not just success status.

## Exported constants prevent duplication during renames
_Source: 01-rename-gp_

Exporting `PROJECT_DIR_NAME` (`.goodplan`) and `LEGACY_DIR_NAME` (`.project`) from `src/core/data/project.ts` gave `init.ts`, `migrate.ts`, and `schema.ts` a single source of truth. Without this, three modules would have independently hardcoded `.goodplan`, making future renames error-prone. The constant export also makes grep-based auditing reliable — search for the constant name instead of the string value.
