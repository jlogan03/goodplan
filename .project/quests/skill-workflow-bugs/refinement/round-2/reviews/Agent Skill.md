# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** Bug 1 task description says "consolidate into a single Verification section" but the goal.md template sections serve different purposes
Round 1 feedback said Bug 1 was retargeted to `guidance.md` — the updated plan correctly targets `guidance.md` now. However, the USER_INPUT resolution (merged.md line 188) says "real goal.md files restate the same content in both" — implying the sections are redundant in practice. But reading the actual template in `guidance.md` (lines 92-100), `## Success Criteria` contains checkable assertions (`- [ ] <What to run> — <expected outcome>`) while `## Verification` contains narrative live-testing instructions. These ARE structurally different formats. The plan task says "Consolidate into a single `## Verification` section in `guidance.md`" — but this means the checklist-style assertions from Success Criteria need to be folded into or preserved within the Verification section. The task doesn't specify how the merge should work: does Verification absorb the checklist format? Does it become a hybrid section with both a checklist and narrative? The implementing agent needs guidance on the target format of the consolidated section, or the merge could lose the distinct checklist-style assertions that Success Criteria provides. Add a sentence describing the target format: e.g., "The consolidated Verification section should include both the checkable assertions (checklist format from Success Criteria) and the narrative live-testing instructions."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3b task list is ambitious — 6 skills with heterogeneous template needs in one phase
The round 1 split into 3a/3b was a good improvement. However, Phase 3b still touches 6 skills (refine-slices, complete, create-slices, create-plan, implement-plan, refine-architecture) in a single phase. The iteration-loop skills (refine-slices, implement-plan, refine-architecture) need Iteration Summary template references — straightforward substitution. But the orchestrator skills (complete, create-slices, create-plan) need novel inline rigid templates designed from scratch (Done Summary, Context Load Summary, progress indicators, slice list proposals). These are different categories of work. The verification section says "grep for structured output points" but doesn't define what constitutes a "structured output point" in each skill. Consider adding a brief per-skill checklist in the verification section listing the specific output points that must have rigid templates after this phase. This makes verification falsifiable rather than open-ended.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** refine-slices Completion Summary template is referenced but has no design guidance
Phase 3b says "Add inline rigid Completion Summary template (Refinement-style) after the finalization step" for refine-slices. But "Refinement-style" is ambiguous — refine-plan's Completion Summary has "Score Progression + Issues Resolved Per Iteration + Remaining Issues" while refine-architecture's has "Score Progression + Changes Summary + Issues Resolved + Remaining Issues." The plan should specify which style refine-slices should follow or describe what sections the template should include. Since refine-slices reviews slice definitions (not code or architecture), its completion summary likely needs different content than either existing template. At minimum, specify: should it have Score Progression? Issues Resolved? A "Slices Modified" summary?
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task 3 references "README.md (or equivalent index)" — the README exists and has a specific table format
The round 1 feedback correctly added a README update task (now Phase 2 task 3). The actual file is `skills/_shared/references/README.md` and it has a specific table format (pipe-separated `| File | Purpose |` table). The task should drop the "(or equivalent index)" hedge and specify adding a row to the existing table.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3a verification doesn't check that the inline template was actually removed from refine-plan
Phase 3a verification says "Read refine-plan SKILL.md and confirm Iteration Summary references shared template, Completion Summary remains inline." But it doesn't explicitly verify the OLD inline Iteration Summary template (the ~30-line fenced code block at lines 251-278) was removed. An implementing agent could add a reference AND leave the old template in place. Add: "Confirm the inline Iteration Summary fenced code block is removed (not just that a reference was added)."
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 feedback was well-applied. Bug 4 removed, Bug 1 retargeted to guidance.md, Completion/Done/Context Load templates kept inline, Phase 3 split into 3a/3b. The plan is now structurally sound. Remaining issues are about implementation clarity — the Bug 1 merge format, refine-slices Completion Summary design, and Phase 3b verification specificity. To reach 9+: add the merge format guidance for Bug 1, specify refine-slices Completion Summary sections, and add per-skill output point checklists to Phase 3b verification.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
