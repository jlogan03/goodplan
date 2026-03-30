# Merged Feedback — Round 1

## CRITICAL Issues

1. **Plan omits `project.json` to `goodplan.json` rename** — The slice goal explicitly states renaming the root state file. The epic architecture references `goodplan.json` throughout. The plan overview says "Keep `project.json`" — a direct contradiction. Touches ~29 source files (state machine, RPC, data layer, commands, context) plus test assertions and fixtures.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Holistic

2. **Plan omits `__GOODPLAN_VERSION__` to `__GP_VERSION__` rename** — The slice goal (line 13) and epic architecture (`cli-changes-api.md` line 11) explicitly require this. The plan's own research audit documents the changes needed. Yet the plan says "Keep `__GOODPLAN_VERSION__`" and marks several files as "no change needed." Affected files: `src/version.ts`, `package.json`, `vitest.config.ts`, `tests/global-setup.ts`, `scripts/install-skills.sh`.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Holistic

3. **`tests/global-setup.ts` outfile must change from `goodplan` to `gp`** — Line 11 hardcodes `const outfile = path.join(projectRoot, "goodplan")`. If `package.json` build script changes `--outfile` to `gp`, but `global-setup.ts` still compiles to `goodplan`, every integration and fitness test will fail ("Compiled binary not found"). The plan explicitly marks this file "no change needed."
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: TypeScript, Repo-Tooling-Docs

4. **`init.ts` and `migrate.ts` hardcode `.project` path construction, bypassing `PROJECT_DIR_NAME` constant** — `src/commands/global/init.ts` (line 31) and `src/commands/global/migrate.ts` (line 44) use `path.join(cwd, ".project")` inline. The plan does not list these as explicit task items. Without updating them, `gp init` creates `.project/` instead of `.goodplan/`.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Software-Architecture

## IMPORTANT Issues

5. **`GOODPLAN_DIR` env var in `withFixture`/`withTempDir` must change from `.project` to `.goodplan`** — `tests/integration/helpers.ts` lines ~131 and ~153 set `GOODPLAN_DIR: path.join(tmpDir, ".project")`. After fixture directories are renamed to `.goodplan/`, these must change to `.goodplan`. Both occurrences must be updated atomically with the fixture directory rename to avoid a broken intermediate state.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Software-Architecture, TypeScript, Repo-Tooling-Docs

6. **Error message in `src/core/data/project.ts` references both `.project/` and `goodplan init`** — Line ~42: `"No .project/ directory found. Run \`goodplan init\` to create one."` Must become `"No .goodplan/ directory found. Run \`gp init\` to create one."` The plan's bulk task may catch `.project/` but the `goodplan init` substring is a separate pattern easily missed.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Software-Architecture, TypeScript, TUI-and-CLI, Repo-Tooling-Docs

7. **`tests/integration/runner-modes.test.ts` not listed — asserts `"goodplan"` in version output** — Line 44: `expect(result.stdout).toContain("goodplan")`. Plan lists `state.test.ts` but not this file. Will fail after the rename.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: TUI-and-CLI, Repo-Tooling-Docs

8. **`src/core/rpc/migrate.ts` has `[goodplan]` stderr prefix in three places** — Lines ~979, 989, 999 write `[goodplan]` directly to `process.stderr`, not through `debug.ts`. The plan's bulk task for `.project/` strings won't catch these since they don't contain `.project/`.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: TUI-and-CLI

9. **`src/core/rpc/migrate.ts` has additional `.project/` string literal not in task list** — Line ~1339: `"No .project/ directory found. Cannot migrate without existing project artifacts."` Plan lists some migrate.ts changes but not this one.
   - Resolution: DIRECTLY_ACTIONABLE
   - Flagged by: Repo-Tooling-Docs

10. **Plan does not address `GOODPLAN_DIR` env var rename or explicitly justify keeping it** — The slice goal's scope boundary says the env var name is in scope. The plan asserts "Keep `GOODPLAN_DIR` as-is" without justification. Should explicitly state rationale (product name reference, not directory name reference).
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic

11. **Plan does not address `__goodplan_force`/`__goodplan_verbose` globalThis properties** — `src/index.ts` and `src/util/debug.ts` use these. Plan should explicitly state keep/rename decision.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic, Repo-Tooling-Docs

12. **Plan undercounts affected test files** — Estimates "approximately 14 files" but grep shows 25+ test files with hardcoded `.project` path construction. Inaccurate count leads to effort underestimation.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Software-Architecture

13. **`src/index.ts` version compatibility error message references `goodplan`** — Line ~119: `"Project data requires goodplan >= ..."` — user-facing error that should use the new name.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: TUI-and-CLI, Holistic

14. **Phase 1 Expected Behavior "before" checks are not falsifiable** — The "before" check doesn't specify the expected failure mode, and the second check has implicit prerequisites.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic

