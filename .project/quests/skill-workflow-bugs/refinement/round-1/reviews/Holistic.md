# Holistic Review — Skill Workflow Bugs & Output Consistency

## Issues

**[CRITICAL]** Bug 1 targets wrong file — duplication is in the goal.md template, not SKILL.md

The plan says "Find where both 'Verification' and 'Success Criteria' sections are defined in the slice goal template" in `skills/create-slices/SKILL.md`. The research file (`_codebase-context.md`) explicitly confirmed this bug does NOT exist in SKILL.md. The duplication is in `skills/create-slices/references/guidance.md` (lines 92-100), which defines the goal.md template with **both** a `## Success Criteria` section and a `## Verification` section. These are intentionally separate sections in the template — Success Criteria are checkboxes for "what to run + expected outcome" and Verification is prose for "live end-to-end testing." SKILL.md Step 6 sub-step 3 (line 132) says "Focus on **Success Criteria** and **Verification**" — treating them as two distinct things. The research found "no duplication" and suggested the bug may already be fixed or may exist in guidance.md. The plan must either: (a) confirm the bug still exists and fix the correct file (`guidance.md`, not `SKILL.md`), or (b) drop the bug if the two sections are intentionally distinct (which the evidence suggests). The Expected Behavior grep checks also target the wrong file.

Resolution: CODEBASE_EXPLORATION

Research: Re-examine whether "Success Criteria" and "Verification" in `skills/create-slices/references/guidance.md` lines 92-100 are intentionally distinct sections or an accidental duplication. Check how existing goal.md files in the repo use these two sections — do they serve different purposes? Also check if any reviewer (refine-slices reviewers) references one or both section names.

---

**[CRITICAL]** Bug 4 is underspecified — research found the core premise may be wrong

The research file found that `copyMarkdownFiles()` already copies ALL `.md` files from slice source directories (line 588 checks `entry.name.endsWith(".md")`). The plan says to "add logic to scan each source directory for files/subdirectories not mentioned in the answers" and "emit a follow-up question asking the LLM whether they should be included." But the research raises a fundamental question: is this about file copying (already handled) or about accurately mapping old-format artifact presence to new `slice.json` artifact flags (a different fix in `buildMigrationState()`)? The plan's tasks, expected behavior checks, and test descriptions are all based on the "scan siblings and ask about them" interpretation, which may be solving the wrong problem. An implementer would get stuck here.

Resolution: CODEBASE_EXPLORATION

Research: Read `src/core/rpc/migrate.ts` fully, focusing on `buildMigrationState()` and the answer-processing logic. Determine: (1) What files are currently NOT copied during migration that should be? (2) What does "sibling file detection" mean in the original quest definition? Check `.project/quests/skill-workflow-bugs/` for the original bug report or quest goal. (3) Is the issue about file copying or about state mapping?

---

**[IMPORTANT]** Phase 2 Completion Summary templates diverge significantly — shared template may not work

The plan proposes three separate Completion Summary templates (Refinement, Implementation, Architecture) but the codebase shows these have structurally different sections: refine-plan has "Score Progression + Issues Resolved Per Iteration + Remaining Issues," implement-plan has "Phase Summary table + Verification Evidence + Key Decisions + Follow-up Recommendations," and refine-architecture has "Score Progression + Changes Summary + Issues Resolved." The plan acknowledges this (it lists separate templates) but Phase 3 tasks say "Replace inline Completion Summary templates with references to shared templates" for all three skills. The shared file would need to contain three nearly-independent templates, which is less "shared" and more "centralized." The research (constraint #5) flags this too. The plan should clarify whether this is about deduplication (extracting identical parts) or centralization (moving different templates to one file). If centralization, justify why that's better than keeping templates co-located with their consuming skill.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 Expected Behavior checks are incomplete and partially incorrect

Several issues with the before/after verification checks:
1. Bug 2 (confirmation prompts) has no before/after check at all — it only appears indirectly in the "after" section as a grep for `cli-interaction.md`.
2. Bug 1's after-check `grep -c "Success Criteria" skills/create-slices/SKILL.md → 0` targets the wrong file (should be `guidance.md` if the bug exists there).
3. Bug 3's before-check greps for "AskUserQuestion" but the actual text at line 167 is "Iterate on corrections. Write completion/learnings.md when approved" — there's no literal "AskUserQuestion" string in SKILL.md Step 4. The check would already show 0 matches (false green).
4. No before/after check for Bug 4 that tests the actual behavior (e.g., running the migration and checking if siblings are detected). The grep-based checks only verify code exists, not that it works.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 tasks are excessively broad — 8 skill files modified in one phase

Phase 3 modifies SKILL.md for 7 skills plus `iteration-loop.md`. Each skill modification requires reading the current file, understanding its output points, and carefully replacing prose with template references — this is detail-heavy work. A single phase with 8 parallel modifications creates a high risk of inconsistency and makes verification difficult. The plan should either: (a) split into two phases (iteration-loop skills first since they share infrastructure, then orchestrator/interactive skills), or (b) add per-skill verification checkpoints within the phase.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No invariant compliance check for Bug 4

Bug 4 modifies `src/core/rpc/migrate.ts`, which is explicitly called out in INV-001 as a special case (bypasses `reduce()` via `buildMigrationState()`). The plan proposes adding "sibling scan" logic that may emit follow-up questions — this means the migration RPC would need to support multi-turn interaction. The plan should verify this doesn't violate INV-001's exception scope or require updating the invariant documentation. Currently the exception says migration is "a data import from a pre-CLI format, not a state transition" — adding interactive follow-up questions changes the nature of the migration flow.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 verification lacks concrete falsifiability

The verification says "Confirm each template matches the existing rigid versions in refine-plan and implement-plan (no accidental content changes)" but doesn't specify HOW to confirm this. A concrete check would be: diff the extracted template against the original inline template and verify they're byte-identical (modulo the `{scope_prefix}` slot). Also, "File is under 500 lines" is a good constraint but the check should be `wc -l` rather than visual inspection.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification for project-status is weak

The plan says "Run `/project-status` twice — confirm identical output structure" but this depends on having an active project with state. If the test project has no active work, the output may be trivially identical. Should specify the project state needed for a meaningful test, or note it as a manual verification.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No documentation update tasks

The plan does not include any tasks for updating documentation (e.g., `_shared/references/README.md` which lists shared references). Adding `output-templates.md` to the shared references directory should be reflected in the README's table.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two CRITICAL issues (Bug 1 targets wrong file per research evidence; Bug 4's core premise is questioned by research) significantly undermine the plan's implementability. An implementer would get stuck on both. The template extraction work (Phases 2-3) is well-structured but the Completion Summary centralization rationale needs clarification. The plan demonstrates good scope management and clear phasing, but the foundation (the bug fixes) needs re-validation before the plan is actionable.

To reach 9+: resolve the two CRITICAL issues (confirm or drop Bug 1, clarify Bug 4's actual problem), fix the Expected Behavior checks to be falsifiable against the correct files, split Phase 3 or add per-skill checkpoints, and add the invariant compliance note for Bug 4.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
