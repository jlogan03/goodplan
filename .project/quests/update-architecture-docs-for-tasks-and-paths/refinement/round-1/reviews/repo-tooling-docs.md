# Repo, Tooling, & Docs Review — update-architecture-docs-for-tasks-and-paths

## Issues

**[IMPORTANT]** Phase 3 missing: `conventions.md` repo structure omits `src/commands/task/`
The plan's Phase 3 task "Remove stale entries from `conventions.md` repo structure" addresses removing `src/core/workflow/` and `src/commands/activity/`, but does not add `src/commands/task/` which exists on disk with 5 command files (create, list, show, drop, convert). This is a gap -- the whole point of this quest is to bring docs in line with Task entity reality, and `conventions.md` is the repo structure reference. The task should also add `task/` to the `src/commands/` listing with the correct command names.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 missing: `conventions.md` repo structure omits task transitions and task schemas
`conventions.md` line 57-60 lists transition handlers but is missing `task-create` and `task-lifecycle` (both exist at `src/core/state/transitions/`). Line 67 lists entity schemas as "(project, epic, slice, quest, overview)" but is missing `task`. Line 66 lists command schemas as "(epic.ts, slice.ts, quest.ts, submit.ts, decision.ts, status.ts)" but is missing `task.ts` and `artifacts.ts`. Since the plan explicitly updates `conventions.md` in Phase 3, these omissions should be addressed in the same task or a sibling task.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 data-model.md schema registry fix is incomplete -- `epicOverviewSchema` difference not addressed
The plan's Phase 2 task "Fix schema registry paths in `data-model.md`" correctly identifies missing task patterns and stale flat slice paths. However, the actual code in `schema-registry.ts` uses `epicOverviewSchema` for `epics/overview.json` (not `overviewSchema`), while `data-model.md` line 358 shows `overviewSchema` for all overview files. The plan should note this discrepancy so the doc update reflects the actual code accurately.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 data-layer-api.md schema registry also has `overviewSchema` for epics instead of `epicOverviewSchema`
Same issue as above but in `data-layer-api.md` line 120. The actual code uses `epicOverviewSchema` for `epics/overview.json`. The fix task should update both files consistently.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Expected Behavior checks use `grep` with naive patterns that may false-positive
Several "Before/After implementation" checks use patterns like `grep 'epics.*slices' data-layer-api.md` which could match commentary text, not just the schema registry. More precise patterns (e.g., matching the regex literal) would reduce false positives during verification. This is a minor robustness concern -- the verification will likely work in practice but could be tightened.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `conventions.md` skills count check may be fragile
The verification says "conventions.md skills listing count matches actual `ls skills/ | wc -l`" but the actual count includes `_shared/` which is not a skill (it's shared references). The plan task says to add `audit-docs/`, `audit-tests/`, `capture/` -- which is correct per the filesystem. But the count verification should exclude `_shared/` or account for it explicitly to avoid confusion.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan correctly identifies and addresses the 13 audit findings. Phase structure is logical (Task entity docs, per-API corrections, primer/conventions cleanup). Verification checks are present for each phase. The main gap is that `conventions.md` updates in Phase 3 are scoped too narrowly -- they fix the skills listing and remove stale dirs, but miss that the repo structure tree itself needs Task-related additions (commands, transitions, schemas). This is the same class of gap the plan is designed to fix, so it should be addressed. Fixing the two IMPORTANT issues and the epicOverviewSchema discrepancy would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
