# Holistic Review: Skills Update (04-skills-update)

## Issues

**[IMPORTANT]** Plan lists `state-and-activity-formats.md` as needing updates but it has zero flat references
The plan includes `skills/_shared/references/state-and-activity-formats.md` in its task list ("update scope format examples"). However, `grep -c '\.project/slices/' skills/_shared/references/state-and-activity-formats.md` returns 0 — the file already uses only nested `epics/<name>/slices/<name>` paths (2 occurrences). The task is unnecessary and wastes implementor time on a no-op. Remove it from the task list.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Learnings.md removal scope incomplete — misses Step 4 artifact loading lines
The plan's learnings removal task says to remove "Step 5" direct-write instructions from `complete/SKILL.md`. But `.project/learnings.md` is also loaded for deduplication purposes in Step 4's artifact list:
- Line 109: `.project/learnings.md` — existing learnings to avoid duplication
- Line 135: `.project/learnings.md` (to avoid duplication in rollup)

The research file (Gotcha #4) explicitly flags this: "the plan's learnings.md removal task should also remove the `learnings.md` loading step (Step 4 artifact list, line 109) since the file is no longer read for deduplication once writes are removed." The plan should explicitly call out removing these Step 4 loading references alongside the Step 5 write instructions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete/references/guidance.md` line 15 has flat `slices/sequencing.md` path not captured by either task group
Line 15 of `guidance.md` reads: `Project-level: .project/architecture/, .project/learnings.md, slices/sequencing.md (or the epic's slices/sequencing.md for epic slices).` This contains two issues the plan should address: (1) the `.project/learnings.md` reference (loading for context — covered by the learnings removal task), and (2) `slices/sequencing.md` which is a flat path reference that was eliminated by the consolidated overview (sequencing is now embedded in `epics/overview.json` slice array ordering). The plan's path-updates task for `guidance.md` only mentions "signal tracking glob paths" and "remaining slice review paths" — it should explicitly call out updating or removing the `sequencing.md` reference on line 15.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Pre-implementation expected behavior grep for learnings uses a narrow pattern
The "Before" check `grep -c 'edit.*learnings\.md\|write.*learnings\.md\|writes.*learnings\.md' skills/complete/SKILL.md` returns 2, which captures the edit/write instruction lines. But it misses the loading references (lines 109, 135 with plain `.project/learnings.md`) and the synthesis comment (line 189). A more comprehensive check would grep for the project-level path itself: `grep -c '\.project/learnings\.md' skills/complete/SKILL.md` (returns 5, covering all references). The "After" check should use the same broader pattern to confirm complete removal.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks
The plan overview says "12 files across 7 skills + 2 shared references" and all changes are content-only markdown. While the CLAUDE.md project instructions reference multiple architecture docs, the plan doesn't include a task to update any documentation that might reference skill path conventions. This is acceptable given the plan's stated scope ("Skill-only slices don't need formal review cycles — grep + smoke test is sufficient"), but worth noting that `CLAUDE.md` itself references `.project/slices/` paths in its "Also check if relevant" section — specifically `.project/epics/entity-restructuring/slices/sequencing.md`. If that path no longer exists, it should be updated. However, CLAUDE.md changes may be out of scope for this slice.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear mechanical tasks, good verification commands with concrete before/after counts, and an accurate research file that thoroughly documents the nuances. The single-phase approach is appropriate for a mechanical find-and-replace slice. To reach 9+: fix the incomplete learnings.md removal scope (IMPORTANT), remove the no-op `state-and-activity-formats.md` task (IMPORTANT), and capture the `sequencing.md` flat reference in guidance.md (IMPORTANT).

## Summary
- Critical: 0
- Important: 3
- Minor: 2
