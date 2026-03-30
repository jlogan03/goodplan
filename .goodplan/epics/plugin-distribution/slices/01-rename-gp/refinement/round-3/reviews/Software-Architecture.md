# Software Architecture Review — Rename to gp (Round 3)

## Issues

**[IMPORTANT]** `migrate.ts` command layer hardcodes `.project` — dual-input detection logic is underspecified

The plan says `migrate.ts` should "accept both `.project/` (legacy) and `.goodplan/` (re-migration) as input directories." Currently, the command layer (`src/commands/global/migrate.ts` line 44) hardcodes `const projectDir = path.join(cwd, ".project")` and passes this single path to `rpcMigrate`. After the rename, this hardcoded path must change — but the plan's instruction to "accept both" is architecturally ambiguous about where the detection logic lives.

There are two options: (1) the command layer checks for `.goodplan/` first, falls back to `.project/`, and passes whichever exists to `rpcMigrate`; or (2) the command layer passes `cwd` and the RPC layer handles detection. Option (1) is consistent with the existing pattern (command layer resolves paths, RPC layer operates on them). The plan's `migrate.ts` task should specify: check for `.goodplan/` first (re-migration), then `.project/` (legacy migration), error if neither exists. Import `PROJECT_DIR_NAME` from `project.ts` for the primary check, hardcode `".project"` as a legacy fallback constant. This keeps detection in the command layer, consistent with `init.ts`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 catch-all task line count ("~64 files") may cause unnecessary churn

The catch-all task says "~64 files per grep audit." A grep for `.project/` across `src/` returns 3 files with actual hardcoded `.project` string literals (project.ts, init.ts, migrate.ts) — the rest are JSDoc/comments. A grep for `goodplan` in user-facing strings will hit many files, but most are the product name "goodplan" (which stays). The "~64 files" figure likely comes from an unfiltered grep that includes both categories. The implementer should run the grep, filter to only files needing changes per the JSDoc policy stated in the task, and expect a much smaller set. This is not an error in the plan — just a note that the count is an upper bound, not a target.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 2 issues have been well-addressed. The `PROJECT_DIR_NAME` export/import pattern is now explicit in the plan. The `renameProjectDir` task correctly notes that only comments/JSDoc need updating. The GOODPLAN_DIR verification item was added. The JSDoc policy is clearly stated in the catch-all task. The remaining issue is a gap in how `migrate.ts` dual-input detection is specified — currently the plan says what to do but not how, and the implementer needs to know the detection should happen in the command layer with a specific priority order. To reach 10: specify the `.goodplan`-first-then-`.project` detection pattern in the `migrate.ts` command-layer task.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
