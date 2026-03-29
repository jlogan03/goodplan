# Merged Feedback — Rename to gp (Round 3)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: Phase 1 catch-all task must exclude migrate-specific legacy `.project/` references
**Sources:** Holistic
The catch-all task "All remaining `src/` files with `.project/` in string literals, error messages, JSDoc, and comments -- update to `.goodplan/`" would incorrectly rename strings in `src/commands/global/migrate/schemas.ts` (5 `.describe()` strings) and `src/core/rpc/migrate.ts` (hint strings at lines 1026, 1034, 1042) that describe the **legacy input format** the migrate command reads FROM. These references to "old .project/" are semantically correct and should NOT change. Add an exclusion clause for migrate-related strings that describe the legacy input format.
Resolution: DIRECTLY_ACTIONABLE

### IMP-2: `migrate.ts` command needs explicit dual-path resolution logic
**Sources:** Software-Architecture, TypeScript (deduplicated -- same issue raised independently)
The plan says migrate should "accept both `.project/` (legacy) and `.goodplan/` (re-migration)" but does not specify the actual detection logic. Currently `src/commands/global/migrate.ts:44` hardcodes `const projectDir = path.join(cwd, ".project")`. After the rename, simply importing `PROJECT_DIR_NAME` (which becomes `.goodplan`) would break legacy `.project/` detection. The plan must specify: check for `.goodplan/` first (re-migration), then `.project/` (legacy migration), error if neither exists. Detection belongs in the command layer (consistent with `init.ts` pattern). Import `PROJECT_DIR_NAME` for the primary check, hardcode `".project"` as a legacy fallback constant.
Resolution: DIRECTLY_ACTIONABLE

### IMP-3: `init.ts` cross-task dependency on `PROJECT_DIR_NAME` export not specified
**Sources:** TypeScript
`init.ts` task says to import `PROJECT_DIR_NAME` from `project.ts`, but it is currently module-scoped (`const`, not `export`). The `project.ts` task separately adds the export. This creates an ordering constraint: `init.ts` changes will fail to compile if applied before the `project.ts` export. The plan should note this dependency. Additionally, the `init.ts` error message at line 41 (`".project/ exists"` -> `".goodplan/ exists"`) should be explicitly called out.
Resolution: DIRECTLY_ACTIONABLE

### IMP-4: `.gitignore` `.project/` state entries must NOT be renamed in Phase 2
**Sources:** TUI-and-CLI, Repo-Tooling-Docs (deduplicated -- same issue, same reasoning)
The `.gitignore` entries for `.project/state.md` and `.project/epics/goodplan-cli/prototypes/...` exist to ignore files created by the **installed** CLI managing **this repo's** `.project/` directory. The installed CLI still writes to `.project/`, not `.goodplan/`. Renaming these entries would cause previously-ignored artifacts to become visible to git. Either (a) leave these entries as-is, or (b) add `.goodplan/` equivalents **in addition to** (not replacing) the existing entries. Same rationale as the scope decision for `.project/architecture/*.md`.
Resolution: DIRECTLY_ACTIONABLE

### IMP-5: `biome.json` ignore entry should keep `.project` AND add `.goodplan`
**Sources:** Repo-Tooling-Docs
The `biome.json` `files.ignore` entry for `.project` prevents biome from linting this repo's own `.project/` state directory. After the rename, `.project/` will still exist (installed CLI uses it), so changing it to `.goodplan` would cause biome to start linting `.project/` contents. The task should be "add `.goodplan` alongside `.project`" (keep both entries).
Resolution: DIRECTLY_ACTIONABLE

### IMP-6: `migrate` command description and schema registry entry should mention both directories
**Sources:** TUI-and-CLI
The plan's Phase 1 task for `migrate.ts` says to update user-facing command descriptions to `.goodplan/`, but since migrate explicitly accepts both `.project/` and `.goodplan/`, the `meta.description` (line 34) and `schema.ts` registry entry (line 127) should mention **both** directories. The schema registry description is also stale (says "Requires .project/ to exist and .project/project.json to NOT exist" but migrate already supports re-migration).
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: Phase 1 test file count estimate is low (25+ stated vs 35 actual)
**Sources:** Holistic
Grep for `.project` across `tests/**/*.ts` finds 35 files with 98 occurrences. Plan says "approximately 25+ files." Update the count for accurate effort estimation.
Resolution: DIRECTLY_ACTIONABLE

