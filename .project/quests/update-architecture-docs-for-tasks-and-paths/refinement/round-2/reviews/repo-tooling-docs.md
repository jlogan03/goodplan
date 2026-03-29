# Repo, Tooling, & Docs Review — update-architecture-docs-for-tasks-and-paths (Round 2)

## Issues

**[MINOR]** Phase 2 Expected Behavior "Before" check pattern may not match as expected
The "Before implementation" check `grep 'slices/overview' .project/architecture/data-layer-api.md` will match the stale entry at line 122, which is correct. However, the task description says "Remove stale flat entries (`slices/overview.json`, `slices/[^/]+/slice.json`)" — but `slices/[^/]+/slice.json` does not actually appear in `data-layer-api.md` (only `slices/overview.json` at line 122). The implementer should verify which flat entries actually exist before attempting removal, to avoid confusion when a deletion target is already absent. This is minor since the task says "remove stale flat entries" which naturally handles the case where some don't exist.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `activity:list` disposition left ambiguous
The task says "If `activity:list` is still planned, add a comment; if not, remove." The `src/commands/activity/` directory does not exist on disk, so the implementer will need to make a judgment call. The plan could resolve this ambiguity now by checking whether `activity:list` appears in any backlog or roadmap artifact — if not, the instruction should just say "remove the `activity/` entry." This is minor because the implementer will arrive at the right answer either way.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three IMPORTANT issues from Round 1 have been addressed:
- `conventions.md` now includes `src/commands/task/` addition, transition handlers (`task-create`, `task-lifecycle`), entity schemas (`task`), and command schemas (`task.ts`, `artifacts.ts`)
- `epicOverviewSchema` fix is now explicitly called out in both `data-layer-api.md` and `data-model.md` tasks
- Skills count verification now excludes `_shared/`

The plan accurately reflects codebase reality across all three phases. Task descriptions include specific source files to read for ground truth. Expected Behavior checks cover before/after states. The verification approach is appropriate for documentation work — grep-based checks that confirm presence/absence of key strings. The only remaining items are two minor clarity improvements that won't affect correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
