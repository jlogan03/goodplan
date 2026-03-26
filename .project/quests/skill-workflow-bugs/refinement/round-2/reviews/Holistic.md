# Holistic Review — Round 2 — Skill Workflow Bugs & Output Consistency

## Issues

**[IMPORTANT]** Bug 1 task description still references SKILL.md line ~132 update but Expected Behavior checks are now correct

The Bug 1 task says: "Then update `skills/create-slices/SKILL.md` Step 6 sub-step 3 (line ~132) which references both 'Success Criteria' and 'Verification' as distinct concepts — update to reference only 'Verification'." However, the actual line 132 says: `Focus on **Success Criteria** and **Verification** — these are the most important parts of each goal.md:` followed by detailed guidance for each. In the goal.md template (guidance.md lines 92-100), Success Criteria and Verification ARE somewhat distinct: Success Criteria = checkbox items with "what to run + expected outcome", Verification = prose describing live end-to-end testing. Consolidating them in guidance.md is reasonable (the research confirms real goal.md files restate the same content), but the SKILL.md line 132 update needs care — it currently gives separate guidance for each section ("Each success criterion must specify..." and "The Verification section must describe..."). The task should specify how to merge these two guidance paragraphs in SKILL.md, not just change a section name reference. An implementer might delete valuable guidance about what makes good verification criteria.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 Expected Behavior before-check for Bug 1 is misleading

The before-check says: `grep -c "Success Criteria" skills/create-slices/references/guidance.md` with the note "shows Success Criteria section in goal.md template (redundant with Verification)." But `grep -c` returns a COUNT of matching lines. The file has "Success Criteria" on lines 11, 15, and 92 — so `grep -c` returns 3, not a boolean. The after-check says "0" — but even after consolidation, line 11 (`## Success Criteria & Verification Quality Bar`) and line 15 (`**Success Criteria:** Every criterion must specify...`) would still contain "Success Criteria" unless those are also changed. The plan only mentions consolidating the template sections (lines 92-100), not the quality bar section at the top. Either the before/after checks need to target specific lines (e.g., `grep -n "^## Success Criteria$"` to match only the standalone heading), or the task scope needs to include the quality bar section too.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3b task for create-slices references non-existent "context load summary" at Step 2

The task says: "Convert semi-rigid context load summary (Step 2) to inline rigid template." Looking at the actual SKILL.md for create-slices, Step 2 does context loading but may not have a semi-rigid summary format — the research file doesn't mention one for create-slices. Similarly, the task references "semi-rigid slice list proposal (Step 4) and progress indicator (Step 6)" — these need verification that the prose output points actually exist at those step numbers. Step numbers can shift across skill revisions. The plan should reference the actual content (e.g., "the context load output after reading state") rather than relying on step numbers that may be stale.

Resolution: CODEBASE_EXPLORATION

Research: Read `skills/create-slices/SKILL.md` Steps 2, 4, 6, and 10 to confirm: (1) Is there a context load summary at Step 2? (2) Is there a slice list proposal at Step 4? (3) Is there a progress indicator at Step 6? (4) What does the Done Summary at Step 10 look like? Map actual prose output points to the plan's task descriptions.

---

**[MINOR]** Phase 2 task 3 references "README.md (or equivalent index)" — the file exists, just reference it directly

The task says: "Update `skills/_shared/references/README.md` (or equivalent index) to list `output-templates.md`." The file exists at exactly that path. Drop the "(or equivalent)" hedge — it adds ambiguity for the implementer. This was flagged as a MINOR in round 1 ("No documentation update tasks") and was addressed, but the wording could be tighter.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3a verification doesn't check that the inline template was actually removed from refine-plan

The verification says "Read refine-plan SKILL.md and confirm Iteration Summary references shared template, Completion Summary remains inline" — but it doesn't explicitly verify the OLD inline Iteration Summary template (the full fenced code block at lines 247-278) was removed. The implementer could add a reference AND leave the old template in place, creating two sources of truth. Add: "Confirm no fenced code block Iteration Summary template remains in refine-plan SKILL.md."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3b "All 8 skills" count may be wrong

The Expected Behavior after-check says "All 8 skills have either rigid inline templates or references to shared templates for every structured output point." Let me count the skills mentioned across the plan: refine-plan (3a), refine-slices, complete, create-slices, create-plan, implement-plan, refine-architecture (3b = 6 skills). Plus project-status makes 8 total. But project-status is NOT mentioned in any Phase 3b task — it already has rigid templates per the research. The "8 skills" check implies project-status should be verified but no task modifies it. Either add a verification-only task for project-status or change the count to 7 (the skills actually touched).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 feedback was well-applied: Bug 4 is gone, Bug 1 is retargeted to guidance.md, Completion/Done/Context Load templates stay inline, Phase 3 is split into 3a/3b. The two former CRITICAL issues are resolved. The remaining issues are execution-level: the Bug 1 SKILL.md update needs more detail about merging guidance paragraphs, the grep-based Expected Behavior checks need tighter patterns to avoid false positives, and Phase 3b references step numbers that may be stale. No structural or goal-alignment problems remain.

To reach 9+: Fix the Bug 1 Expected Behavior grep pattern to target the specific heading (not all occurrences of "Success Criteria"), specify how to merge the SKILL.md Step 6 guidance paragraphs, and verify Phase 3b step-number references against actual SKILL.md content.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
