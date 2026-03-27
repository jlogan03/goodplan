# Agent Skill Review — Phase 1: Path Updates & Learnings Removal

## Issues

**[IMPORTANT]** `create-plan/references/guidance.md` auto-detect scan order inconsistent with SKILL.md
The SKILL.md Step 2 sub-step 3 was updated to prioritize the epic path: "If an active epic exists, scan `.project/epics/<name>/slices/`... If no active epic, scan `.project/slices/`." However, the corresponding guidance.md line 7 still says "scan `.project/slices/` and `.project/epics/<name>/slices/`" — listing the flat path first and scanning both unconditionally rather than conditionally based on active epic presence. This creates ambiguity: an agent following the guidance could scan the wrong directory first or scan both when only one is relevant.
File: skills/create-plan/references/guidance.md:7
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `create-plan/references/guidance.md` "No argument" case missing epic-nested path resolution
The SKILL.md Step 2 sub-step 2 was properly updated to specify: "If `.activeSlice` is present and `.activeEpic` exists, use `.project/epics/<activeEpic.name>/slices/<activeSlice.name>/`; if `.activeSlice` is present but no `.activeEpic`, use `.project/slices/<activeSlice.name>/`." The guidance.md line 6 was not updated — it still just says "`.activeSlice` for the active slice, `.activeQuest` for the active quest" without specifying the conditional path resolution. An agent loading the guidance reference for a quick summary would miss the epic-nested path logic entirely.
File: skills/create-plan/references/guidance.md:6
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `explore/SKILL.md` line 47 still references flat `.project/slices/` path
Line 47 says: "If it is a full path starting with `.project/` (e.g. `.project/slices/03-explore`), use as-is." The example uses a flat path. While "use as-is" means a user-provided epic-nested path would also work, the example reinforces the flat path pattern. An agent seeing this example may suggest flat paths to users. Consider updating the example to show the nested path or providing both: `.project/epics/my-epic/slices/03-explore`.
File: skills/explore/SKILL.md:47
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The path updates and learnings removal are well-executed overall. The SKILL.md files have been correctly updated with conditional epic/non-epic path resolution, the learnings.md direct-write removal from `/complete` is thorough (artifact loading, Step 5 write instructions, rollup instructions, and guidance all cleaned up), and the explore-logic.md table properly distinguishes "Top-Level Slice" vs "Epic Slice" rows. The two IMPORTANT issues are both in `create-plan/references/guidance.md` where the summary didn't keep pace with the SKILL.md updates — these matter because agents load guidance as a condensed reference and will follow its instructions over the longer SKILL.md.

To reach 9+: fix the guidance.md inconsistencies so the condensed reference matches the detailed SKILL.md logic.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
