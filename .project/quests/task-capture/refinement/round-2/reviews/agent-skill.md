# Agent Skill Review: Task Capture Plan (Round 2)

## Issues

**[IMPORTANT]** /capture skill missing trigger avoidance note for adjacent skills

The plan specifies `description: Quick capture of a bug, idea, or improvement noticed during current work — creates a lightweight task without breaking flow`. This is a significant improvement over round 1 (which had no description at all), and the body now says "avoid overly generic triggers like 'todo:' and 'remember to' which false-trigger in normal conversation." However, the description itself does not mention when NOT to use the skill — adjacent skills like `/explore` (for research/brainstorming) and `/create-epic` (for large-scope work) could overlap. Existing skill descriptions include when-to-use guidance (see `/explore`: "Invoked when the user needs to investigate unknowns, explore options, or try approaches before committing to a plan or architecture"). The /capture description should include a brief disambiguation — e.g., "for quick lightweight notes, not for research (/explore) or large-scope work (/create-epic)." This keeps the description under the 1024-char limit while reducing false triggers on adjacent tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** /capture skill Step 1 loads cli-interaction.md but does not specify loading it "relative to this skill's directory"

Existing skills specify reference loading paths relative to the skill directory (e.g., project-status Step 2: "references/status-logic.md (relative to this skill's directory)"). The plan says "Step 1: Load `../_shared/references/cli-interaction.md` for CLI interaction conventions" but doesn't anchor the path. This is minor since the `../` prefix makes the intent clear, but for consistency with other skills, specify "relative to this skill's directory" or use the full relative path pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification does not test the skill's smart judgment flow

The plan's Phase 3 verification now includes installing the skill and reading the installed copy, which addresses the round 1 gap. However, neither the Expected Behavior nor the Verification section tests the skill's core differentiator: the two-path judgment flow (inline description vs. no description). The Expected Behavior checks are structural (file exists, grep for content). A more direct verification would be: "Manually review the installed SKILL.md to confirm: (a) inline capture path creates task without questions, (b) bare /capture path asks at most 2 questions, (c) context auto-collection runs status+git commands." This is a skill design review step, not automated testing — but it ensures the skill spec is internally consistent before deployment.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 6 IMPORTANT and 4 MINOR issues from round 1 have been addressed. The /capture skill now has proper frontmatter with a specific description, version check (Step 0), CLI interaction reference loading (Step 1), explicit output format example, and the CONVERT_TASK handler enumerates all state tree mutations with the correct inline-creation approach (no recursive reduce). The init.ts update and lazy overview creation are both specified. BeginPhase additions are fully traced with payload types. The project-status template placement is specified. The overview schema `title` addition is included. The one remaining IMPORTANT is about trigger disambiguation with adjacent skills — a straightforward description text fix.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
