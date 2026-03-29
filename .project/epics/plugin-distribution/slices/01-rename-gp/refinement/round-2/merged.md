# Merged Review Feedback — Rename to gp (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1. `src/core/data/commit.ts` has `[goodplan]` stderr prefix not covered by any explicit task**
Line 261: `[goodplan] --force: overwriting externally modified file`. The plan explicitly handles `[goodplan]` in `debug.ts` and `migrate.ts` but misses this one. Without it, stderr prefixes are inconsistent post-rename.
Flagged by: TypeScript, TUI-and-CLI, Repo-Tooling-Docs (3 reviewers converged)
Resolution: DIRECTLY_ACTIONABLE — add `commit.ts` line 261 to the explicit file list in Phase 1.

**IMP-2. `pre-cli-project` fixture directory creates a semantic ambiguity for migrate**
The plan says rename all `tests/fixtures/*/.project/` to `.goodplan/`, but `pre-cli-project` is the input fixture for the migrate command which historically migrates FROM `.project/`. Post-rename, should migrate's input be `.project/` (old format) or `.goodplan/` (new format)? The answer affects both the fixture and the migrate test's `withMigrateFixture` helper (which hardcodes `.project` at lines 27, 238, 289, 305).
Flagged by: Holistic
Resolution: USER_INPUT — needs a decision on what the migrate command's input directory name is post-rename.

**IMP-3. `withMigrateFixture` helper in `migrate.test.ts` hardcodes `.project` and is not mentioned in the plan**
Even once IMP-2 is resolved, `tests/integration/migrate.test.ts` has its own fixture helper (`withMigrateFixture`) with hardcoded `.project` references at lines 27, 238, 289, 305. This file is not covered by the plan's Phase 1 test tasks (which only mention `helpers.ts`).
Flagged by: Holistic
Resolution: DIRECTLY_ACTIONABLE (once IMP-2 decision is made) — add `migrate.test.ts` `withMigrateFixture` to Phase 1 test tasks.

**IMP-4. `PROJECT_DIR_NAME` constant should be exported and reused instead of hardcoding `.goodplan` in three places**
`src/core/data/project.ts` has `const PROJECT_DIR_NAME = ".project"` but does not export it. `init.ts` and `migrate.ts` independently hardcode the same string. The plan changes each literal individually, perpetuating the duplication. Export the constant and import it in `init.ts` and `migrate.ts`.
Flagged by: Software-Architecture
Resolution: DIRECTLY_ACTIONABLE — add export to `project.ts`, import in `init.ts` and `migrate.ts`.

**IMP-5. Phase 1 catch-all task underestimates file count (~15 stated vs ~64 actual JSDoc `goodplan` references)**
Grep for backtick-quoted `goodplan` in `src/` returns ~64 files. The plan says "approximately 15 files." Additionally, the plan does not clarify whether JSDoc command references like `` `goodplan slice:create` `` should become `` `gp slice:create` `` (binary name change) or stay as-is (product name). The plan should: (a) correct the count or provide a grep pattern as checklist, and (b) state the JSDoc policy explicitly.
Flagged by: Holistic (count), TypeScript (JSDoc policy), Repo-Tooling-Docs (count), TUI-and-CLI (bulk task vagueness)
Resolution: DIRECTLY_ACTIONABLE — correct the count estimate and add explicit JSDoc policy statement.

**IMP-6. `init.ts` description "Initialize a new goodplan project" — ambiguous whether "goodplan" is product name (keep) or CLI name (change)**
Line 18 of `src/commands/global/init.ts`. This surfaces in `--help` output. The plan's bulk task says to update "CLI invocation references" but this is a prose product name, not a CLI invocation. The plan should state whether this stays or changes.
Flagged by: TUI-and-CLI
Resolution: DIRECTLY_ACTIONABLE — clarify in plan that "goodplan" as product name in prose stays per scope decisions table.

## MINOR Issues

**MIN-1. `renameProjectDir` backup path is derived from `projectDir` argument, not hardcoded**
The plan task for `migrate.ts` says to change `.project-old-<timestamp>` to `.goodplan-old-<timestamp>`, but the function body computes this from `${projectDir}-old-${timestamp}`. Only comments/JSDoc need updating, not code logic. Plan should clarify to avoid introducing unnecessary hardcoding.
Flagged by: Holistic, Software-Architecture (2 reviewers converged)
Resolution: DIRECTLY_ACTIONABLE — clarify task: update comments/JSDoc only, function body is already correct.

**MIN-2. `.gitignore` binary entry rename should be in Phase 1, not Phase 2**
After Phase 1 the binary is `gp` but `.gitignore` still ignores `goodplan`. The new `gp` binary would show as untracked in `git status`.
Flagged by: Repo-Tooling-Docs
Resolution: DIRECTLY_ACTIONABLE — move `.gitignore` binary entry task to Phase 1.

