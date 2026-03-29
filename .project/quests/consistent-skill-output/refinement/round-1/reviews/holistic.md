# Holistic Review: Consistent Skill Output

## Issues

**[IMPORTANT]** Plan misses 2 additional skills with Done Summary templates

The plan identifies 3 skills for Done Summary consolidation (create-slices, create-plan, complete) but the codebase grep reveals 2 more skills with "Done Summary" sections: `explore/SKILL.md` (line 221, prose instructions at line 235) and `create-architecture/SKILL.md` (line 340, prose list). While these are less structured than the template-based ones, they share the same conceptual pattern (scope identifier, artifacts written, recommended next step). The plan should either: (a) include them in the consolidation with a note that they use a simpler variant of the skeleton, or (b) explicitly scope them out with justification for why they don't need consolidation.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan misses implement-plan's Completion Summary Template

The plan lists only refine-plan, refine-architecture, and refine-slices for the "Refine Completion Summary" extraction. However, `implement-plan/SKILL.md` (line 396) also has a `### Completion Summary Template` with the same structural skeleton (final score, iterations, Score Progression table, Issues Resolved, Remaining Issues) plus additional implement-specific sections (Phase Summary, Verification Evidence, Key Decisions, Follow-up Recommendations). This is a fourth consumer that should either be included in the shared base template with its own extension points, or explicitly scoped out.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Before-check line 18 is wrong — "Completion Summary Template" does not exist in output-templates.md

The Expected Behavior "before" check on line 18 says: `grep -c 'Completion Summary Template' skills/_shared/references/output-templates.md` returns 1 — "only the existing Iteration Summary section header". But `output-templates.md` contains zero occurrences of "Completion Summary" (only "Iteration Summary Template" as a heading). The before-check should use a pattern that actually returns 0, matching the "not yet shared" assertion. The current check would return 0, not 1, making the before/after comparison confusing and the before assertion incorrect.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Verification task is vague — "grep all SKILL.md files" lacks a concrete command

Task 7 says "Grep all SKILL.md files for references to output-templates.md and verify each referenced section heading exists in the file." This should be a concrete verification command (e.g., `grep -r 'output-templates.md' skills/*/SKILL.md`) rather than prose. The Expected Behavior section has good concrete checks, but this task within the phase should match that concreteness.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Template naming inconsistency: "Refine Completion Summary" vs actual heading "Completion Summary Template"

The plan calls the second template group "Refine Completion Summary" but in the actual skill files, the heading is `### Completion Summary Template` (in refine-plan, refine-architecture, refine-slices, and implement-plan). The shared template in output-templates.md should use a name that either matches the existing heading or is clearly distinct. The plan should specify the exact heading to use in output-templates.md.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update task

The plan does not include a task to update the `_shared/references/README.md` file (which exists at `skills/_shared/references/README.md`) to mention the 3 new template sections being added to output-templates.md. The README likely serves as an index of shared references.

Resolution: CODEBASE_EXPLORATION

## Score: 7/10

The plan is well-structured with a single logical phase, clear task decomposition, and good Expected Behavior checks. However, it has an incomplete inventory of consuming skills (missing explore, create-architecture for Done Summary, and implement-plan for Completion Summary), an incorrect before-check assertion, and a naming inconsistency. The core approach is sound — extracting duplicated templates into a shared file with substitution rules is the right design. Bringing to 9+ requires: fixing the skill inventory to cover all consumers (or explicitly scoping them out), correcting the before-check, and specifying the exact heading names for the shared templates.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
