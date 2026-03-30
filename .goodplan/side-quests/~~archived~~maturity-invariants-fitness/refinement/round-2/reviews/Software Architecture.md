# Software Architecture Review — Round 2

## Issues

**[IMPORTANT]** Phase 2 Step 8h adds fitness function candidates to `<subsystem>-api.md` but the `<subsystem>-api.md` template has no `## Fitness Functions` section
Phase 1 establishes that fitness function entries canonically live in a `## Fitness Functions` section of each `<subsystem>-api.md` file. Phase 2 Step 8h says to add candidate entries there. But the `architecture-logic-templates.md` template for `<subsystem>-api.md` (which define-architecture uses to write these files) currently has: Purpose, Interface, Contracts, Dependencies — no Fitness Functions section. Phase 2's task to "Update `references/architecture-logic-templates.md`" only mentions adding a `## Subsystem Maturity` section to the `_overview.md` template. It does not mention adding a `## Fitness Functions` section to the `<subsystem>-api.md` template.

This means Step 8h must retroactively add the section to files already written in Step 8c. This works but is fragile — if someone runs define-architecture and stops before Step 8h, the subsystem API files won't have the section header, and future consumers (audit-architecture Step 3b) searching for `## Fitness Functions` headings will find nothing.

Fix: Add a task in Phase 2 to update the `<subsystem>-api.md` template in `architecture-logic-templates.md` to include a `## Fitness Functions` section (after Dependencies). This way Step 8c writes the section header as part of initial file creation, and Step 8h populates it with candidates. The template section can have a placeholder like `<Identified during Step 8h — leave empty until then>`.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 implement-plan shared-preamble gap acknowledged but no follow-up action specified
Phase 4's verification section (line 30) correctly notes that `implement-plan` has its own independent `shared-preamble.md` copy and that changes to refine-plan's copy won't affect it. The verification says "if implement-plan should also check invariants, its own `shared-preamble.md` needs a separate update." But Phase 4 tasks don't include this update, and there is no explicit decision to defer it.

The design spec (lines 189-190) says: "Implementation: Existing fitness functions must continue to pass... Reviewer sub-agents check that maturing+ subsystem changes match the plan." This implies implement-plan reviewers should also be aware of invariants and fitness functions.

Fix: Either (a) add a task in Phase 4 to update implement-plan's `shared-preamble.md` with the same invariants.md exploration instruction, or (b) add an explicit note that this is deferred to the `maturity-context-loading` side quest (which is listed in goal.md's Out of Scope). Option (b) is preferable since goal.md already scopes this out — just make the deferral explicit in Phase 4's verification section so it's not lost.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 maturity promotion (Step 3d) creates decision records but doesn't specify the decisions format reference
Step 3d says "If approved, update the maturity table in `_overview.md` and write a decision record." But unlike other skills that write decisions (e.g., define-architecture Step 4's "Decision writing" section explicitly references `decisions-format.md`), Step 3d doesn't reference the decisions format. The audit-architecture skill's Step 1 already loads decisions-format.md (sub-step 2), so the format is in context — but the step should explicitly say "using the format from `decisions-format.md`" for clarity and consistency with how other skills reference it.
Resolution: DIRECTLY_ACTIONABLE

---

No other issues found.

## Score: 8/10

All 14 round-1 issues were properly addressed. The step numbering is now clean (8f/8g/8h before Step 9), fitness function location is canonicalized, finding categories are defined, editor guardrails are covered, and graceful stops are complete. The remaining IMPORTANT issue (missing template update for `<subsystem>-api.md`) is a genuine gap — if the template doesn't include the `## Fitness Functions` section, the canonical location convention established in Phase 1 won't be consistently created during Phase 2's file writing. Fixing this and making the two MINOR items explicit would bring the score to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
