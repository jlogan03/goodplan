# Software Architecture Review

Phase: Stale Assumption Detection + Two-Layer Architecture (iteration 2)
Iteration: 2

## Issues

**[MINOR]** Numbered list in create-plan Step 3 skips item 4
The architecture loading steps were consolidated from separate items 3 and 4 into a single unified item 3 — which is the right structural fix for the MINOR issue raised in iteration 1. However the list now reads: 1, 2, 3, 5, 6, 7, 8, 9. Item 4 is missing. This is cosmetic but affects navigability when the SKILL.md is read top-to-bottom by an agent following step numbers.
File: ~/.claude/skills/create-plan/SKILL.md:48
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** stat platform note still present in initiative-conventions.md with no runtime simplification
The iteration 1 review flagged `stat -f %m` (macOS) vs `stat -c %Y` (Linux) as shell-level complexity exposed to the agent. The algorithm in `initiative-conventions.md` still contains both variants with no simplification. This was a MINOR, so not requiring a fix, but noting it carries forward unresolved.
File: ~/.claude/skills/_shared/references/initiative-conventions.md:261
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both IMPORTANT issues from iteration 1 are correctly resolved.

**Issue 1 (algorithm duplication)**: The stale detection algorithm is now canonically defined once in `initiative-conventions.md`. Both `create-plan/SKILL.md` (line 56) and `create-plan/references/guidance.md` (line 53) delegate to it with a single reference line. `refine-plan/SKILL.md` (line 95) does the same. No inline copy of the algorithm exists in any skill file — the duplication is eliminated.

**Issue 2 (redundant conflict checking)**: The `refine-plan/references/shared-preamble.md` (line 45) now explicitly names the orchestrator's prior check: "The orchestrator has already checked for initiative architecture conflicts in Step 2b — if you notice additional conflicts the orchestrator may have missed, note them in your review output for the orchestrator to surface to the user." This is a clean division of labor: the orchestrator is primary, reviewers are supplementary. The prior version gave reviewers an independent mandate with no reference to the orchestrator's pass, creating redundancy and contradictory assessments. The fix is correct.

The MINOR issue from iteration 1 regarding architecture loading step merging was also addressed — items 3 and 4 are now unified into a single scope-dependent step. The only residual is the list numbering gap (1,2,3,5,...) which is cosmetic.

The architecture is sound. The `_shared/references/initiative-conventions.md` is a deep module — it owns the algorithm, the two-layer model description, and the consumer guide in one place. All callers are now shallow wrappers that delegate rather than duplicate.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
