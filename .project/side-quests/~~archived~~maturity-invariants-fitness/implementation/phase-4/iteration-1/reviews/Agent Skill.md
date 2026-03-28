# Agent Skill Review: Phase 04 (Plan Refinement Reviewer Updates)

## Issues

**[MINOR]** Holistic reviewer criteria 12 and 13 reference maturity table but don't specify where to find it
The new criteria 12 (Invariant compliance) and 13 (Fitness function awareness) in the Holistic reviewer correctly instruct loading `architecture/invariants.md`, and criterion 13 references the maturity table's "Fitness Functions" column. However, the Holistic reviewer's Codebase Exploration Focus section only adds `architecture/invariants.md` — it does not mention reading the maturity table in `architecture/_overview.md`. The Software Architecture reviewer's Codebase Exploration Focus does include it ("Maturity table in `architecture/_overview.md` under `## Subsystem Maturity`"), but the Holistic reviewer does not. Criterion 13 asks the reviewer to check the maturity table's "Fitness Functions" column without directing it to load `_overview.md` in the exploration phase. In practice, many reviewer contexts will already have `_overview.md` loaded (refine-architecture loads all architecture files in Step 0), but for plan review contexts this may not be the case.
File: ~/.claude/skills/refine-plan/references/reviewers-always.md:23
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Implement-plan shared preamble uses stronger language than refine-plan's — intentional but undocumented
The refine-plan shared preamble says: "must not violate documented system invariants without explicit justification and an amendment step." The implement-plan shared preamble says: "must not violate documented system invariants — flag violations as CRITICAL with a note to discuss invariant amendment if the violation is intentional." The escalation to CRITICAL for implementation (vs. no severity specified for plan review) makes sense — violations in code are more urgent than in plans — but this intentional difference is not called out anywhere. A brief inline comment explaining the severity difference would help future maintainers understand it's deliberate, not accidental drift between the two copies.
File: ~/.claude/skills/implement-plan/references/shared-preamble.md:34
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Software Architecture reviewer criterion 12 — "document under review" phrasing slightly ambiguous in implementation context
Criterion 12 (Maturity awareness) uses "the document under review" which is natural for plan/architecture review but slightly awkward in the implement-plan context where the reviewer evaluates a code diff, not a document. The implement-plan reviewer registry sets `{review_context}` to "a code implementation" — the criterion should work with both review contexts. The current phrasing says "If the document under review modifies a developing, maturing, or foundational subsystem" which maps well enough to code changes, but "code under review" would be more precise in the implementation context. This is cosmetic and low-priority since the reviewer prompt is shared across both contexts and must serve both.
File: ~/.claude/skills/_shared/references/reviewers-cross-cutting.md:109
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation correctly follows the plan's four tasks: Software Architecture reviewer gets criterion 12 and a Codebase Exploration Focus addition; Holistic reviewer gets criteria 12 and 13 plus a Codebase Exploration Focus addition; both shared preambles get invariants.md guidance in their Codebase Exploration sections. The new criteria are well-written — they specify when to check (conditional on file existence), what to check (invariant violations, fitness function preservation), and escalating scrutiny by maturity level. The wording is consistent with the existing criteria style (imperative, conditional, with specific guidance). The shared preamble additions are appropriately differentiated between plan review (justification-oriented) and implementation review (CRITICAL-flag-oriented). The only gap preventing a 10 is the missing `_overview.md` exploration directive for the Holistic reviewer, which could cause criterion 13 to lack the data it needs in some contexts.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
