# Repo-Tooling-Docs Review

## Issues

**[CRITICAL]** `tests/global-setup.ts` not listed as a task — binary name hardcoded there
The file `tests/global-setup.ts` hardcodes `--outfile` to `goodplan` (line 25) and logs messages referencing it. The plan says "vitest.config.ts — no change needed" and "tests/global-setup.ts — no change needed", but `global-setup.ts` contains `const outfile = path.join(projectRoot, "goodplan")` which directly controls where the compiled binary lands. If `package.json` build script changes to `--outfile gp` but `global-setup.ts` still compiles to `goodplan`, all tests will break because `helpers.ts` will look for `gp` but the test harness compiled `goodplan`. The plan must add a task to update `global-setup.ts` line 11 from `"goodplan"` to `"gp"`.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `GOODPLAN_DIR` env var in `withFixture`/`withTempDir` still points to `.project` after rename
In `tests/integration/helpers.ts`, lines 130 and 154 set `GOODPLAN_DIR: path.join(tmpDir, ".project")`. After the fixture directories are renamed to `.goodplan/`, these must change to `path.join(tmpDir, ".goodplan")`. The plan lists updating `BINARY_PATH` and `.project` path in helpers.ts, but the `GOODPLAN_DIR` values are the more critical fix — they're the env var that tells the CLI where to find state. If fixture dirs become `.goodplan/` but `GOODPLAN_DIR` still points to `.project`, every integration test will get `DATA_NO_PROJECT`. The plan should explicitly call out both `GOODPLAN_DIR` assignments in helpers.ts.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `tests/integration/runner-modes.test.ts` not listed — asserts "goodplan" in version output
Line 44 asserts `expect(result.stdout).toContain("goodplan")`. The plan lists `state.test.ts` for version assertion updates but does not list `runner-modes.test.ts`. This test will fail after `src/index.ts` changes the version output from `goodplan ${VERSION}` to `gp ${VERSION}`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error message in `src/core/data/project.ts` still references `goodplan init`
Line 42: `"No .project/ directory found. Run \`goodplan init\` to create one."` — The plan's bulk task ("All remaining `src/` files with `.project/` in string literals...") should catch this, but the error message also references the `goodplan` CLI name, not just the `.project/` path. The plan should explicitly note that this error message needs both the path AND the binary name updated (to `.goodplan/` and `gp init`).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `src/core/rpc/migrate.ts` error message references `.project/` but isn't in the explicit task list
Line 1339: `"No .project/ directory found. Cannot migrate without existing project artifacts."` — The plan lists migrate.ts for the backup dir prefix rename but doesn't mention this additional `.project/` string literal. The bulk task may catch it, but given the plan explicitly lists some migrate.ts changes, this specific one should be called out to avoid being missed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `.gitignore` currently ignores the `goodplan` binary — plan should also handle the `.project/` entries for the live repo
The `.gitignore` has `.project/state.md` and `.project/epics/goodplan-cli/prototypes/...` entries. The plan correctly lists updating `.gitignore`, but the live repo's `.project/` directory itself is NOT gitignored — it's tracked. The plan's `.gitignore` task says "change `.project/` entries to `.goodplan/`" but there are no `.project/` glob-ignore entries — there are specific file entries under `.project/`. These need to be updated to `.goodplan/` equivalents. The task description should be more precise about what actually changes.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `biome.json` ignore uses `".project"` (no trailing slash) — plan should match exactly
The plan says `change ".project" ignore to ".goodplan"` which is correct — just confirming the biome ignore pattern at line 27 is `".project"` not `".project/"`. The plan's description matches.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `GOODPLAN_DEBUG` env var and `__goodplan_verbose`/`__goodplan_force` globals not addressed
The plan renames `[goodplan]` stderr prefix but doesn't address: `GOODPLAN_DEBUG` env var in `debug.ts`, `__goodplan_verbose` global in `debug.ts` and `index.ts`, `__goodplan_force` global in `index.ts`. Since the overview says "Keep `GOODPLAN_DIR` as-is", presumably these env vars and globals also stay. But this is worth an explicit note in the plan to prevent confusion — especially since `GOODPLAN_DIR` is explicitly called out as staying but these aren't mentioned.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 verification grep patterns have complex exclusions that are fragile
The "Before implementation" grep in Phase 2 uses a long chain of `grep -v` exclusions for prose "goodplan" references. This is brittle — new prose references could be missed. Consider simplifying the verification to just inspect the grep output manually rather than trying to automate zero-result assertions with fragile exclusion patterns.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan covers the main rename surfaces but misses several concrete files that will cause test failures: `global-setup.ts` (binary compilation target), `runner-modes.test.ts` (version assertion), and the `GOODPLAN_DIR` env var values in helpers.ts. These are all CRITICAL or IMPORTANT because they will cause immediate test failures that block the "all tests pass" verification gate. To reach 9+: add explicit tasks for `global-setup.ts`, `runner-modes.test.ts`, and the `GOODPLAN_DIR` assignments in helpers.ts; clarify which env vars/globals are intentionally kept; and be more precise about the `.gitignore` changes.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
