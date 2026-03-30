# Agent Skill Review — Refactor Intelligence (Round 2)

## Issues

**[MINOR]** Graceful stop case (d2) recovery instruction says "already-applied inline fixes are idempotent" without basis
The plan states that re-running Step 9 after interruption is safe because "already-applied inline fixes are idempotent." This is stated as a fact but inline code refactors (extract function, consolidate duplicates) are not inherently idempotent — applying the same extraction twice could fail or produce unexpected results. The recovery is still correct (re-running detection will simply not re-detect already-fixed items since the codebase changed), but the justification should say "re-running detection on the updated codebase will not re-surface already-applied fixes" rather than claiming idempotency of the fixes themselves.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Side quest goal.md creation flow says "present for approval" but doesn't specify the AskUserQuestion format
The action handling for side quests says "Draft a `goal.md` and present it for approval. Run `mkdir -p` and write `goal.md` only after user approves." Unlike the batch table (which now has a fully specified AskUserQuestion invocation), the per-side-quest approval step doesn't specify the question text or options. For consistency with the rest of the protocol (and with the Debt Evaluation Protocol's explicit option strings), specify: e.g., AskUserQuestion with the draft content and options "Approve and create / Edit first / Skip".
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 issues (3 IMPORTANT, 5 MINOR, 1 CODEBASE_EXPLORATION) have been correctly addressed. The pre-implementation commit detection is now clean (flow-log correlation with timestamp-based git log, skip when unavailable). The graceful stop case (d2) properly covers mid-Step-9 interruption. The inline fix cap at 5 with overflow-to-side-quest matches existing skill patterns. The Step 6c deduplication step prevents overlap. The AskUserQuestion format is fully specified for the batch table. The behavioral trace-through in verification provides concrete scenario coverage. Two minor refinements remain: the idempotency claim in (d2) recovery is technically inaccurate (though the recovery itself is sound), and the side quest approval flow lacks the same AskUserQuestion specificity as the batch table.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
