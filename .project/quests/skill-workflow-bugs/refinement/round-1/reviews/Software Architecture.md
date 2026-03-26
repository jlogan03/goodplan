# Software Architecture Review

## Issues

**[CRITICAL]** Bug 4 (sibling detection) targets the wrong problem and proposes the wrong solution
The research file (`_codebase-context.md`) clearly establishes that `copyMarkdownFiles()` already copies ALL `.md` files from slice source directories, including plan.md, plan-refined.md, etc. The plan's proposed fix — adding "sibling scan" logic that emits follow-up questions to the LLM — misidentifies the problem. The plan says to add `scanSiblings`/`siblingScan`/`unknownSiblings` to `migrate.ts` and emit follow-up questions, but: (1) the research itself says file copying already works, (2) if the real issue is about detecting artifacts for `slice.json` state mapping (in `buildMigrationState()`), the plan targets the wrong function, and (3) adding LLM-facing follow-up questions from the RPC layer violates the architectural boundary — the RPC layer orchestrates state transitions, it does not conduct conversations with the LLM. The migration protocol uses a structured question/answer pattern through `schemas.ts`, not ad-hoc follow-ups.

The plan must either: (a) clarify what "sibling file detection" actually means with a concrete reproduction case, or (b) remove Bug 4 entirely if the underlying issue was already fixed or was never correctly diagnosed.
Resolution: USER_INPUT

**[IMPORTANT]** Bug 1 targets a non-existent problem
The research file explicitly states: "Status: NOT FOUND. The `skills/create-slices/SKILL.md` does NOT contain duplicate Verification or Success Criteria sections." The plan acknowledges this was investigated but still includes the fix as a task. The plan should either: (a) identify the actual file where duplication exists (possibly `create-slices/references/guidance.md` in the goal.md template), or (b) remove Bug 1 if the issue no longer exists.
Resolution: CODEBASE_EXPLORATION
Research: Check `skills/create-slices/references/guidance.md` and any other template files in `skills/create-slices/references/` for duplicate "Verification" and "Success Criteria" sections. Also check the goal.md files under `.project/slices/*/` to see if any contain both sections — the bug may be in the template that generates slice goals, not in SKILL.md.

**[IMPORTANT]** Completion Summary templates are structurally divergent — forcing them into shared templates adds complexity without reducing duplication
The plan proposes three separate Completion Summary templates (Refinement, Implementation, Architecture). These share only the outer heading and "Score Progression" table — the body sections are entirely different (Issues Resolved vs Phase Summary + Verification Evidence vs Changes Summary). Extracting these to a shared file does not reduce duplication; it moves three independent templates to a different file and adds indirection. Each skill must still know which template to use and how to fill its unique sections. The shared Iteration Summary template is a clean extraction (structurally identical across all three skills with only a `{scope_prefix}` difference). The Completion Summary templates should remain inline in each skill.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 modifies 7 skills in a single phase with no sequencing — risk of cascading errors
Phase 3 touches refine-slices, complete, create-slices, create-plan, implement-plan, refine-plan, refine-architecture, and iteration-loop.md. If the shared `output-templates.md` has a structural issue (wrong placeholder name, missing conditional), every skill that references it inherits the problem. The plan should sequence: (1) update one skill first (refine-plan, since it's the source of truth for the Iteration Summary), (2) verify by running `/refine-plan` or at minimum reading the skill and confirming template references resolve correctly, (3) then update remaining skills. This also helps the implementer — 7 skills in one phase is a lot of context.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** "Done Summary Template" and "Context Load Summary Template" are thin abstractions
The proposed Done Summary template (scope, artifacts written, recommended next step) and Context Load Summary template (loaded files, context summary, missing list) are 3-4 line patterns. Extracting these to a shared file adds a file read and indirection for patterns so simple that inline definitions are clearer. The three skills that need these (create-plan, create-slices, complete) would each need to read `output-templates.md`, find the right section, and substitute — more work than writing 3 lines inline. Consider keeping these as inline rigid templates in each skill rather than extracting to the shared file.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification that `iteration-loop.md` consumers actually pick up the shared template reference
Phase 3 says to "Update `skills/_shared/references/iteration-loop.md` to reference `output-templates.md` for the Iteration Summary Template." But `iteration-loop.md` is a shared orchestration skeleton — it defines parameters, not templates. Adding a template reference there means every consuming skill inherits it, but the plan doesn't verify that skills which currently define their own inline Iteration Summary (refine-plan, implement-plan, refine-architecture) won't conflict with the shared loop's new reference. The plan should specify: remove inline templates from the three skills AND update the loop, not just update the loop.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has two bugs (Bug 1, Bug 4) that target problems the research file says don't exist or are misdiagnosed. This is a fundamental issue — implementing undefined fixes wastes effort and risks introducing actual bugs. The template extraction in Part B is architecturally sound for the Iteration Summary (genuine duplication, structurally identical), but over-extracts for Completion Summaries (structurally divergent) and thin patterns (Done/Context Load). Phase 3 is too broad for a single phase. To reach 9+: resolve or remove Bugs 1 and 4 based on actual reproduction, keep only the Iteration Summary as a shared template, keep Completion Summaries and thin patterns inline, and split Phase 3 into two passes (first skill + verify, then remaining skills).

## Summary
- Critical: 1
- Important: 3
- Minor: 2
