# Phase 4: Plan Refinement Reviewer Updates

Update reviewer prompts to check plans against invariants and maturity context.

### Tasks

- [ ] **Update Software Architecture reviewer** (`~/.claude/skills/_shared/references/reviewers-cross-cutting.md`, section `## Software Architecture Reviewer`): Add two evaluation criteria:
  - **12. Maturity awareness**: If the plan modifies a maturing or foundational subsystem, check: is there justification for the change? Is there a migration plan for dependents? Are fitness function updates included in the plan? Are existing fitness functions preserved or explicitly replaced? Flag plans that casually modify foundational subsystems without addressing these questions.
  - Add to Codebase Exploration Focus: "Maturity table in `architecture/_overview.md` under `## Subsystem Maturity` — check maturity levels of subsystems the plan touches. Read `architecture/invariants.md` if it exists."

- [ ] **Update Holistic reviewer** (`~/.claude/skills/refine-plan/references/reviewers-always.md`, section `## Holistic Reviewer`): Add two evaluation criteria:
  - **Invariant compliance**: If `architecture/invariants.md` exists, load it. Check that the plan doesn't violate any documented invariant. If the plan must amend an invariant (e.g., changing a performance constraint), flag it as requiring explicit justification and an invariant update step in the plan.
  - **Fitness function awareness**: If the plan changes a subsystem with documented fitness functions (visible in the maturity table's "Fitness Functions" column), check that the plan includes steps to update or verify those tests.
  - Add to Codebase Exploration Focus: "`architecture/invariants.md` — documented system constraints that plans must respect."

- [ ] **Update shared preamble** (`~/.claude/skills/refine-plan/references/shared-preamble.md`): In the Codebase Exploration section, add: "If `architecture/invariants.md` exists, read it — plans must not violate documented system invariants without explicit justification and an amendment step."

### Verification

- Read all updated reviewer files. Confirm:
  - SW Architecture reviewer has maturity awareness as evaluation criterion 12
  - SW Architecture reviewer's Codebase Exploration Focus includes maturity table and invariants
  - Holistic reviewer has invariant compliance and fitness function awareness criteria
  - Holistic reviewer's Codebase Exploration Focus includes invariants.md
  - Shared preamble mentions invariants.md in Codebase Exploration
  - No existing evaluation criteria removed or weakened — all additions are new numbered criteria or new exploration focus items
- Verify the same reviewer files are also used by `/refine-slices` and `/implement-plan` — the updates automatically apply to those skills too (shared files)
