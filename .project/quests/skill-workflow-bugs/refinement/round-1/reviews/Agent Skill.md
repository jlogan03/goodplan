# Agent Skill Review — Skill Workflow Bugs & Output Consistency

## Issues

**[CRITICAL]** Bug 1 is misdiagnosed — duplicate sections are in the goal.md template, not SKILL.md
The plan says to fix "duplicate Verification/Success Criteria in create-slices SKILL.md" but research (`_codebase-context.md`) confirms the SKILL.md has NO duplicate sections. The goal.md template in `skills/create-slices/references/guidance.md` (lines 92-100) intentionally has BOTH `## Success Criteria` and `## Verification` as separate sections — and the SKILL.md Step 6 sub-step 3 (line 132) explicitly says "Focus on **Success Criteria** and **Verification**" as distinct concepts. Success Criteria are checkable assertions; Verification is live end-to-end testing. These are NOT duplicates — they serve different purposes. The "Before" expected behavior (`grep -c "Verification\|Success Criteria" skills/create-slices/SKILL.md`) would find both terms because the skill correctly references both template sections. Consolidating them would LOSE the distinction between "what assertions pass" and "what live testing to perform." This bug should be removed from the plan or rewritten to target the actual issue (if there is one — the research suggests it may not exist).
Resolution: USER_INPUT

**[CRITICAL]** Bug 4 plan is vague and potentially misunderstands the problem
The research (`_codebase-context.md`) reveals that `copyMarkdownFiles()` already copies ALL `.md` files from slice source directories. The plan says "add logic to scan each source directory for files/subdirectories not mentioned in the answers" and "emit a follow-up question asking the LLM whether they should be included." But: (1) The plan doesn't clarify what "not mentioned in the answers" means — the migration protocol's answer structure needs examination. (2) The plan doesn't specify what the actual user-facing problem is — are files being lost, or is it a status-mapping issue? (3) Adding follow-up questions to `migrate.ts` is a state machine concern — the migration uses `buildMigrationState()` which bypasses `reduce()` per INV-001. New question-answer cycles would need to work within the existing migration protocol's question/answer flow in `schemas.ts`. The task description ("Add the sibling scan schema to schemas.ts") is too thin — it doesn't describe the schema shape, the question text, or how it integrates with the existing question flow. (4) The expected behavior checks (`grep -r "scanSiblings\|siblingScan\|unknownSiblings"`) test for function existence, not for correctness.
Resolution: RESEARCH_NEEDED
Research: Examine the actual migration protocol flow in `src/core/rpc/migrate.ts` and `src/commands/global/migrate/schemas.ts` to determine: (a) what the original bug report described as the problem, (b) whether files are actually being missed during copy or whether the issue is about artifact flag mapping in `buildMigrationState()`, (c) how the existing question/answer cycle works and where a sibling scan question would fit. Source: the quest's original bug description and the migrate.ts full implementation.

