# Holistic Review — Decisions & Expertise Infrastructure

## Issues

**[IMPORTANT] Phase 0 missing: update refine-plan and implement-plan SKILL.md for formats.md consolidation**
Phase 0 lists 6 skills for `formats.md` migration (start-project, explore, define-architecture, define-slices, create-plan, complete-slice) but does not include refine-plan or implement-plan. Codebase check confirms those two skills do NOT reference `formats.md` in their SKILL.md, so this is actually correct. However, the task "Remove old per-skill copies: `formats.md` from 6 skills" should be verified — the Glob search confirms exactly 6 `formats.md` files exist in those 6 skills. No issue here upon closer inspection.
Resolution: N/A — false alarm after codebase verification.

**[IMPORTANT] Phase 3 missing: refine-plan and implement-plan as decision readers**
The overview states "Who reads: All interactive skills load active decisions as context alongside architecture files." Phase 3 lists 7 reader skills: start-project, explore, define-architecture, define-slices, create-plan, complete-slice, project-status. However, `refine-plan` and `implement-plan` are also interactive skills. They spawn sub-agents that would benefit from knowing active decisions (e.g., a reviewer evaluating whether a plan aligns with architectural decisions). The architecture-quality downstream quest explicitly says refine-architecture should "load architecture files + decisions" — if refine-plan doesn't already load decisions, refine-architecture will need to add it from scratch. Adding decision-reading to refine-plan and implement-plan now would tee up the downstream quests better.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3 missing: create-plan guidance.md Context Loading list is incomplete**
Phase 3 includes a task to "Update `create-plan/references/guidance.md` — add `.project/decisions/` to the Context Loading list." This is good. But the same pattern applies to other skills that have reference files with context loading instructions. Verify whether any other skills have similar reference files that also need updating. Currently only `create-plan/references/guidance.md` has a Context Loading section, so this is likely complete — but the task should explicitly state "check other skills for similar reference files" to be safe.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4 missing: project-status should display expertise summary**
Phase 4 adds expertise awareness to 6 interactive skills but does not mention `project-status`. The architecture-quality quest expects skills to "calibrate explanation depth to user expertise." If `/project-status` displays no expertise info, users can't verify their expertise profile is correct without manually reading CLAUDE.md. Adding a brief expertise summary line to the project-status report (Format A and B) would make the expertise system visible and verifiable.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Downstream readiness: "cross-cutting guidance" expectation unclear**
Both downstream quests list their dependency as: "decisions-and-expertise side quest must be complete (decisions/ convention, expertise tracking, cross-cutting guidance)." The term "cross-cutting guidance" is not defined in this plan. If it refers to the calibration depth notes added in Phase 4, the plan covers it. But if the downstream quests expect something more (e.g., a shared reference file about cross-cutting concerns), there's a gap. Clarify what "cross-cutting guidance" means in this context and ensure this plan delivers it.
Resolution: USER_INPUT

**[MINOR] Phase 1: decision format missing "Tags" or "Domain" field**
The decision format has Status, Date, Context, Decision, Rationale, Consequences. The downstream architecture-quality quest references "alignment with decisions from explore phase and design tree." Without a domain or tags field, agents loading decisions will need to read every decision file to determine relevance. For a small number of decisions this is fine, but as the project grows, a `Domain: architecture | slicing | implementation` field would enable selective loading. Not blocking, but worth considering.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 verification: no cross-check against actual SKILL.md content**
Phase 5 verification says "Spot-check that the workflow step descriptions are consistent with the actual skill SKILL.md files updated in Phases 3-4." This is good guidance but could be more specific — e.g., verify the workflow describes the same writer/reader lists as the plan implemented.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 0: no rollback plan if shared reference merge reveals differences**
The plan says "merge content from the 6 existing `formats.md` files" but doesn't address what to do if they've already drifted. Before merging, the implementer should diff all 6 files to identify any skill-specific content that crept in. The consolidation criterion is sound, but the task should include an explicit diff step.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good dependency ordering, and thorough verification steps. The main gaps are: (1) refine-plan and implement-plan are excluded from decision-reading despite being interactive skills that would benefit from it — and the downstream architecture-quality quest will need this, (2) the "cross-cutting guidance" term used by downstream quests isn't clearly delivered by this plan, and (3) project-status doesn't surface expertise info. Fixing these three issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
