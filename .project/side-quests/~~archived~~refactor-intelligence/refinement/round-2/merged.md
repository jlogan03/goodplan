# Merged Feedback — Refactor Intelligence (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

None.

## MINOR Issues

**[MINOR-1]** Graceful stop case (d2) idempotency claim is inaccurate — fix the justification

Raised by: holistic, agent-skill (same issue; agent-skill is more precise — defer to it).

The plan states "already-applied inline fixes are idempotent," but inline refactors (extract function, consolidate duplicates) are not inherently idempotent — applying the same extraction twice could fail or produce unexpected results. The recovery is still correct, but for the wrong reason. Replace the idempotency claim with the accurate justification: "re-running detection on the updated codebase will not re-surface already-applied fixes, because the codebase has already changed." Additionally, the verification section should include a (d2) trace-through: if stopped mid-inline-fix, confirm that re-running Step 9 detection on partially-modified code either re-detects the issue correctly or skips it harmlessly.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** Pre-implementation commit timestamp correlation needs two edge cases specified

Raised by: holistic, software-architecture (overlapping; software-architecture is more precise).

The plan specifies `git log --after=<ts-1min> --before=<ts>` but doesn't handle: (a) no commits found in the window — should explicitly fall back to skipping git diff analysis (consistent with the "no flow-log entry" behavior); (b) multiple commits returned — should specify "take the latest commit returned" as the tiebreaker. Additionally, note that `git log --after/--before` uses author dates by default, which may differ from committer dates in rebase workflows, making this a best-effort heuristic (which is acceptable given the skip-if-unavailable fallback).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Step 9 responsibility boundary expansion is undocumented

Raised by: software-architecture.

The existing `/complete` skill writes exclusively to `.project/` state files. Adding code-editing in Step 9 is a deliberate architectural choice, but the plan doesn't acknowledge or justify it. A future implementer may not realize the boundary was intentionally crossed. Add a brief note in the plan overview: "Step 9 inline fixes are a scoped exception to `/complete`'s read-only-code pattern, justified by the low friction of small contained changes."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4]** Side quest `goal.md` approval step lacks AskUserQuestion format specification

Raised by: agent-skill.

The action handling for side quests says "Draft a `goal.md` and present it for approval" but doesn't specify the question text or options. For consistency with the batch table (which has a fully specified AskUserQuestion invocation), specify: AskUserQuestion with the draft content and options "Approve and create / Edit first / Skip".

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

All 4 minor issues are directly actionable. No research or user input required.

1. MINOR-1: Fix (d2) idempotency justification + add verification trace-through
2. MINOR-2: Specify timestamp window fallback (no commits) and tiebreaker (multiple commits); note best-effort heuristic
3. MINOR-3: Add one-sentence architectural justification for Step 9 code-editing in plan overview
4. MINOR-4: Specify AskUserQuestion format for side quest `goal.md` approval

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**holistic vs agent-skill on MINOR-1 (d2 idempotency):** holistic frames it as an unverified claim needing a verification trace-through; agent-skill frames it as a technically inaccurate justification. Both are correct and complementary. Resolution: fix the justification (agent-skill framing) AND add the verification trace-through (holistic framing). Both incorporated into MINOR-1.

**holistic vs software-architecture on MINOR-2 (timestamp correlation):** holistic focuses on the missing fallback for no-commits-found; software-architecture adds the multi-commit tiebreaker and author-date caveat. No contradiction — additive. Merged into MINOR-2.

## Unresolved (USER_INPUT required)

None.
