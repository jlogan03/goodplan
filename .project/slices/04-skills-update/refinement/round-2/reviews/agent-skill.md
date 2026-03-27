# Agent Skill Review: 04-skills-update (Round 2)

## Issues

**[IMPORTANT]** `complete/references/guidance.md` line 53 "update rollup" is an implicit `.project/learnings.md` write instruction not covered by plan

Line 53 of `guidance.md` says: "If new learnings surfaced, append to `completion/learnings.md` + update rollup." The phrase "update rollup" is an implicit instruction to write to `.project/learnings.md` (the project-level learnings rollup file). The plan's learnings removal task for `guidance.md` targets lines 15, 34, and 38 but does not mention line 53. After removing the explicit `.project/learnings.md` write instructions from lines 34 and 38, this implicit "update rollup" reference would become the last remaining instruction to write to the project-level file — an agent would interpret it as "go update `.project/learnings.md`" since that's what "rollup" meant in the old workflow.

**Fix:** Add line 53 to the `complete/references/guidance.md` learnings removal task. Change "append to `completion/learnings.md` + update rollup" to just "append to `completion/learnings.md`" (the CLI payload handles rollup).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `complete/references/guidance.md` line 124 references `slices/slices-refining/` without the dual-path treatment

Line 124 says: "Note: `slices/slices-refining/` rounds measure slice *definition* quality..." This mirrors the `complete/SKILL.md` line 277 reference that the plan now correctly addresses with dual-path treatment. However, the `guidance.md` counterpart at line 124 is not mentioned in the plan's task list for that file. Both files should be updated consistently.

**Fix:** Add line 124 of `complete/references/guidance.md` to the path update task. Apply the same dual-path approach as `SKILL.md` line 277: reference both `slices/slices-refining/` and `epics/<epic>/slices/slices-refining/`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification "Expected Behavior" before-count of 36 may drift before implementation

The plan's "Before implementation" check says `grep -rc '\.project/slices/' skills/` should return 36. This count is currently accurate but these files are actively changing (per the research file, all 11 files have recent commits). If any upstream skill edits land before this slice is implemented, the count will silently differ and the implementor may think the "before" check failed. The plan acknowledges active file state in the research file but does not address this in the Expected Behavior section.

**Fix:** Change the "before" check from an exact count to a floor: "36 or more" (reflecting that additional references could be added by concurrent work, but no fewer should exist since no other slice is removing them). Alternatively, add a note: "Re-run grep during implementation to establish the actual baseline — the count may have drifted from 36."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All five IMPORTANT issues from round 1 have been properly addressed. The plan now clearly distinguishes intentional fallbacks from stale references, specifies conditional logic for the explore skill, handles the explore-logic table correctly, addresses the line 277 reference, and includes semantic coherence verification. The remaining IMPORTANT issue (line 53 implicit rollup reference) is a genuine gap that could leave one path to `.project/learnings.md` writes intact — it undermines the plan's stated goal of making "learnings rollup handled solely via CLI payload." The two MINOR issues are consistency items that reduce implementation risk but would not cause functional breakage. To reach 9+: address the line 53 rollup reference and the guidance.md line 124 dual-path gap.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
