# Software Architecture Review

**Score: 9/10**

## Round 1 Fix Verification

All 9 issues from round 1 are resolved:

- **C3 (decisions/ format):** Fixed. `references/guidance.md` task now specifies filename convention (`<date>-<slug>.md`), required sections, status values, and an example.
- **C1 (architecture-updates.md):** Fixed. Step 6 now writes `completion/architecture-updates.md` summarizing changes made, declined, and flagged as tech debt.
- **I1 (auto-detect):** Partially fixed — see Important #1 below.
- **I4 (conflict warning):** Fixed. Step 6 checks state.md work stack and warns about in-flight conflicts.
- **I5 (idempotency):** Fixed. Step 5 uses `_Source: <slice-name>_` tag as idempotency key with offer to replace.
- **I6 (step ordering):** Fixed. Step 6 includes explicit sub-step to append architecture-related learnings and update the top-level rollup.
- **M4 (large implementation):** Fixed. Step 3 specifies reading only last iteration's merged.md, with clear escalation criteria.
- **M3 (graceful stop):** Fixed. State (b) now specifies exact Current Phase and Next Step values.
- **#9 (re-entry):** Fixed. Step 2.6 handles both full re-entry (learnings exist) and partial re-entry (learnings written, architecture review pending).

## Important Issues

### 1. Auto-detect condition still overly broad

The auto-detect (Step 2.3) scans for "first slice where `implementation/` has content (or `after-implementation-fixes-and-polish.md` exists) but `completion/learnings.md` does not." The disjunction is the problem — a slice mid-implementation has content in `implementation/` but is not ready for completion. Per workflow.md (line 162), the completion-ready state requires `after-implementation-fixes-and-polish.md` to exist.

The parenthetical `(or after-implementation-fixes-and-polish.md exists)` reads as a weaker alternative, but it should be the primary signal. As written, auto-detect could land on a slice that's still being implemented.

**Recommendation:** Tighten to: "scan for first slice where `implementation/` has content or `after-implementation-fixes-and-polish.md` exists, but `completion/learnings.md` does not." Change the logic so `after-implementation-fixes-and-polish.md` is checked first (stronger signal), and `implementation/` having content is the fallback (for cases where QA was skipped or the file hasn't been written yet). Add Step 2.5's verification ("Verify the slice has implementation artifacts") as the safety net — if auto-detect picks a mid-implementation slice, Step 2.5 catches it.

Alternatively, if the intent is to allow completion of slices that haven't gone through QA yet, make that explicit with a note explaining when that's appropriate.

## Minor Issues

### 2. Learnings.md format described in guidance.md but not formats.md

The guidance.md task (line 26) specifies "Learnings.md format: top-level learnings.md uses newest-first ordering, each entry has a source tag linking to the per-slice file." This is a format specification that arguably belongs in `references/formats.md` alongside state.md and flow-log.jsonl formats, since formats.md is where other skills look for output formats. Having the format in guidance.md isn't wrong, but it breaks the convention that formats.md is the single source of truth for file formats.

**Recommendation:** Either move the learnings.md format to formats.md (keeping guidance.md's reference to it), or add a cross-reference in formats.md pointing to guidance.md for the learnings format. Low priority since this skill is the only consumer.

## Summary

The plan has substantially improved from round 1. All critical issues are resolved. The decision file format, architecture-updates.md output, idempotency mechanism, re-entry handling, and graceful stop states are now well-specified. The auto-detect condition remains slightly loose — it could match a mid-implementation slice — but Step 2.5's verification check provides a safety net that mitigates the risk in practice. The plan is ready for implementation with the auto-detect tightening as the one remaining substantive improvement.
