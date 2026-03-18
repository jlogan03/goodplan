# Phase 3: `/refine-architecture` and `/audit-architecture` Updates

Update both skills to work with maturity, invariants, and fitness functions. These are independent changes within this phase.

### Tasks

**refine-architecture:**

- [ ] **Add maturity context loading**: In the workflow's context-loading step, add: "Read `~/.claude/skills/_shared/references/maturity-conventions.md` for maturity level definitions and promotion criteria." The maturity table itself is already in `_overview.md` which is loaded by default.

- [ ] **Update `references/guidance.md`** (refine-architecture's): Add a "Maturity Evaluation" section. During review, the Software Architecture reviewer should: (a) check if maturity levels are appropriate given evidence (dependents, stability, fitness functions), (b) propose promotions with justification when evidence supports it, (c) propose demotions when subsystems have regressed, (d) flag subsystems that claim high maturity but lack fitness functions. Include specific evaluation questions the reviewer should ask per maturity level.

- [ ] **Update reviewer registry** (`references/reviewer-registry.md`): Add a note that the Software Architecture reviewer should evaluate maturity levels as part of its standard review. No new reviewer needed — maturity evaluation fits within existing scope.

**audit-architecture:**

- [ ] **Add Step 3b — Fitness Function Audit**: After architecture reassessment (Step 3), add a step: for each subsystem with documented fitness functions, (a) check if the test file exists at the documented path, (b) if it exists, read it and verify it tests the documented property (heuristic — check test names, assertions, imports), (c) report: documented-and-present, documented-but-missing, test-exists-but-subsystem-changed (stale). Present findings grouped by status.

- [ ] **Add Step 3c — Invariant Compliance Check**: Read `architecture/invariants.md` (if exists). For each invariant, use codebase exploration (Grep/Read) to spot-check compliance. This is heuristic, not exhaustive — look for obvious violations. Examples: if invariant says "no direct DB queries outside repository layer", grep for raw SQL outside the repository directory. If invariant says "all user-facing errors include actionable message", check error handling patterns in API handlers. Present findings with evidence (specific files/lines).

- [ ] **Add Step 3d — Maturity Promotion Suggestions**: Based on all findings (gap analysis, reassessment, fitness audit, invariant check), suggest maturity changes where evidence supports: (a) promotions — subsystem stable over recent slices, fitness functions in place, multiple dependents, (b) demotions — subsystem has new gaps, broken fitness functions, reduced confidence. Present as recommendations with evidence — user decides. If approved, update the maturity table in `_overview.md` and write a decision record.

- [ ] **Update `references/guidance.md`** (audit-architecture's): Add sections for: (a) fitness function audit strategy — how to verify tests match documented properties, (b) invariant compliance checking approach — heuristic spot-checking, what to grep for per invariant type, (c) maturity promotion/demotion criteria — what constitutes sufficient evidence.

- [ ] **Update graceful stop cases** in audit-architecture SKILL.md: Add handling for interruption during Steps 3b/3c/3d. If stopped during fitness function audit, note which subsystems were checked. If stopped during invariant check, note which invariants were checked.

### Verification

- Read all updated files. Confirm:
  - refine-architecture loads maturity conventions and guidance has evaluation criteria
  - audit-architecture has Steps 3b/3c/3d with clear instructions
  - audit-architecture guidance documents fitness function audit, invariant compliance, and maturity promotion strategies
  - Graceful stop cases cover new steps
  - No existing behavior changed in either skill — all additions are new steps
