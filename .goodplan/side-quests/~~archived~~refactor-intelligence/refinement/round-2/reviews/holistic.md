# Holistic Review — Refactor Intelligence (Round 2)

## Issues

**[MINOR]** Graceful stop case (d2) recovery claim of idempotency is asserted but not verified in the plan

The new graceful stop case (d2) states "already-applied inline fixes are idempotent." This is a reasonable assumption for most refactors (extract function, rename, remove dead code) but not universally true — e.g., if an inline fix consolidates duplicates by deleting one copy and updating references, re-running detection would no longer find that duplicate, so the fix wouldn't be re-applied (which is fine). However, if an inline fix was partially applied (file written but verification not run), re-running Step 9 would re-detect the issue but attempt to apply it to already-modified code. The verification section should include a trace-through of the (d2) recovery path: "If stopped mid-inline-fix, confirm that re-running Step 9 detection on partially-modified code either re-detects the issue correctly or skips it harmlessly."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Pre-implementation commit detection timestamp correlation window is arbitrary

The revised plan specifies `git log --after=<ts-1min> --before=<ts>` to find the closest commit before implementation. The 1-minute window is reasonable but arbitrary — if no commit falls in that window (e.g., the implement-plan flow-log entry timestamp doesn't closely align with a commit), the detection silently produces no result. The plan should specify what happens when the timestamp correlation yields no commits: fall back to skipping git diff analysis (consistent with the "no flow-log entry" behavior). This is likely the intended behavior but should be explicit.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All IMPORTANT and MINOR issues from round 1 were correctly addressed. The pre-implementation commit detection was simplified (option b from merged.md, with a well-specified timestamp correlation). Graceful stop has proper coverage with case (d2). The inline fix cap, deduplication step, AskUserQuestion format, changed-files derivation, skip-all handling, plan deviations cross-reference, section placement, and behavioral verification were all incorporated cleanly. The two remaining MINOR issues are edge cases in the new content — neither affects the plan's ability to achieve its goal.

To reach 10: explicitly handle the "no commits found in timestamp window" edge case, and add a (d2) recovery trace-through to verification.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
