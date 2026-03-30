# Merged Review: Phase 4 — Plan Refinement Reviewer Updates

## Scores
- Generalist: 9/10
- Agent Skill: 9/10

## Issues

### [MINOR-1] Holistic reviewer Codebase Exploration Focus missing `_overview.md` reference
**Source:** Agent Skill (unique)

Criterion 13 (Fitness function awareness) in the Holistic reviewer instructs checking the maturity table's "Fitness Functions" column, but the Holistic reviewer's Codebase Exploration Focus only adds `architecture/invariants.md` — it does not direct loading `architecture/_overview.md` where the maturity table lives. The Software Architecture reviewer's Exploration Focus does include it. In plan review contexts, `_overview.md` may not be pre-loaded, leaving criterion 13 without the data it needs.

File: `~/.claude/skills/refine-plan/references/reviewers-always.md:23`
Resolution: DIRECTLY_ACTIONABLE — add `architecture/_overview.md` (maturity table under `## Subsystem Maturity`) to the Holistic reviewer's Codebase Exploration Focus.

---

### [MINOR-2] Plan blast radius analysis undercounts consumers of `reviewers-cross-cutting.md`
**Source:** Generalist (unique)

The plan's verification section states the `reviewers-cross-cutting.md` changes apply to 3 skills (refine-plan, refine-slices, implement-plan). `refine-architecture` is a fourth consumer. The implementation itself is fine — criterion 12 uses context-agnostic language ("document under review") that works for all consumers — but the plan documentation is inaccurate.

File: `.project/side-quests/maturity-invariants-fitness/plan-refined/04-reviewer-updates.md:30`
Resolution: DIRECTLY_ACTIONABLE — update blast radius count to 4 skills and list refine-architecture.

---

### [MINOR-3] Intentional severity difference between shared preambles is undocumented
**Source:** Agent Skill (unique); Generalist noted the difference is appropriate but did not flag it as an issue.

refine-plan's shared preamble specifies no severity for invariant violations; implement-plan's uses CRITICAL. The escalation is intentional and correct, but no inline comment explains it. Future maintainers may treat the difference as accidental drift.

File: `~/.claude/skills/implement-plan/references/shared-preamble.md:34`
Resolution: DIRECTLY_ACTIONABLE — add a brief inline comment noting the CRITICAL severity is intentional because violations in code are more urgent than in plans.

---

### [MINOR-4] "Document under review" phrasing slightly awkward in implementation context
**Source:** Agent Skill (unique)

Criterion 12 in the SW Architecture reviewer uses "the document under review," which is natural for plan/architecture review but slightly imprecise when implement-plan's reviewer registry sets `{review_context}` to "a code implementation." The phrasing works functionally, but "code or document under review" would be more precise.

File: `~/.claude/skills/_shared/references/reviewers-cross-cutting.md:109`
Resolution: DIRECTLY_ACTIONABLE (low priority) — cosmetic wording tweak only; no functional impact.

---

## Resolved Contradictions / Overlaps

- Both reviewers noted the severity difference between the two shared preambles. Generalist considered it correct and unremarkable; Agent Skill flagged it as a documentation gap. No contradiction — merged as MINOR-3.
- Both reviewers confirmed criterion 12's "document under review" language is context-agnostic enough to work across all 4 consumers. Agent Skill additionally flagged it as cosmetically imprecise in the implement-plan context (MINOR-4). No contradiction.
- Generalist's observation about holistic reviewer numbering ("plan said 'two criteria' without specifying numbers") is not actionable — implementation is correct and no fix is needed. Omitted from merged issues.

## What Was Done Well (Both Reviewers Agreed)

- All 4 plan tasks completed correctly: SW Architecture reviewer gets criterion 12 + exploration focus update; Holistic reviewer gets criteria 12 and 13 + exploration focus update; both shared preambles get invariants.md guidance.
- Existing criteria 1–11 untouched in both reviewer files — changes are purely additive.
- Escalating scrutiny model (light for Developing, full for Maturing/Foundational) correctly mirrors the Change Protocol column in the maturity table.
- Consumer Guide allocations in `maturity-conventions.md` are faithfully reflected: SW Architecture reviewer checks maturity table, Holistic reviewer checks invariants.md.
- refine-plan's shared preamble (also consumed by refine-slices) uses appropriate language for that context.

## Summary
- Critical: 0
- Important: 0
- Minor: 4 (2 unique per reviewer, no duplicates after dedup)