### MIN-2: `migrate-learnings.test.ts` not explicitly listed alongside `migrate.test.ts`
**Sources:** Holistic
This file has `.project` references at lines 30, 335, 341. Given that migrate tests have special semantics (some `.project/` references should stay), it should be listed explicitly with the same "support both" guidance.
Resolution: DIRECTLY_ACTIONABLE

### MIN-3: `withMigrateFixture` should NOT change its `.project` paths
**Sources:** TUI-and-CLI
`withMigrateFixture` (line 27) does `path.join(tmpDir, ".project")` because it copies the `pre-cli-project` fixture which keeps `.project/`. This helper and its test assertions at lines 238, 289, 305 should remain pointing to `.project/`. The plan task should clarify this.
Resolution: DIRECTLY_ACTIONABLE

### MIN-4: `withTempDir` `GOODPLAN_DIR` may be unused by callers
**Sources:** TypeScript
`withTempDir` at line 153 sets `GOODPLAN_DIR: path.join(tmpDir, ".project")`. After the rename, `init` creates `.goodplan/` but `GOODPLAN_DIR` would point to `.project/`. Verify whether `withTempDir` callers actually pass `env` to `runCommand` -- if not, the value may be unused.
Resolution: RESEARCH_NEEDED

### MIN-5: Bulk ~64 file task lacks post-phase grep verification step
**Sources:** TypeScript
The catch-all task targets ~64 files with a nuanced JSDoc rename policy. Add a verification step after the bulk task: grep to manually inspect remaining references for correctness.
Resolution: DIRECTLY_ACTIONABLE

### MIN-6: `install-skills.sh` leaves old `goodplan` binary on PATH
**Sources:** Repo-Tooling-Docs
After running `bun run install:skills` with the new script, `~/.local/bin/goodplan` will remain on disk. Add a cleanup step: `rm -f "$INSTALL_DIR/goodplan"` or echo a note.
Resolution: DIRECTLY_ACTIONABLE

### MIN-7: Bulk file count "~64 files" is an upper bound, not a target
**Sources:** Software-Architecture
The ~64 figure likely comes from an unfiltered grep. Actual files needing changes per the JSDoc policy will be much smaller. Not an error, just a note for implementers.
Resolution: DIRECTLY_ACTIONABLE (update estimate or add clarifying note)

## DIRECTLY_ACTIONABLE
1. IMP-1: Add migrate exclusion to catch-all task
2. IMP-2: Specify dual-path resolution logic for `migrate.ts`
3. IMP-3: Note `PROJECT_DIR_NAME` export ordering constraint
4. IMP-4: Keep `.gitignore` `.project/` entries, add `.goodplan/` alongside
5. IMP-5: Keep `biome.json` `.project` ignore, add `.goodplan`
6. IMP-6: Update migrate descriptions to mention both directories
7. MIN-1: Correct test file count estimate
8. MIN-2: Explicitly list `migrate-learnings.test.ts`
9. MIN-3: Clarify `withMigrateFixture` should keep `.project` paths
10. MIN-5: Add post-phase grep verification step
11. MIN-6: Add old binary cleanup to `install-skills.sh`
12. MIN-7: Clarify ~64 file count as upper bound

## RESEARCH_NEEDED
1. MIN-4: Verify whether `withTempDir` callers actually use the `GOODPLAN_DIR` env value

## Contradictions Resolved

### `migrate.ts` dual-path logic
Software-Architecture and TypeScript raised the same issue independently. Software-Architecture was more specific about the resolution (check `.goodplan/` first, fall back to `.project/`, detection in command layer, import `PROJECT_DIR_NAME` + hardcode `".project"` fallback). Merged using the Software-Architecture framing since it's the domain specialist. No contradiction -- both agreed on the same fix.

### `.gitignore` handling
TUI-and-CLI suggested either leave as-is or add alongside. Repo-Tooling-Docs said remove the rename task entirely. No real contradiction -- both agree the entries should NOT be replaced. Merged as: keep existing entries, optionally add `.goodplan/` equivalents alongside.

### Bulk file count (~64 files)
Software-Architecture called it an upper bound (not an error). TypeScript suggested adding a verification step. No contradiction -- complementary concerns. Both included.

## Available Research

MIN-4 resolved: `withTempDir` callers (e.g., `workflow-init.test.ts`) DO pass `env` to `runCommand`. The `GOODPLAN_DIR` value IS used and must change from `.project` to `.goodplan`. This is already covered by the plan's existing task for helpers.ts.

## Unresolved (USER_INPUT required)

None. All issues have clear resolutions.