**MIN-3. `biome.json` ignore change should be in Phase 1, not Phase 2**
`biome.json` has `".project"` in `files.ignore`. After Phase 1 the state dir is `.goodplan/` but biome still ignores `.project`. Affects `bun run check` in Phase 1 verification.
Flagged by: Repo-Tooling-Docs
Resolution: DIRECTLY_ACTIONABLE — move `biome.json` ignore update to Phase 1.

**MIN-4. `schema.ts` and `migrate.ts` command descriptions reference `.project/` in user-facing strings**
`src/commands/global/schema.ts` lines 121-141 and `src/commands/global/migrate.ts` line 34-36 have `.project/` in command descriptions rendered in `--help` and `gp schema --json`. Covered by bulk task but easy to miss.
Flagged by: TypeScript
Resolution: DIRECTLY_ACTIONABLE — call out explicitly or add to grep checklist.

**MIN-5. Phase 1 verification missing: migrate lifecycle and `GOODPLAN_DIR` env var**
Verification tests `init`, `epic:create`, `status` but not `migrate` or `GOODPLAN_DIR` override. Given how much of `migrate.ts` is touched and the env var's importance to integration tests, both should be verified.
Flagged by: Holistic (migrate), Software-Architecture (GOODPLAN_DIR)
Resolution: DIRECTLY_ACTIONABLE — add `./gp migrate` and `GOODPLAN_DIR=/tmp/test/.goodplan ./gp status --json` to verification.

**MIN-6. Phase 1 verification should include `./gp --version`**
Expected Behavior mentions `--version` but the Verification section does not explicitly include it.
Flagged by: TUI-and-CLI
Resolution: DIRECTLY_ACTIONABLE — add `./gp --version` to verification commands.

**MIN-7. Phase 2 verification should confirm `bun run build` produces `gp` binary at `~/.local/bin/gp`**
Phase 2 modifies `scripts/install-skills.sh`. Verification should confirm the binary name change works end-to-end.
Flagged by: Repo-Tooling-Docs
Resolution: DIRECTLY_ACTIONABLE — add binary name verification to Phase 2.

**MIN-8. Skills file count estimates in Phase 2 are low (plan says 27+14, actual ~40+30)**
The task descriptions are correct in scope ("All remaining...") but the count estimates are significantly off, understating effort.
Flagged by: Holistic
Resolution: DIRECTLY_ACTIONABLE — correct the count estimates.

## DIRECTLY_ACTIONABLE

1. IMP-1: Add `commit.ts` `[goodplan]` prefix to explicit task list
2. IMP-3: Add `migrate.test.ts` `withMigrateFixture` to Phase 1 test tasks (blocked on IMP-2 decision)
3. IMP-4: Export `PROJECT_DIR_NAME` from `project.ts`, import in `init.ts` and `migrate.ts`
4. IMP-5: Correct file count estimate, add JSDoc policy statement
5. IMP-6: Clarify `init.ts` description stays (product name)
6. MIN-1: Clarify `renameProjectDir` task — comments only, not code
7. MIN-2: Move `.gitignore` binary entry to Phase 1
8. MIN-3: Move `biome.json` ignore to Phase 1
9. MIN-4: Call out `schema.ts` and `migrate.ts` command descriptions
10. MIN-5: Add migrate and GOODPLAN_DIR verification
11. MIN-6: Add `--version` to verification
12. MIN-7: Add binary name verification to Phase 2
13. MIN-8: Correct skills file count estimates

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **TUI-and-CLI flagged `init.ts` description as IMPORTANT; TypeScript noted it as MINOR (no action needed).** TUI-and-CLI's concern is about plan clarity (should the plan state whether it stays?), not about changing it. TypeScript correctly notes the product name stays per scope decisions. Resolved: DIRECTLY_ACTIONABLE as a plan clarification (IMP-6), not a code change. Severity kept at IMPORTANT because the ambiguity could cause the implementer to change it incorrectly.

2. **Holistic and Software-Architecture both flagged `renameProjectDir` backup naming.** Holistic called it MINOR (plan is "slightly misleading but not wrong"). Software-Architecture called it IMPORTANT (could "lead the implementer to introduce a hardcoded string"). Resolved: the risk is real but the fix is a one-line clarification. Kept as MINOR since the function body needs no change — only the task description needs rewording.

## Unresolved (USER_INPUT required)

1. **IMP-2: What should the migrate command's input directory be named post-rename?** Options: (a) migrate still looks for `.project/` as legacy input (fixture stays, tests stay), (b) migrate looks for `.goodplan/` (fixture renames, tests update), (c) migrate supports both (more work, out of slice scope?). This blocks IMP-3.

## USER_INPUT Resolved

1. **IMP-2: Migrate accepts both `.project/` and `.goodplan/`** — User chose option (c). The migrate command should accept both old `.project/` directories (for legacy projects) AND `.goodplan/` directories (for re-migration). The `pre-cli-project` fixture keeps `.project/` (it represents a legacy input). Add a separate fixture or test case for `.goodplan/` input if needed. The `withMigrateFixture` helper needs to support both patterns.
