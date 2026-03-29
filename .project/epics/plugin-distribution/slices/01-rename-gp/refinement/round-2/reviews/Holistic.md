# Holistic Review — Rename to gp (Round 2)

## Issues

**[IMPORTANT] Phase 1 missing: migrate test's own `withMigrateFixture` hardcodes `.project`**
The plan's Phase 1 tasks cover `tests/integration/helpers.ts` (`withFixture`/`withTempDir`) but do not mention `tests/integration/migrate.test.ts`, which has its own `withMigrateFixture` helper that hardcodes `path.join(tmpDir, ".project")` (line 27) and `".project-old-"` (line 238) and `path.join(tmpDir, ".project")` (lines 289, 305). This file will break silently if not updated alongside the other test changes.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 missing: `pre-cli-project` fixture directory rename**
The plan tasks say "Rename fixture directories: `tests/fixtures/*/.project/` -> `tests/fixtures/*/.goodplan/`" but the `pre-cli-project` fixture is special -- it is used by the migrate command to test migration FROM old `.project/` format. This fixture's `.project/` directory should arguably NOT be renamed to `.goodplan/` because the migrate command expects to find a `.project/` directory as its input. However, the migrate source code itself is being updated to look for `.goodplan/`. The plan needs to explicitly address this: should `pre-cli-project/.project/` also be renamed, and should the migrate tests' hardcoded `.project` references in `withMigrateFixture` be updated? The answer depends on whether `migrate` is migrating from a pre-CLI directory (which historically was `.project/`) or from a pre-rename directory (which would be `.goodplan/` after this rename). This needs a decision.
Resolution: USER_INPUT

**[IMPORTANT] Phase 2 undercounts affected skills files**
The plan says "27 files per audit" for `skills/*/SKILL.md` and "14 files per audit" for `skills/*/references/*.md`. Actual codebase grep shows 40 files across skills contain `.project/` references, and 30 files contain `goodplan` CLI invocation references. The plan's `_shared/references/cli-interaction.md` alone has 74 occurrences of `goodplan` and 29 of `.project/`. The task descriptions are correct in scope (they say "All remaining...") but the count estimates are significantly off, which could lead to underestimating the phase's effort.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: `renameProjectDir` backup path derives from `projectDir` argument, not a hardcoded string**
The plan task for `src/core/rpc/migrate.ts` says to change `.project-old-<timestamp>` backup dir prefix to `.goodplan-old-<timestamp>`. Looking at the actual code, `renameProjectDir()` computes the backup path as `${projectDir}-old-${timestamp}` -- it's derived from the `projectDir` argument, not hardcoded. Once `projectDir` changes from `.project` to `.goodplan`, the backup dir will automatically become `.goodplan-old-<timestamp>`. The JSDoc/comments referencing `.project-old` do need updating, but the function logic itself needs no change. The plan task is slightly misleading but not wrong since it mentions "update all `.project` path references" which covers the comments.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 verification could be more specific about migrate lifecycle**
The Phase 1 verification says "run `./gp init --name verify --json`, then `./gp epic:create`, `./gp status`" but does not verify migrate works. Given how much of migrate.ts is touched, the verification should include at minimum confirming `./gp migrate` with the updated fixture directory works. This is partially mitigated by `bun run test` running migrate tests, but explicit lifecycle verification would catch issues test coverage might miss.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2: `.gitignore` has hardcoded epic-specific path**
The `.gitignore` contains `.project/epics/goodplan-cli/prototypes/jqjs-spike/jqjs-spike` and `.project/epics/goodplan-cli/prototypes/jqjs-spike/node_modules/` -- these are not generic `.project/` entries but paths to a specific epic's artifacts. The plan says to change `.project/` path entries to `.goodplan/` equivalents, which is correct, but the implementer should know these specific lines exist and may or may not still be relevant after the rename (the epic data itself lives in this repo's `.project/` which is managed by the installed CLI, per the scope decisions).
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good scope decisions table, and proper atomicity requirements for fixture renames. The main gaps are: (1) the migrate test has its own fixture helper not covered by any task, (2) the `pre-cli-project` fixture raises a semantic question about what the migrate command's input directory should be named post-rename, and (3) the skills file count estimates are significantly low. Fixing the two IMPORTANT issues and tightening the estimates would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
