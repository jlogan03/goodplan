# Software Architecture Review — Refactor Intelligence Plan (Round 2)

## Issues

**[MINOR]** Inline fix application still expands `/complete`'s responsibility boundary without acknowledging the tradeoff

The round 1 review noted that applying code changes during Step 9 blurs the line between `/complete` (reflection) and `/implement-plan` (implementation). The updated plan addresses the symptom by capping at 5 fixes and overflowing to a side quest, which is good. However, the plan doesn't acknowledge or justify this responsibility expansion anywhere. The existing `/complete` skill writes exclusively to `.project/` state files — adding code-editing to Step 9 is a deliberate architectural choice that should be documented as such (e.g., a brief note in the plan overview: "Step 9 inline fixes are a scoped exception to `/complete`'s read-only-code pattern, justified by the low friction of small contained changes"). Without this, a future implementer or reviewer may not realize the boundary was intentionally crossed. This is minor because the cap at 5 and the single-file/module constraint adequately bound the risk.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Pre-implementation commit detection timestamp correlation has a precision gap

The plan specifies: "correlate `ts` with `git log --after=<ts-1min> --before=<ts> --format=%H` to find the closest commit before implementation." The `--after` window subtracts 1 minute from the flow-log timestamp, but flow-log timestamps are second-precision (`YYYY-MM-DDTHH:mm:ssZ`) and `implement-plan` completion could happen within seconds of a commit. If the completion entry's `ts` is very close to the commit time, the 1-minute window could return multiple commits or miss the target. More importantly, the plan doesn't specify what to do when multiple commits are returned by this query — take the latest? The earliest? Additionally, `git log --after/--before` uses commit author dates by default, which may differ from committer dates in rebase workflows. Consider: (a) specify "take the latest commit returned" as the tiebreaker, and (b) note that this is a best-effort heuristic (which it is, given the skip-if-unavailable fallback).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The round 1 issues have been thoroughly addressed. The Step 6c deduplication mechanism is now explicit. The graceful stop case (d2) properly covers mid-Step-9 interruption. The inline fix cap at 5 with overflow to side quest is well-designed. The AskUserQuestion format is fully specified with multiSelect. The pre-implementation commit detection is much improved by dropping the vague heuristic in favor of flow-log timestamp correlation with a clean skip fallback. The two remaining minors are about documentation of an intentional design choice and edge-case precision — neither affects correctness. To reach 9+: add the one-sentence justification for the responsibility boundary expansion and specify the multi-commit tiebreaker.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
