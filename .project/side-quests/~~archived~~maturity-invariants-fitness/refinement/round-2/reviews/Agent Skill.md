# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** Phase 2 does not update define-architecture's graceful stop (Step 8e) to handle interruption during new Steps 8f/8g/8h
The existing Step 8e graceful stop in `define-architecture/SKILL.md` handles interruption during architecture writing with a case for "One or more architecture files written." Steps 8f/8g/8h create new artifacts (maturity table in `_overview.md`, `invariants.md`, fitness candidates in `<subsystem>-api.md`) after architecture writing is complete. If the user says "stop" during 8f/8g/8h, the existing graceful stop cases do not cover this — the "One or more architecture files written" case would trigger but would not capture partial maturity/invariant state. Phase 2 should add a task: update Step 8e graceful stop to include a case for interruption during Steps 8f/8g/8h. The marker should note which of the three steps completed (e.g., "stopped after writing maturity table, invariants not yet created"). This is analogous to how Phase 3 correctly adds graceful stop cases for audit-architecture's new steps.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 does not address implement-plan's independent shared-preamble.md for invariant checking
The Phase 4 verification section correctly identifies that `implement-plan` has its own independent copy of `shared-preamble.md` at `~/.claude/skills/implement-plan/references/shared-preamble.md`, and that changes to refine-plan's copy do not propagate. However, the plan only notes this as a verification observation ("if implement-plan should also check invariants, its `shared-preamble.md` needs a separate update") without making a decision. During implementation, an implementer will discover this gap and not know whether to update implement-plan's copy or not. The plan should either: (a) add a Phase 4 task to update implement-plan's shared-preamble.md with the same invariants.md exploration directive, or (b) explicitly state this is out of scope with rationale (e.g., "implement-plan reviewers focus on implementation correctness, not architectural constraint compliance — invariant checking during implementation is handled by the code itself").
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 refine-architecture context loading specifies insertion "after sub-step 1, before sub-step 3" but Step 0 sub-steps are numbered 1-6, not named
The plan says to insert the maturity-conventions.md load "after sub-step 1 (read architecture files) and before sub-step 3 (prerequisite check)." Looking at the actual SKILL.md, Step 0's sub-steps are numbered 1-6, and sub-step 2 is "Load decisions." The plan's insertion point (between 1 and 3, skipping 2) is correct — loading maturity conventions after reading architecture files and before the prerequisite check makes sense. However, the plan says "insert after sub-step 1... and before sub-step 3" which implies it goes between 1 and 3, creating ambiguity about whether it becomes the new sub-step 2 (shifting current 2 to 3, etc.) or is inserted as sub-step 2b between 2 and 3. Specify: insert as a new sub-step between current sub-step 2 (Load decisions) and current sub-step 3 (Prerequisite check), since maturity conventions inform the prerequisite check but don't depend on decision loading.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Step 8g invariants creation says "The `architecture/` directory already exists at this point" but should reference the mkdir in Step 8b
The plan's note about the architecture directory already existing is correct in practice (Step 8b runs `mkdir -p .project/architecture/` before writing files). However, the note parenthetically states this as fact without referencing why. For an implementer reading Phase 2 in isolation, this could cause confusion if they try to implement Step 8g without reading the full SKILL.md. Add a brief reference: "The `architecture/` directory already exists at this point (created during Step 8b)." This was flagged as a minor cleanup in round 1 (issue #11 about redundant mkdir) and the fix addresses the redundancy but could be clearer about the dependency.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 issues (2 CRITICAL, 3 IMPORTANT, 3 MINOR) have been correctly addressed. The step numbering collision is resolved with 8f/8g/8h, the CLAUDE.md sequencing is fixed, fitness function canonical location is pinned down, finding categories are defined, editor guardrails are added, graceful stop markers are specified, and the conflict resolution table is updated. The remaining issues are: one IMPORTANT gap in define-architecture's graceful stop handling for the new steps (symmetry with the audit-architecture graceful stop addition that was correctly done), one IMPORTANT decision gap about implement-plan's shared-preamble, and two MINOR clarity items. To reach 9+: add the define-architecture graceful stop case for 8f/8g/8h interruption, and make a decision on implement-plan's shared-preamble.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
