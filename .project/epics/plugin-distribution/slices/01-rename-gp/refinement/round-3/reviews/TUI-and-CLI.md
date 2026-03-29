# TUI and CLI Review — Rename to gp

## Issues

**[IMPORTANT] Phase 2 `.gitignore` task references stale `.project/` paths that are project-specific, not generic**
The `.gitignore` has two entries referencing `.project/` paths that are project-specific artifacts (`.project/state.md`, `.project/epics/goodplan-cli/prototypes/jqjs-spike/...`). The Phase 2 task says to "change specific `.project/` path entries ... to `.goodplan/` equivalents." However, these entries are for *this repo's own `.project/` directory* — which is managed by the installed CLI (#2 in the three-world separation). Since this repo's `.project/` will not be renamed by this slice (it's managed by the installed tools), changing these gitignore entries would break the ignore rules for the actual files. The plan should either (a) leave these gitignore entries as-is since they refer to this repo's own state directory, or (b) add `.goodplan/` equivalents *in addition to* the existing entries, not as replacements. This matters because after this slice, a user running `gp init` in a *new* repo would get `.goodplan/`, while *this* repo still has `.project/`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `migrate.ts` command description still says "Requires .project/ to exist" — should mention `.goodplan/` too**
The plan's Phase 1 task for `migrate.ts` correctly notes updating to accept both `.project/` (legacy) and `.goodplan/` (re-migration) as input directories. However, the plan does not explicitly call out updating the command's `meta.description` string (line 34 of `src/commands/global/migrate.ts`), which currently reads: `"Migrate or re-migrate a .project/ directory to CLI format. Stdin: {round, answers: [{id, data}]}. Requires .project/ to exist."` This description is surfaced by `schema --json` and `--help`, and it needs to reflect that both `.project/` and `.goodplan/` are accepted inputs. The task bullet says "Update `.project/` in user-facing command descriptions (~lines 34-36) to `.goodplan/`" but the correct update is to mention *both* directories since migrate explicitly accepts both per the user decision.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `schema.ts` registry descriptions reference `.project/` in `init` and `state` commands**
The plan's Phase 1 task for `schema.ts` correctly identifies lines 121-141. Verified against the codebase: line 121 says `"Initialize a new .project/ directory"` and line 141 says `"Expose the full .project/ state tree as JSON."` These are user-facing descriptions exposed via `gp schema --json`. The plan covers this. No issue here — just confirming the line references are accurate. However, the `migrate` registry entry at line 127 says `"Requires .project/ to exist and .project/project.json to NOT exist"` — this description is stale (migrate already supports re-migration with project.json present) and should be updated to reflect both `.project/` and `.goodplan/` input per the migrate task. This stale description is not called out in the plan.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `withTempDir` in helpers.ts hardcodes `GOODPLAN_DIR: path.join(tmpDir, ".project")` — plan should call this out explicitly**
The plan's task for `tests/integration/helpers.ts` says to change `GOODPLAN_DIR: path.join(tmpDir, ".project")` to `path.join(tmpDir, ".goodplan")` in both `withFixture` and `withTempDir`. Verified against code: `withFixture` at line 130 and `withTempDir` at line 155 both hardcode `.project`. The plan covers both. No issue — just confirming accuracy. The atomicity requirement with fixture renames is well-specified.

**[MINOR] `withMigrateFixture` hardcodes `.project` but should keep it since `pre-cli-project` fixture retains `.project/`**
The plan says to update `withMigrateFixture` helper (hardcoded `.project` at ~lines 27, 238, 289, 305) to support both `.project/` and `.goodplan/`. However, `withMigrateFixture` on line 27 does `path.join(tmpDir, ".project")` because it copies the `pre-cli-project` fixture which *keeps* `.project/` per the user decision. This helper should *not* change its path — it's correct as-is. The other references at lines 238, 289, 305 are in test assertions that test migration *from* `.project/` input. These should also stay as-is. The plan task should be clarified: `withMigrateFixture` and its tests should remain pointing to `.project/` since they test legacy migration. Only new tests for `.goodplan/` re-migration input should use `.goodplan/`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Version output format assertion in `state.test.ts` uses `/^goodplan /` — plan correctly identifies this**
Verified at line 137: `expect(result.stdout).toMatch(/^goodplan \d+\.\d+\.\d+\n$/);` — plan correctly identifies changing to `/^gp /`. No issue.

## Score: 8/10

The plan is thorough and well-structured with accurate line references throughout. The two IMPORTANT issues are: (1) the `.gitignore` Phase 2 task would break ignore rules for this repo's own `.project/` if entries are replaced rather than augmented, and (2) the `migrate` command description needs to mention both `.project/` and `.goodplan/` rather than just `.goodplan/`. The MINOR issue about `withMigrateFixture` could cause incorrect test changes if taken literally. Fixing these three items brings the plan to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
