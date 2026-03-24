# Holistic Review — Iteration 2

## Issues

**[IMPORTANT]** Phase 1 before-check expected count is wrong (~18 vs actual 13)
The Expected Behavior before-check on line 22 says "expected: ~18" but the actual grep returns 13 hits (5 in refine-plan, 4 in implement-plan, 4 in refine-slices). This was supposed to be corrected in iteration 1 (noted as "corrected grep counts") but the number is still inaccurate. An implementer who gets 13 may waste time looking for 5 missing hits.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** refine-slices line 120 activity-log write not covered in tasks
`skills/refine-slices/SKILL.md` line 120 contains: `Write activity-log with "status":"abandoned"`. The plan's task list for refine-slices mentions lines 114 and 115 but not line 120. This is a real activity-log write instruction in the "Cleanup on Interruption" section that needs migration — graceful cleanup should no longer write activity-log directly. Additionally, the before-check grep pattern uses `activity-log\.jsonl` which won't match this line (it says `activity-log` without `.jsonl`), so it would also escape verification.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-slices task line ranges are confusing and overlap
The plan says "Steps 8/10 lines 125-186: Replace entire state write-back section" but this range spans from the graceful stop section (line 125) through the CLAUDE.md update (Step 8, lines 135-161) and into the state write-back (Step 9/10, lines 170-187). The CLAUDE.md update section should NOT be replaced wholesale — only `__active__` path references within it need updating. A separate bullet "Step 9 (CLAUDE.md update) lines 146-148" overlaps and misnumbers the step (it's Step 8 in the actual file, not Step 9). An implementer following this literally could delete the CLAUDE.md update logic or be confused about which step numbers are canonical.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Before-check grep patterns don't catch all activity-log variants
The before-check patterns use `activity-log\.jsonl` but the codebase has references like `activity-log entry:`, `activity-log with`, and bare `activity-log` (e.g., refine-slices lines 115, 120; create-slices lines 127-129, 172, 184). Using `activity-log` (without `.jsonl`) as the grep pattern would be more comprehensive. The after-check has the same issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 create-plan guidance.md task should reference line 99-103 content
The plan says "Lines 95, 99-103: Replace `__active__` in Two-Layer Architecture section" for `create-plan/references/guidance.md`. Actual line 95 contains `epics/__active__<name>/architecture/` in a table row, and line 99 contains `epics/__active__<name>/slices/sequencing.md`. These are correct references but the task description ("Two-Layer Architecture section") doesn't match — line 95 is in a table (likely "Architecture Layers" or similar), not a section titled "Two-Layer Architecture". Minor clarity issue that could slow down an implementer searching for a nonexistent section heading.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** create-slices graceful stop references `state-and-activity-formats.md` on line 125
Line 125 of `skills/create-slices/SKILL.md` says `Load ~/.claude/skills/_shared/references/state-and-activity-formats.md for state.md format.` This `state-and-activity-formats.md` reference is not called out as a separate hit in the plan's task list — it's implicitly covered by the "lines 125-186" range, but since that range is already confusing (see IMPORTANT issue above), this specific reference could be missed.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured, follows established migration patterns, and correctly groups skills by complexity. The iteration 1 fixes addressed several real issues (quest scope handling, graceful stop semantics, smoke test syntax). However, three IMPORTANT issues remain: the Phase 1 hit count is still inaccurate despite being flagged in iteration 1, a real activity-log write in refine-slices line 120 is uncovered, and the create-slices task line ranges overlap and misnumber steps in a way that could confuse an implementer. To reach 9+: fix the hit count, add line 120 to the refine-slices task, and restructure the create-slices tasks into non-overlapping ranges with correct step numbers.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
