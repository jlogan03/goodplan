## Issues

**[IMPORTANT]** Expected Behavior "After implementation" checks still lack negative verification for inline template removal

Round 1 flagged that Expected Behavior checks verify file existence (grep for headings in output-templates.md) and reference presence (grep for `output-templates.md` in consuming skills) but do not verify the actual inline templates were removed. The plan added reference-presence checks (lines 30-38), which addresses half of the issue. However, there are no negative checks confirming the inline template content is gone.

For example, after implementation, `create-slices/SKILL.md` should no longer contain the inline Context Load Summary block (`**Loaded**: {list of files loaded}` / `**Context**: ...` / `**Missing**: ...`). Without negative checks, a skill could end up with both the inline template AND a reference to the shared one, which defeats the purpose.

Add "Before implementation" style grep checks that confirm inline template markers are present (establishing baseline), and "After implementation" checks that confirm those same markers are absent. For example:
- Context Load: `grep -c '^\*\*Loaded\*\*:' skills/create-slices/SKILL.md` returns 0 after implementation
- Completion Summary: `grep -c '### Score Progression' skills/refine-plan/SKILL.md` returns 0 after implementation
- Done Summary: `grep -c '## Slices Defined' skills/create-slices/SKILL.md` returns 0 after implementation

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** explore skill's Done Summary is not a template — plan should clarify the extraction strategy

The plan now correctly includes explore and create-architecture in the Done Summary consumer list (5 skills). However, the explore skill (lines 233-239) does not have a fenced template block like the other 4 consumers. It has prose instructions ("Summarize all decisions written during this run...") with a bullet list of next steps by scope. The create-architecture skill (lines 340-347) is similar — a bullet list of items to present, not a fenced template.

The plan's task "Extract Done Summary skeleton" (line 46) says "explore and create-architecture are more prose-oriented but follow the same conceptual pattern; they may need a slightly different variant or looser conformance." This acknowledgment is good but vague. It should specify the concrete extraction strategy: will the shared skeleton be a loose checklist (fields to include) rather than a rigid fenced template? Or will explore/create-architecture get a fenced template added where they currently have prose? This affects how the "Update consuming skills" task interprets what "replace inline template with reference" means for these two skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Completion Summary Template base skeleton definition still implicit

Round 1 flagged that the 4 Completion Summary Templates have meaningful structural differences (per-iteration issue tables vs. total-only, different field names like `**Path**` vs. `**Architecture files**`). The plan's task description (line 44) now says "identify the shared base as the intersection: Score Progression table + Issues Resolved + Remaining Issues. Everything else is an extension point." This is a significant improvement from round 1.

However, the Completion Summary Templates also differ in their heading line (`## Refinement Complete` vs. `## Architecture Refinement Complete` vs. `## Implementation Complete`) and top-level fields (`**Final plan score**` + `**Path**` + `**Iterations**` vs. `**Final score**` + `**Iterations**` + `**Architecture files**` vs. `**Plan**` + `**Phases completed**` + `**Total iterations**`). The shared base template should specify whether these headings and top-level fields are extension points or if there is a common pattern (e.g., `## {Scope} Complete` + `**Final score**` + `**Iterations**`). This is minor because the task description gives enough direction for an implementer to figure it out, but making it explicit would prevent ambiguity.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were substantively addressed: explore and create-architecture are now included in the Done Summary scope (fixing the most significant gap), the Completion Summary base skeleton is defined as an intersection with extension points, the README update task was added, and the Context line variance for complete is acknowledged. The remaining IMPORTANT issue (no negative verification for inline removal) is the main gap preventing a 9. Fixing that and clarifying the two MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
