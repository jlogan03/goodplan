# Repo, Tooling, & Docs Review — Slice 08 Documentation Plan

## Issues

**[IMPORTANT]** Phase 3 grep patterns match CLI command names, not just stale skill names
The "Before" and "After" grep patterns in Phase 3 Expected Behavior use broad substrings like `refine-architecture`, `refine-slices`, `create-slices`, `implement-plan`. These match legitimate CLI sub-command names in `create-epic/SKILL.md` (e.g., `$GP epic:refine-architecture`, `$GP start-refine-slices`, `$GP submit-refine-architecture`). The 10 matches in `create-epic/SKILL.md` reported in research are all CLI commands, not stale skill references. The verification grep will report false positives, making it impossible to reach "0 matches" without either (a) incorrectly rewriting valid CLI commands or (b) needing a more precise grep pattern. Fix: update the Phase 3 verification grep to exclude CLI command patterns (lines containing `$GP` or `gp `), or switch to a pattern that matches the `/` prefix form of skill invocations (e.g., `/create-architecture` not `create-architecture` as a bare substring). The task list should also explicitly note that `create-epic/SKILL.md`'s CLI command references are NOT stale and must not be changed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 task list misses files with stale references
The plan lists 6 specific files to update in Phase 3 tasks but the research shows 18 files with matches. Several files with stale references are not enumerated:
- `skills/_shared/references/cli-interaction.md` (line 65: `name: project-status` in a frontmatter example -- should be `status`)
- `skills/_shared/references/decisions-format.md` (line 24: `create-architecture` in an example)
- `skills/_shared/references/audit-conventions.md` (line 3: lists `audit-architecture`, `audit-docs`, `audit-tests` as separate skills)
- `skills/plan-slice/SKILL.md` (2 matches)
- `skills/audit/SKILL.md` (4 matches)
- `skills/create-side-quest/SKILL.md` (1 match)
- `skills/upgrade/references/migration-heuristics.md` (2 matches)
- `skills/init/references/migration-detection.md`, `skills/init/references/repo-scanning.md`, `skills/init/references/expertise-profiling.md` (1 match each)
The final task bullet says "Run full grep to find any remaining stale references" which is a good catch-all, but the Expected Behavior "After" assertion of "0 matches" combined with missing explicit tasks means the implementer might not know these files need attention. Fix: either enumerate all 18 files in the task list, or explicitly call out "the 6 files above are the highest-impact; the catch-all grep in the final task will surface the remaining ~12 files."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 mapping table is incomplete for the status skill rename
The Phase 3 task list includes a mapping table for old-to-new skill names but omits the `/project-status` -> `/gp:status` rename. This is one of the more visible renames (appears in `status-logic.md`, `cli-interaction.md`, and `README.md`). Fix: add `/project-status` -> `/gp:status` to the mapping table.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 claims `.goodplan/conventions.md` needs `agents/` added, but it already has it
The research file and codebase confirm that `.goodplan/conventions.md` already lists `agents/` in the repo structure (line 31) and describes agent definitions (line 107). The Phase 4 task "Add `agents/` to repo structure" in conventions.md is already done. Fix: change the task to "Verify `agents/` is present and agent count is accurate (currently 34)" rather than "add."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 E2E model flag uses `claude-opus-4-6` but this may not be the available model identifier
The plan specifies `--model claude-opus-4-6` for the E2E validation run. If the harness or SDK uses a different model string format (e.g., `claude-opus-4-6`), this is fine, but it should match what the harness actually accepts. This is minor since the implementer will quickly discover any mismatch. Fix: verify the model string against the harness's accepted values (check `tools/dogfood/validate-consolidated.ts` for the `--model` flag parsing).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification uses `grep -r` on a single file
Phase 1 Verification section uses `grep -r` with a single file path (`skills/start-epic/SKILL.md`). The `-r` flag is for recursive directory search and is meaningless on a single file. This is cosmetic but sloppy. Fix: drop the `-r` flag.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases, good Expected Behavior before/after assertions, and a sensible progression from bug fixes through documentation to validation gate. The Phase 1 start-epic rewrite is thorough and correctly identifies the CLI commands to use. Phase 2 complete-epic bugs are well-diagnosed. Phase 5 E2E gate is the right final step.

The main gap is Phase 3's grep patterns producing false positives against CLI command names in `create-epic/SKILL.md`, which would make the verification assertions impossible to satisfy as written. The incomplete file enumeration in Phase 3 tasks also risks missing stale references in ~12 files. To reach 9+: fix the grep patterns to distinguish skill invocations from CLI commands, enumerate (or explicitly acknowledge) all affected files, and add the `project-status` rename to the mapping table.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