15. **Fixture rename and `GOODPLAN_DIR` update must be atomic** — Both changes must happen in the same commit/step. Plan lists them as separate tasks without noting the atomicity requirement.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Software-Architecture

16. **`.gitignore` task description is imprecise** — The plan says "change `.project/` entries to `.goodplan/`" but the actual entries are specific file paths under `.project/`, not glob patterns. Task should be more precise.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Repo-Tooling-Docs

## MINOR Issues

17. **Phase 2 does not include `bun run test` / `bun run check` verification** — Phase 2 modifies files that affect the build pipeline (`.gitignore`, `biome.json`, `scripts/install-skills.sh`). Should verify tests and lint still pass.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic

18. **Phase 2 grep verification patterns are fragile** — Complex exclusion chains will miss new prose patterns. Better to manually inspect remaining `goodplan` matches.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic, TUI-and-CLI, Repo-Tooling-Docs

19. **Plan does not mention `GoodplanError` class name or error code prefixes** — Internal identifiers using "goodplan" should have an explicit keep/rename decision documented.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Holistic

20. **Fixture rename task doesn't mention all helper code paths** — `withTempDir` function also sets `GOODPLAN_DIR: path.join(tmpDir, ".project")` and isn't separately called out.
    - Resolution: DIRECTLY_ACTIONABLE (covered by issue #5)
    - Flagged by: Holistic

21. **Version compatibility error message deserves explicit mention** — `src/index.ts` line ~119 is user-facing but only implicitly covered by a bulk task.
    - Resolution: DIRECTLY_ACTIONABLE (covered by issue #13)
    - Flagged by: Holistic

22. **Temp directory prefix strings still say `goodplan-integration`** — `helpers.ts` lines 122 and 149. Cosmetic but inconsistent with rename.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: TypeScript

23. **Phase 1 verification doesn't explicitly test `--version` output format** — Should confirm `./gp --version` prints `gp <version>` not `goodplan <version>`.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: TUI-and-CLI

24. **`src/commands/global/migrate.ts` JSDoc references `.project-old-*`** — Documentation string in command wrapper (not RPC layer). Bulk task may miss it.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: TUI-and-CLI

25. **`biome.json` ignore pattern format confirmed correct** — Plan says `".project"` to `".goodplan"`, matching actual format (no trailing slash). No action needed beyond confirming.
    - Resolution: DIRECTLY_ACTIONABLE
    - Flagged by: Repo-Tooling-Docs

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Add `project.json` to `goodplan.json` rename scope** — Add a new task group covering all ~29 files that reference `project.json` as a filename (state machine transitions, RPC layer, data layer, commands, context, tests, fixtures). This is a significant body of work that needs its own task breakdown.

2. **Add `__GOODPLAN_VERSION__` to `__GP_VERSION__` rename scope** — Add explicit tasks for: `src/version.ts` (declaration and references), `package.json` (`--define` flag), `vitest.config.ts` (define block), `tests/global-setup.ts` (build command), `scripts/install-skills.sh` (build command). Remove the "no change needed" notes.

3. **Add `tests/global-setup.ts` binary name update** — Change `const outfile = path.join(projectRoot, "goodplan")` to `const outfile = path.join(projectRoot, "gp")`. Also update any log messages referencing the binary name in that file.

4. **Add explicit tasks for `init.ts` and `migrate.ts` path construction** — `src/commands/global/init.ts` line 31: `path.join(cwd, ".project")` to `path.join(cwd, ".goodplan")`. `src/commands/global/migrate.ts` line 44: same pattern. Also update error messages in both files (`.project/ exists` and `.project-old-*` references).

5. **Explicitly list both `GOODPLAN_DIR` assignments in helpers.ts** — Update `GOODPLAN_DIR: path.join(tmpDir, ".project")` to `path.join(tmpDir, ".goodplan")` in both `withFixture` (~line 131) and `withTempDir` (~line 153). Note atomicity requirement: these must change in the same commit as the fixture directory renames.

6. **Update error message in `src/core/data/project.ts`** — Line ~42: change both `.project/` to `.goodplan/` AND `goodplan init` to `gp init`.

7. **Add `tests/integration/runner-modes.test.ts` to task list** — Line 44: `expect(result.stdout).toContain("goodplan")` must change to `"gp"`.

8. **Add `src/core/rpc/migrate.ts` stderr prefix updates** — Lines ~979, 989, 999: change `[goodplan]` to `[gp]` in direct `process.stderr` writes.

9. **Add `src/core/rpc/migrate.ts` line ~1339** — `.project/` string literal in error message.

10. **Add explicit keep/rename justifications for**: `GOODPLAN_DIR` (kept: product name, not dir name), `GOODPLAN_DEBUG` (kept: same reason), `__goodplan_force`/`__goodplan_verbose` (kept: internal implementation detail), `GoodplanError` class name (kept: internal). State the decision in the plan overview.

11. **Correct test file count** — Update from "approximately 14 files" to "approximately 25+ files" based on actual grep results.

12. **Update `src/index.ts` line ~119** — `"Project data requires goodplan >= ..."` to `"Project data requires gp >= ..."`.

13. **Make Phase 1 "before" checks falsifiable** — Specify expected failure output (e.g., `zsh: no such file or directory: ./gp`). Add explicit prerequisite note for the second check.

14. **Simplify Phase 2 grep verification** — Replace complex `grep -v` exclusion chains with manual inspection of remaining `goodplan` matches. Or use a pattern that specifically matches CLI invocation patterns (`goodplan <subcommand>`).

15. **Add `bun run test` and `bun run check` verification to Phase 2** — Phase 2 modifies build-affecting files.

16. **Add `--version` output check to Phase 1 verification** — `./gp --version` should print `gp <version>`.

17. **Make `.gitignore` task description precise** — List the specific entries that change (e.g., `.project/state.md` to `.goodplan/state.md`).

## RESEARCH_NEEDED

No items require external research.

## CODEBASE_EXPLORATION (grouped by topic)

No items require further codebase exploration — all issues are based on confirmed file contents.

## Contradictions Resolved

1. **`tests/global-setup.ts` — "no change needed" vs. must change**: The plan says no change needed; TypeScript and Repo-Tooling-Docs reviewers both identify this as critical. The domain specialists (TypeScript for type/build config, Repo-Tooling for test infrastructure) are trusted. **Resolution: must change.**

2. **`__GOODPLAN_VERSION__` — "keep as-is" vs. rename per goal**: Holistic reviewer identified the plan directly contradicts the slice goal. The slice goal is authoritative. **Resolution: must rename to `__GP_VERSION__`.**

3. **`project.json` — "keep as-is" vs. rename per goal**: Same as above — plan contradicts slice goal. **Resolution: must rename to `goodplan.json`.**

4. **Test file count — "~14 files" vs. "25+ files"**: Software-Architecture reviewer's grep-based count (25+) is more reliable than the plan's estimate. **Resolution: use 25+ count.**

## Unresolved (USER_INPUT required)

1. **Should `package.json` `"name"` field change from `"goodplan"` to `"gp"`?** The `name` field is the npm package identity, distinct from the binary name. The plan doesn't address it. If this will ever be published to npm, the name matters. If not, it's cosmetic. The binary name is controlled by `--outfile` and `bin` field, not `name`.
   - Flagged by: TypeScript

2. **Should `.project/architecture/*.md` references to `.project/` be updated to `.goodplan/` now, or deferred?** The actual `.project/` directory in this repo is managed by the installed CLI. Renaming references in architecture docs to `.goodplan/` while the directory is still called `.project/` creates a confusing inconsistency. Alternatively, the docs describe the target state for the product, not this repo specifically. The directory rename for live repos happens when users run `gp init` or migrate.
   - Flagged by: Software-Architecture

## USER_INPUT Resolved

1. **`__GOODPLAN_VERSION__` define**: **Keep as-is.** User confirmed. The product name is still "goodplan" internally; only the binary name and state directory change. This means `vitest.config.ts` and `src/version.ts` need NO changes for the define name. However, `tests/global-setup.ts` still needs the outfile path changed from `"goodplan"` to `"gp"` (the define stays `__GOODPLAN_VERSION__`). CRITICAL #2 is **resolved by user decision — not actionable**.

2. **`GOODPLAN_DIR` env var**: **Keep as-is.** User confirmed. No rename needed. Plan should document this decision with rationale.

3. **GlobalThis flags (`__goodplan_force`, `__goodplan_verbose`)**: **Keep as-is.** User confirmed. Internal only. Plan should document this decision.

4. **`.project/architecture/*.md` references**: **Leave as-is.** User confirmed. These are managed by the installed CLI, not the repo source code. They'll migrate when the installed CLI updates.

5. **`package.json` `"name"` field**: **Keep as `"goodplan"`.** User confirmed. Package name is the product name, binary name can differ.

**Impact on CRITICAL issues:**
- CRITICAL #1 (project.json rename): **RESOLVED — not in scope.** The plan overview explicitly says "Keep `project.json`" and this is intentional scope reduction, not a contradiction. The slice goal is to rename the binary and state directory, not internal filenames.
- CRITICAL #2 (__GOODPLAN_VERSION__ rename): **RESOLVED — keep as-is per user.** Only the outfile path in tests/global-setup.ts needs changing.
- CRITICAL #3 (tests/global-setup.ts outfile): **Still CRITICAL.** Outfile must change from `"goodplan"` to `"gp"`.
- CRITICAL #4 (init.ts and migrate.ts hardcoded paths): **Still CRITICAL.** These bypass PROJECT_DIR_NAME.
