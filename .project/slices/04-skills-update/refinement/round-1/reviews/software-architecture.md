## Issues

**[IMPORTANT]** `state-and-activity-formats.md` listed in plan but has no `.project/slices/` references — scope format lines may still need attention
The plan lists `skills/_shared/references/state-and-activity-formats.md` as a file to update, and the verification grep (`grep -rc '\.project/slices/' skills/`) correctly shows 0 matches for this file. The file uses bare scope strings like `slices/<name>` (no `.project/` prefix) at lines 34, 48. These are activity log scope format strings, not filesystem paths. Line 48 already shows both `slices/<name>` (pre-epic) and `epics/<name>/slices/<name>` (epic-scoped) as valid formats. Line 34 shows `slices/03-explore` as an example — this is a valid pre-epic scope format that should remain. The plan task for this file ("update scope format examples") may be a no-op since the file already documents both formats. Clarify: if the task is truly a no-op, remove it from the task list to avoid implementor confusion. If there is a specific line to change, cite it.
Resolution: CODEBASE_EXPLORATION
Research: Re-read `skills/_shared/references/state-and-activity-formats.md` lines 18, 34, 48-52 and confirm whether any scope format examples still reference flat-only paths that should now show the nested format as primary. If all formats are already documented correctly, remove the task.

**[IMPORTANT]** Completion glob patterns need dual-path support, not simple replacement
`complete/SKILL.md` lines 266-267 scan `.project/slices/*/completion/learnings.md` for discovering completed scopes. The plan says "replace `.project/slices/<name>/` with `.project/epics/<epic>/slices/<name>/`" but this glob needs to also cover quests (`.project/quests/*/`) and potentially legacy flat slices. The research file (Gotcha #3) flags this but the plan's task description for `complete/SKILL.md` says "update... glob patterns" without specifying the target pattern. The replacement should be `.project/epics/*/slices/*/completion/learnings.md` (adding the epic wildcard level) while keeping the quest glob unchanged. The plan should specify the exact target glob pattern rather than leaving it to implementor judgment, since an incorrect glob here silently breaks completion discovery.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan claims 12 files but `state-and-activity-formats.md` may be a no-op — actual count may be 11
The overview says "12 files across 7 skills + 2 shared references" but if `state-and-activity-formats.md` is already correct (see first issue), the actual count is 11 files. Minor inconsistency but could confuse implementors tracking progress.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Learnings removal task should explicitly enumerate all line references to remove
The plan's learnings removal task says "remove instructions to read/edit `.project/learnings.md` directly" and the research file enumerates specific lines (109, 135, 185, 189, 233 in SKILL.md; 15, 34, 38 in guidance.md). The plan task description should inline these line references (or at least cross-reference the research file) so the implementor doesn't need to re-discover them. This is especially important because `complete/SKILL.md` is 450+ lines and learnings references are scattered across multiple steps.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan is well-structured for a mechanical migration: single phase, grep-based verification, clear before/after expected behavior. The research file is thorough and provides excellent context on intentional-vs-stale references. Two things keep it from 9+: (1) the completion glob pattern replacement needs explicit target patterns since an incorrect glob silently breaks a critical workflow, and (2) the `state-and-activity-formats.md` task should be confirmed as a no-op or given specific line targets. Both are directly addressable.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
