## Issues

**[IMPORTANT]** Phase 4 does not address implement-plan's invariant awareness gap
Phase 4's verification section correctly identifies that `implement-plan` has its own independent `shared-preamble.md` (at `~/.claude/skills/implement-plan/references/shared-preamble.md`) and that changes to `refine-plan`'s `shared-preamble.md` do NOT propagate to it. The verification notes "if implement-plan should also check invariants, its `shared-preamble.md` needs a separate update" but stops at observation — no task addresses this. During implementation, `implement-plan`'s reviewers will use `reviewers-cross-cutting.md` (which gets the SW Architecture maturity criterion 12), but the Holistic reviewer running inside `implement-plan` will NOT receive the shared-preamble instruction to read `invariants.md`. This means invariant compliance checking (Holistic criterion 12) will be inconsistent: it works during `/refine-plan` and `/refine-slices` but silently skips during `/implement-plan`. The plan should either add a task to update `implement-plan`'s `shared-preamble.md` in Phase 4, or explicitly document the decision to defer this as a known gap.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 Holistic reviewer update references reviewers-always.md but does not account for refine-architecture's separate Holistic usage
The `reviewers-always.md` file is shared by refine-plan (its home skill) and refine-architecture (which loads it via reviewer-registry.md). Phase 4 adds criteria 12 (invariant compliance) and 13 (fitness function awareness) to the Holistic reviewer. These criteria reference plan-specific concepts ("check that the plan doesn't violate...," "check that the plan includes steps to update..."). When this same Holistic reviewer runs during `/refine-architecture`, it evaluates architecture files, not plans. The criteria text needs to be worded generically enough to apply in both contexts — or the criteria should include a note like "When reviewing a plan, check X. When reviewing architecture, check Y." Currently, the plan's task text says "If the plan changes a subsystem..." which will be confusing when the reviewer is evaluating architecture changes, not plan changes.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Step 8f references "Step 8e" but 8e is "Graceful stop" not "architecture writing"
The plan says "After architecture files are written (Step 8e)." Step 8e is actually the graceful stop handler, not the last architecture writing step. The last architecture writing steps are 8b (write files), 8c (subsystem APIs), and 8d (custom files). Step 8f should say "After all architecture files are written (Steps 8b-8d)" — the intent is correct (8f goes after writing, before Step 9) but the reference is inaccurate and could confuse an implementer.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 audit-architecture Step 3c lacks graceful handling for missing invariants.md
Step 3c says "Read `architecture/invariants.md` (if exists)" with a parenthetical, but does not specify what to do if it doesn't exist. Should it skip silently? Log "no invariants.md found — skipping compliance check"? The other new steps (3b, 3d) implicitly handle empty cases (no fitness functions = nothing to audit, no evidence = no promotions), but 3c's "if exists" needs an explicit else branch to avoid implementer confusion, especially since the graceful stop marker for 3c tracks "[list of invariants checked]" — an empty list needs handling.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
All round 1 critical and important issues have been properly addressed. The step numbering collision is resolved (8f/8g/8h), CLAUDE.md sequencing is fixed, finding categories are specified, fitness function location is canonicalized, editor guardrails and conflict resolution are added, graceful stops are complete with markers. Two new important issues emerged from the edits: the implement-plan invariant gap (identified but not acted on) and the Holistic reviewer criteria being plan-specific in wording while the reviewer serves dual duty for architecture review. To reach 9+: add a task for implement-plan's shared-preamble update (or document the deferral), and adjust Holistic criteria wording to be context-agnostic.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
