# Merged Review Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Phase 4 does not address implement-plan's invariant awareness gap**
Phase 4's verification section correctly notes that `implement-plan` has its own independent `shared-preamble.md` (at `~/.claude/skills/implement-plan/references/shared-preamble.md`) and that changes to `refine-plan`'s copy do NOT propagate. But Phase 4 stops at observation — no task addresses this. During implementation, `implement-plan`'s Holistic reviewer will NOT receive the instruction to read `invariants.md`, causing inconsistent invariant compliance checking (works in `/refine-plan` and `/refine-slices`, silently skips in `/implement-plan`). Either add a Phase 4 task to update implement-plan's `shared-preamble.md`, or explicitly document deferral (e.g., to the `maturity-context-loading` side quest already listed in goal.md's Out of Scope).
*Flagged by: Holistic, Software Architecture, Agent Skill*
Resolution: DIRECTLY_ACTIONABLE

**I2. Holistic reviewer criteria (12, 13) are plan-specific but reviewer serves dual duty for architecture review**
`reviewers-always.md` is shared by refine-plan and refine-architecture (via reviewer-registry.md). Phase 4 adds criteria referencing plan-specific concepts ("check that the plan doesn't violate...", "check that the plan includes steps to update..."). When this Holistic reviewer runs during `/refine-architecture`, it evaluates architecture files, not plans. Criteria text needs to be context-agnostic or include conditional guidance (e.g., "When reviewing a plan, check X. When reviewing architecture, check Y.").
*Flagged by: Holistic*
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 2 `<subsystem>-api.md` template missing `## Fitness Functions` section**
Phase 1 establishes fitness function entries live in `## Fitness Functions` of each `<subsystem>-api.md`. Phase 2 Step 8h adds candidates there. But `architecture-logic-templates.md` (used by define-architecture to write these files) has no `## Fitness Functions` section — the Phase 2 template update task only mentions adding `## Subsystem Maturity` to `_overview.md`. If someone stops before Step 8h, subsystem API files won't have the section header, and audit-architecture Step 3b will find nothing. Fix: add a task to update the `<subsystem>-api.md` template to include `## Fitness Functions` after Dependencies.
*Flagged by: Software Architecture*
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 2 graceful stop (Step 8e) does not cover interruption during new Steps 8f/8g/8h**
Steps 8f/8g/8h create new artifacts (maturity table, `invariants.md`, fitness candidates) after architecture writing. If the user stops during these steps, the existing graceful stop cases don't capture partial maturity/invariant state. Phase 2 should add a task to update Step 8e with cases for interruption during 8f/8g/8h, noting which steps completed. This mirrors how Phase 3 correctly adds graceful stop cases for audit-architecture's new steps.
*Flagged by: Agent Skill*
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Phase 2 Step 8f references "Step 8e" incorrectly**
Step 8f says "After architecture files are written (Step 8e)" but Step 8e is the graceful stop handler, not the last writing step. Should say "After all architecture files are written (Steps 8b-8d)."
*Flagged by: Holistic*
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 3 audit-architecture Step 3c lacks graceful handling for missing invariants.md**
Step 3c says "Read `architecture/invariants.md` (if exists)" but no explicit else branch. The graceful stop marker tracks "[list of invariants checked]" — an empty list from a missing file needs explicit handling (e.g., "no invariants.md found — skipping compliance check").
*Flagged by: Holistic*
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 3 Step 3d does not reference decisions-format.md**
Step 3d says "write a decision record" but doesn't reference the format, unlike other skills (e.g., define-architecture Step 4) that explicitly reference `decisions-format.md`. The format is in context (loaded in Step 1), but should be explicitly referenced for consistency.
*Flagged by: Software Architecture*
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 3 refine-architecture context loading insertion point is ambiguous**
Plan says insert maturity-conventions.md load "after sub-step 1, before sub-step 3" but doesn't clarify whether it becomes new sub-step 2 (shifting current 2 to 3) or goes between current 2 and 3. Specify: insert between current sub-step 2 (Load decisions) and current sub-step 3 (Prerequisite check).
*Flagged by: Agent Skill*
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 2 Step 8g architecture directory existence note lacks reference**
The note "The `architecture/` directory already exists at this point" is correct but doesn't reference why. Add: "(created during Step 8b)."
*Flagged by: Agent Skill*
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 9 issues (I1-I4, M1-M5) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**implement-plan shared-preamble severity**: Holistic and Agent Skill flagged as IMPORTANT; Software Architecture flagged as MINOR. Resolved to IMPORTANT — the Holistic reviewer provided the strongest rationale (inconsistent invariant compliance checking across skills is a workflow gap, not a cosmetic issue), and Agent Skill's domain expertise on skill interaction patterns supports IMPORTANT severity.

## Unresolved (USER_INPUT required)

None.
