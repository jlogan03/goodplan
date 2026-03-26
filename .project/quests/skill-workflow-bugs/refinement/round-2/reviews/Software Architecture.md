# Software Architecture Review — Round 2

## Issues

**[IMPORTANT]** Bug 1 task description mischaracterizes the duplication location
The plan's Bug 1 task says "In the goal.md template, the `## Success Criteria` and `## Verification` sections are redundant in practice — real goal.md files restate the same content in both." However, `guidance.md` lines 11-17 have a prose section titled `## Success Criteria & Verification Quality Bar` that provides authoring guidance, and lines 92-100 have the goal.md template containing both `## Success Criteria` and `## Verification` as separate template sections. These are NOT redundant in the same way the plan describes — Success Criteria is a checklist of what-to-run + expected-outcome items, while Verification is a prose description of live end-to-end testing. The plan says to "consolidate into a single `## Verification` section" but the two sections serve different purposes in the template: one is a checklist, the other is a narrative testing description. The fix should either (a) merge them into Verification with both the checklist items and the narrative, or (b) keep them both but rename/clarify. The plan needs to specify what the consolidated `## Verification` section looks like — just dropping Success Criteria loses the structured checklist format. Additionally, the SKILL.md Step 6 sub-step 3 (line 132) says "Focus on **Success Criteria** and **Verification**" with detailed guidance for each — the plan says to "update to reference only Verification" but doesn't specify how to merge the two paragraphs of authoring guidance.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task references a README index that may not have a table format matching the new entry
The plan says "Update `skills/_shared/references/README.md` (or equivalent index) to list `output-templates.md`." The README has a `## Files` table (confirmed at line 11). This task is clear, but the "(or equivalent index)" hedge is unnecessary since the file definitely exists with a table. Minor clarity improvement.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3b "All 8 skills" Expected Behavior assertion lacks enumeration
The Expected Behavior at line 103 says "All 8 skills have either rigid inline templates or references to shared templates for every structured output point" but doesn't enumerate which 8 skills. For implementer clarity, list them: refine-plan, implement-plan, refine-architecture, refine-slices, project-status, complete, create-plan, create-slices. This also makes it verifiable — the implementer can check each one off.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with a clean phase decomposition (bugs first, then shared template extraction, then staged consumer integration). The 3a/3b split from round 1 feedback is good — it reduces risk by validating the shared template integration on one consumer before rolling to all. The main gap is Bug 1's consolidation task, which doesn't specify the target format for the merged section — this could lead to either losing the checklist structure or producing an awkward hybrid. Addressing the IMPORTANT issue and the two MINOR clarity items would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
