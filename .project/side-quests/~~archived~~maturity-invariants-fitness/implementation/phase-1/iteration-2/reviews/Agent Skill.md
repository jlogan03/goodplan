# Agent Skill Review: Phase 01 — Shared Convention File (Iteration 2)

## Fix Verification

All four issues from iteration 1 were correctly addressed:

1. **[IMPORTANT] Consumer Guide missing `/complete`** — Fixed. A "Promotion suggested by" column was added to the Consumer Guide table. Row for maturity table now shows `/complete`, `/audit-architecture`. Matches design spec line 173.

2. **[IMPORTANT] Invariants lifecycle missing initiative architecture proposal requirement** — Fixed. "Amend" bullet now reads: "with justification, captured as a decision record. Initiative architecture proposals must state which invariants they preserve and justify any amendments." Matches design spec line 229.

3. **[MINOR] Demotion triggers don't name which skill surfaces demotion signals** — Fixed. "Who suggests demotions: `/complete` and `/audit-architecture` suggest demotions when they observe the above signals. The user decides." added at line 90.

4. **[MINOR] Invariants lifecycle "Add" scope excludes side-quest-surfaced constraints** — Fixed. Parenthetical "(or when a side quest reveals a cross-cutting constraint)" added to the "Add" lifecycle bullet.

## Issues

**[MINOR]** Demotion "Who suggests" omits the "(for slices and initiatives)" qualifier present in the promotion section

The promotion section (line 81) reads: "Who suggests promotions: `/complete` (for slices and initiatives) and `/audit-architecture`..." — the qualifier "(for slices and initiatives)" clarifies that `/complete` operates at two scopes. The demotion section (line 90) reads: "Who suggests demotions: `/complete` and `/audit-architecture`..." — this qualifier is absent. The omission is minor but inconsistent: a consuming skill reading the demotion section won't know that `/complete` can suggest demotions at both slice completion and initiative completion, not just one.

File: ~/.claude/skills/_shared/references/maturity-conventions.md:90
Resolution: DIRECTLY_ACTIONABLE

---

No other new issues found. The fitness function lifecycle's omission of a "Review" lifecycle step (plan refinement reviewers checking plans against fitness functions) was previously withdrawn as covered by the Consumer Guide "Checked by reviewers" column — that assessment remains valid and unchanged.

## Score: 9/10

All IMPORTANT fixes are correct and faithful to the design spec. The MINOR inconsistency in demotion qualifier phrasing is low-impact and doesn't affect consuming skill behavior. The file is well-structured, spec-accurate, appropriately sized (205 lines), and correctly placed. The Consumer Guide is now complete and the invariants lifecycle correctly surfaces the initiative architecture proposal requirement.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
