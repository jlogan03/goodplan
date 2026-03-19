# Software Architecture Review — Refactor Intelligence Plan

## Issues

**[IMPORTANT]** Overlap between Step 9 refactor detection and Step 6c debt evaluation is under-specified at the boundary

The plan draws a distinction: Step 6c = architectural debt at subsystem boundaries, Step 9 = code-level refactoring patterns (duplication, divergent patterns, warranted abstractions). The verification section even calls out checking for this. However, the plan does not specify how the detection algorithm avoids surfacing findings that Step 6c already covered in the same completion run. Consider: a duplicated pattern across two modules could be flagged by Step 6c as systemic debt AND by Step 9 as a rule-of-three candidate. The guidance.md protocol should include a deduplication step — e.g., "Skip findings that overlap with debt items already presented in Step 6c" — or at minimum acknowledge that the agent should cross-reference Step 6c results before presenting the Step 9 table. Without this, the user may see the same issue twice with different framing.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Pre-implementation commit detection relies on flow-log entries that may not contain commit hashes

The plan says to "find the most recent `implement-plan` entry for the current scope with `"status":"complete"` and look at the commit before it." However, the flow-log.jsonl format (per `skill-conventions.md`) has required fields `ts`, `phase`, `scope`, `status`, `summary` — no `commit` field. The plan assumes a commit hash is either in the flow-log entry or derivable from it, but doesn't specify how. The fallback (`git log --oneline -10` and "identify the likely pre-implementation boundary") is vague and unreliable for an autonomous agent — what heuristic determines the boundary? This needs either: (a) a concrete specification of how to extract the commit hash (e.g., from the `summary` field, or by correlating the timestamp with `git log --after`), or (b) a more robust fallback than "identify the likely boundary."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Inline fix application during Step 9 adds implementation scope to a completion skill

The plan specifies that for selected inline fixes, the agent should "apply the fix immediately (scope it, make the change, verify)." This means Step 9 of `/complete` — a reflection/synthesis skill — now performs code changes. This is a responsibility expansion. The existing `/complete` skill writes only to `.project/` state files; adding code-editing responsibilities blurs the boundary between `/complete` (reflection) and `/implement-plan` (implementation). The risk is modest for small inline fixes but could escalate — the plan doesn't cap the number or complexity of inline fixes applied in a single Step 9 run. Consider adding a guard: "If more than N inline fixes are selected, recommend a side quest instead of applying them all in Step 9."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Graceful stop coverage for Step 9 is asserted but not verified

The plan's third task says "No changes needed" to graceful stop cases and claims existing case (d) applies. But case (d) covers "system-profile updated, debt evaluation pending" — it was written for the flow from Step 6b to Step 6c. After the Step 9 rewrite, if a user stops mid-way through Step 9 (e.g., after the table is presented but before inline fixes are applied), the state description "debt evaluation pending" is misleading. The graceful stop should either be verified to still be correct (and the assertion documented with reasoning) or a new case should be added for "refactor detection in progress" or "refactor fixes pending." The plan asks implementers to "verify this is still correct" but should specify what to do if it isn't.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear separation from Step 6c, good batch UX design, and correct initiative-scope handling. The main gaps are: (1) the Step 6c/Step 9 boundary needs a concrete deduplication mechanism rather than just a conceptual distinction, (2) the pre-implementation commit detection strategy has an unresolved data dependency, and (3) the responsibility expansion of `/complete` into code editing deserves a complexity guard. Addressing these four issues (two IMPORTANT, two MINOR) would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