**[IMPORTANT]** Phase 2 proposes 5 shared templates but only 2 have clear source material
The Iteration Summary and Refinement Completion Summary templates have clear, nearly identical source material across refine-plan, refine-architecture, and implement-plan. But: (1) The "Done Summary Template" has NO existing rigid template anywhere — it would be designed from scratch based on prose descriptions that differ across skills (create-plan lists "plan location, phase count, research files written"; create-slices lists "all slices defined"; complete lists "learnings written, architecture updates made..."). A single shared template covering all three would either be too generic to be useful or too specific to fit all skills. (2) The "Context Load Summary Template" standardizes a pattern ("Loaded: [files]. Context: [summary]. Missing: [list].") that is described in prose but has no rigid source anywhere. Designing new templates is fine, but the plan should acknowledge this is new design work, not extraction, and include explicit draft templates so reviewers can evaluate them.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 updates 8 skills in a single phase with no incremental verification
Phase 3 modifies SKILL.md files for 7 skills (refine-slices, complete, create-slices, create-plan, implement-plan, refine-plan, refine-architecture) plus iteration-loop.md. Each skill has different template needs and integration points. The verification section says "grep for structured output points" but doesn't define what a "structured output point" is or how to identify them systematically. A single phase touching 7+ skill files with only post-hoc grep verification risks inconsistent integration. Consider splitting into sub-phases: (a) iteration-loop skills (refine-plan, refine-architecture, refine-slices, implement-plan) that share the same template pattern, and (b) orchestrator skills (complete, create-plan, create-slices) that need different templates. Or at minimum, add per-skill verification checkpoints.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Completion Summary templates are structurally divergent — shared template may not work
The research notes this (constraint 5) but the plan doesn't address it. The three existing Completion Summary templates have different sections: refine-plan has "Score Progression + Issues Resolved Per Iteration + Remaining Issues"; implement-plan has "Phase Summary + Verification Evidence + Key Decisions + Follow-up"; refine-architecture has "Score Progression + Changes Summary + Issues Resolved + Remaining Issues". The plan proposes two shared completion templates (Refinement and Implementation) but doesn't explain how refine-architecture's unique "Changes Summary" section fits. The task for refine-architecture says "Keep the architecture-specific Changes Summary section... add it as a supplement" but the template design in Phase 2 doesn't show this supplement mechanism. Templates that require per-skill supplements may not save much over inline templates.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** refine-slices template gap is understated — it also lacks iteration loop display integration
The plan correctly identifies refine-slices has zero templates. But the fix ("Add Output Templates section referencing shared Iteration Summary and Refinement Completion Summary") doesn't address HOW the iteration loop currently displays progress in refine-slices. The shared `iteration-loop.md` says "Display iteration summary to user" (Step 3 sub-step 4 in refine-slices) but defines no format. Currently, refine-slices relies on whatever format the orchestrating agent chooses. Adding a template reference at the display step is correct, but the plan should also update `iteration-loop.md` to reference the shared template — which it does in the last Phase 3 task, but this creates a circular dependency: Phase 2 creates the template, Phase 3's last task updates iteration-loop.md, but earlier Phase 3 tasks for refine-slices reference templates that iteration-loop.md doesn't yet point to. Re-order so iteration-loop.md is updated first or simultaneously.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Bug 2 principle placement is unspecified
The plan says "Add a 'Workflow Action Principle' section to `cli-interaction.md`" but doesn't specify where in the 13-section, 626-line file. The research confirms no existing related principle. The most natural home would be within or adjacent to Section 5 ("Interaction Patterns by Role") since it governs when skills should and shouldn't ask for user input. Specifying the target location avoids the implementing agent guessing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "before" checks are partially wrong
The first "before" check `grep -n "AskUserQuestion" skills/complete/SKILL.md | grep -i "learn"` may not match because the actual text at line 167 is "Present the draft. Iterate on corrections. Write completion/learnings.md when approved." — the word "AskUserQuestion" doesn't appear near the learnings gate. The gate is implicit ("when approved") rather than an explicit `AskUserQuestion` call. The grep would return empty before AND after, making it useless as a before/after differentiator. Better: `grep "when approved" skills/complete/SKILL.md` (matches before, no match after).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `bun run install:skills` in Phase 3 verification — verify this script exists
The plan includes `bun run install:skills` as a verification step. This should be confirmed to exist in `package.json`. If it doesn't exist, the verification step will fail.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** project-status "no changes needed" but plan says "Verify templates are still correct after other changes"
This is contradictory — if no changes are made to project-status, its templates can't become incorrect from changes to other skills. The only way they'd become incorrect is if the shared template format changed in a way that conflicts, but project-status uses completely different templates (status display formats, not iteration/completion templates). This task can be removed.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has two CRITICAL issues that undermine core objectives: Bug 1 appears to be a non-bug (the "duplicate" sections are intentionally distinct), and Bug 4 is too vague to implement safely given the research shows the underlying problem may be misunderstood. The output template standardization (Phases 2-3) is a sound idea but underspecified for the novel templates (Done Summary, Context Load Summary) and doesn't adequately address structural divergence in Completion Summary templates. To reach 9+: resolve whether Bug 1 actually exists (USER_INPUT), clarify Bug 4's actual problem and solution (RESEARCH_NEEDED), add draft templates for novel outputs in Phase 2, and split Phase 3 into incremental sub-phases with per-skill verification.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
