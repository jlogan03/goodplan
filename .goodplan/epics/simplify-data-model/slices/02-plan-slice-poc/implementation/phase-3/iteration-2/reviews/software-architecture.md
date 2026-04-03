# Software Architecture Review — Phase 3: Plan-Slice Orchestrator Skill

**Reviewer:** Software Architecture
**Artifact:** `skills/plan-slice/SKILL.md` (391 lines)
**Review context:** a code implementation
**Iteration:** 2

## Previous Iteration Verification

All four IMPORTANT issues from iteration 1 have been addressed:

1. **submit-refinement format** — Now passes per-reviewer scores (`{"holistic":N,"software-architecture":N,...}`) instead of a single `{"overall":N}`. Verified at line 343.
2. **submit-plan stdin** — No longer pipes empty string. Now calls `$GP submit-plan --slice $SLICE_NAME --json` directly. Verified at line 226.
3. **Reviewer output step** — Step 4f-iii explicitly writes each reviewer's return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool, acknowledging reviewers are read-only. Verified at lines 283-286.
4. **reconsiderWhen/validUntil evaluation** — Step 4b loads active conditions via `$GP decision:list --json` and `$GP learning:list --json`, filters for non-empty conditions, and passes them to the plan-phase agent. Step 4c includes the conditions in the task prompt with instructions to evaluate and return `triggeredConditions`. Verified at lines 174-222.

## Issues

**[IMPORTANT]** submit-refinement format inconsistency with existing refine-plan skill
The new plan-slice skill passes per-reviewer scores to `submit-refinement` (line 343: `{"scores":{"holistic":8,"software-architecture":7,"agent-skill":8}}`), which is architecturally correct per the `submitRefinementInputSchema` (`z.record(z.string(), z.number())`). However, the existing `refine-plan` skill (which plan-slice replaces) uses `{"scores":{"overall":<min_score>}}` (refine-plan/SKILL.md line 204). Both formats pass Zod validation since the schema accepts any string-to-number record. The inconsistency means that any code downstream that reads refinement scores (activity log analysis, project health reporting, `slice:show` output) will encounter two different key shapes depending on which skill submitted the refinement. Since plan-slice is meant to replace refine-plan, this is the right direction — but there should be an explicit note in the skill or a follow-up task to update refine-plan's format before plan-slice goes live, so the transition is clean. As-is, both skills will coexist during rollout.
File: skills/plan-slice/SKILL.md:343
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Stagnation/reduction tracking is sound but `reductionCount` semantics could be clearer
The exit conditions (lines 305-319) correctly implement: pass at >= 9, stagnation after 2 consecutive equal rounds, reduction after 2 total reduction rounds, and a hard cap at 10 iterations. The `reductionCount` is cumulative (any position, not consecutive), which is more aggressive than stagnation detection (which requires consecutive rounds). This asymmetry is reasonable — score drops are a stronger signal than plateaus — but the difference in semantics (consecutive for stagnation, cumulative for reduction) is not called out in the skill text. A one-line comment would prevent future maintainers from assuming they work the same way.
File: skills/plan-slice/SKILL.md:317
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No context assembly for refinement loop — plan-phase uses `start-plan` but reviewers get no equivalent
Step 4a calls `$GP start-plan --slice $SLICE_NAME --json` to assemble a ContextBundle for the plan-phase agent. The CLI also exposes `start-refinement` which assembles a ContextBundle scoped to the refinement phase (potentially different content priorities). The refinement loop (Step 4f) does not call `start-refinement` — reviewers receive only the plan path and review context, relying on their own Grep/Glob/Read to find codebase context. This works for the PoC since reviewers are read-only explorers, but it means the refinement loop doesn't benefit from the CLI's phase-aware content prioritization. Worth noting as a future improvement — not blocking for PoC.
File: skills/plan-slice/SKILL.md:249
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Context discipline section could enumerate orchestrator-generated files
The Context Discipline section (lines 19-25) lists what the orchestrator may consume but only implicitly covers orchestrator-generated files (Q&A output, re-entry summaries, error details). Since the orchestrator writes the Q&A file (Step 3e) and then passes it by path, it's clear the orchestrator doesn't need to re-read it. But listing "Orchestrator-generated files (Q&A output, re-entry summaries, error details from failed sub-agents)" as an explicit bullet would close the gray area flagged in iteration 1.
File: skills/plan-slice/SKILL.md:19
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All four IMPORTANT issues from iteration 1 are resolved. The skill correctly implements the orchestrator pattern: flat agent hierarchy, CLI-driven status transitions, front-loaded interaction, context discipline, condition evaluation, per-reviewer score tracking, and well-defined exit conditions. Module boundaries are clean — the orchestrator delegates all content work to agents and operates on CLI output + structured returns. The phase table and re-entry detection correctly map CLI statuses to pipeline phases.

The one IMPORTANT remaining is a deployment coordination concern (score format coexistence with the old refine-plan skill during transition), not a structural flaw. The three MINOR items are documentation clarity improvements.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
