# Agent Skill Review — Refactor Intelligence

## Issues

**[IMPORTANT]** Step 9 in SKILL.md lacks iteration limit for inline fix application
The plan says "apply the fix immediately (scope it, make the change, verify)" for selected inline fixes, but doesn't specify a cap on how many inline fixes the agent can apply in one session. If the detection algorithm surfaces 10+ inline fixes and the user selects all, the agent could run a very long sequence of code changes without a progress checkpoint. The existing skill pattern (e.g., implementation max 5 iterations per phase) suggests adding a limit — e.g., "apply up to 5 inline fixes per session; if more are selected, batch the remainder as a side quest."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Pre-implementation commit detection is fragile and under-specified
The plan describes finding the pre-implementation commit via flow-log entries, with a fallback to `git log --oneline -10` and "identify the likely pre-implementation boundary." This is ambiguous enough that an LLM will guess incorrectly in many cases. The flow-log path is solid, but the fallback gives no concrete heuristic — what makes a commit "likely" the boundary? Without a deterministic rule, the agent will either pick wrong or skip entirely. The plan should either: (a) specify a concrete heuristic for the fallback (e.g., "find the most recent commit whose message contains 'plan-refined' or 'refinement complete' for the current scope"), or (b) skip git diff analysis entirely when no flow-log entry exists (simpler, and the other three detection sources still provide coverage).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Guidance.md section placement not specified relative to existing sections
The plan says "New section after the Debt Evaluation Protocol" but guidance.md has sections after Debt Evaluation Protocol already (Signal Tracking Algorithm, Archive Convention, Re-entry, Initiative Completion Protocol, etc.). "After" is ambiguous — does it mean immediately after Debt Evaluation Protocol, or at the end of the file? Given the logical flow (Step 6c = Debt Evaluation, Step 9 = Refactor Intelligence), the section should be placed to mirror the step ordering. Specify: "Add the Refactor Intelligence Protocol section after the Signal Tracking Algorithm section (which corresponds to Step 6d), since Step 9 follows Step 6d in the skill flow."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Detection algorithm step 2 (git diff) uses `<pre-implementation-commit>...HEAD` — should be `<changed-files>` scoped to the slice
The plan includes `-- <changed-files>` in the git diff command, which is correct, but doesn't explain how to derive `<changed-files>`. The agent needs to know: use the file paths from `plan-refined.md` task descriptions, or from `implementation/` result files, or from the git diff itself (without `-- <changed-files>` first, then narrow). Clarify the source of the changed-files list.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit mention of what happens when detection finds opportunities but user selects nothing
The plan says "Include 'Skip all' as a natural option (selecting nothing)" under presentation format, but the action handling section only covers "selected inline fixes" and "selected side quests." Add an explicit "If user selects nothing (skip all): proceed silently to the next step" to match the silent-skip pattern for zero findings.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan deviations detection source (step 4) overlaps with plan-learnings-and-feedback.md
`plan-learnings-and-feedback.md` already captures plan-vs-reality deviations from the refinement process. The "Plan deviations" detection source asks the agent to "Compare `plan-refined.md` tasks against actual implementation" — which is partially what `plan-learnings-and-feedback.md` already contains. The plan should note: "Cross-reference `plan-learnings-and-feedback.md` first for already-identified deviations before running a fresh comparison, to avoid surfacing issues already acknowledged."
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan correctly identifies what to change (SKILL.md Step 9 and guidance.md), preserves initiative scope behavior, and the detection algorithm is thoughtfully structured with four distinct signal sources. The batch-table-plus-multiSelect UX is well-designed for the "usually nothing to report" common case. However, the pre-implementation commit fallback is too vague for reliable agent execution, inline fix application lacks a safety limit, and the guidance.md placement is ambiguous. Fixing the three IMPORTANT issues and the three MINOR clarifications would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
