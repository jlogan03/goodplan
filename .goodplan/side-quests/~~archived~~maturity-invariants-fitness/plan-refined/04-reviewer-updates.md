# Phase 4: Plan Refinement Reviewer Updates

Update reviewer prompts to check plans against invariants and maturity context.

### Tasks

- [x] **Update Software Architecture reviewer** (`~/.claude/skills/_shared/references/reviewers-cross-cutting.md`, section `## Software Architecture Reviewer`): Add two evaluation criteria:
  - **12. Maturity awareness**: If the document under review modifies a developing, maturing, or foundational subsystem, check: is there justification for the change? Is there a migration plan for dependents? Are fitness function updates included? Are existing fitness functions preserved or explicitly replaced? Apply escalating scrutiny: light check for Developing (deliberate changes encouraged), full justification required for Maturing and Foundational. Flag documents that casually modify maturing or foundational subsystems without addressing these questions.
  - Add to Codebase Exploration Focus: "Maturity table in `architecture/_overview.md` under `## Subsystem Maturity` — check maturity levels of subsystems the document under review touches. Read `architecture/invariants.md` if it exists."

- [x] **Update Holistic reviewer** (`~/.claude/skills/refine-plan/references/reviewers-always.md`, section `## Holistic Reviewer`): Add two evaluation criteria:
  - **12. Invariant compliance**: If `architecture/invariants.md` exists, load it. When reviewing a plan: check that the plan doesn't violate any documented invariant; if the plan must amend an invariant (e.g., changing a performance constraint), flag it as requiring explicit justification and an invariant update step. When reviewing architecture: check that proposed architecture changes don't contradict documented invariants; flag any invariant that needs amendment.
  - **13. Fitness function awareness**: If the document under review changes a subsystem with documented fitness functions (visible in the maturity table's "Fitness Functions" column): when reviewing a plan, check that it includes steps to update or verify those tests; when reviewing architecture, check that proposed changes preserve or explicitly replace existing fitness functions.
  - Add to Codebase Exploration Focus: "`architecture/invariants.md` — documented system constraints that the document under review must respect."

- [x] **Update shared preamble** (`~/.claude/skills/refine-plan/references/shared-preamble.md`): In the Codebase Exploration section, add: "If `architecture/invariants.md` exists, read it — the document under review must not violate documented system invariants without explicit justification and an amendment step."

- [x] **Update implement-plan's shared preamble** (`~/.claude/skills/implement-plan/references/shared-preamble.md`): This is an independent copy — changes to refine-plan's shared-preamble do NOT propagate here. Add the same invariants.md guidance to its Codebase Exploration section: "If `architecture/invariants.md` exists, read it — implementation must not violate documented system invariants — flag violations as CRITICAL with a note to discuss invariant amendment if the violation is intentional." This ensures the Holistic reviewer checks invariant compliance during implementation, not just plan refinement.

### Verification

- Read all updated reviewer files. Confirm:
  - SW Architecture reviewer has maturity awareness as evaluation criterion 12
  - SW Architecture reviewer's Codebase Exploration Focus includes maturity table and invariants
  - Holistic reviewer has invariant compliance and fitness function awareness criteria
  - Holistic reviewer's Codebase Exploration Focus includes invariants.md
  - Shared preamble mentions invariants.md in Codebase Exploration
  - No existing evaluation criteria removed or weakened — all additions are new numbered criteria or new exploration focus items
- Verify the same reviewer files are also used by `/refine-slices` and `/implement-plan`:
  - `reviewers-cross-cutting.md` changes automatically apply to `refine-plan`, `refine-slices`, `implement-plan`, and `refine-architecture` (all four use it)
  - `reviewers-always.md` changes only affect `refine-plan` (no blast radius to other skills)
  - `shared-preamble.md` changes affect `refine-plan` and `refine-slices` but NOT `implement-plan` (which has its own independent copy — updated separately above)
  - Verify implement-plan's `shared-preamble.md` includes invariants.md guidance matching refine-plan's
