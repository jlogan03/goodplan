# Phase 3: `/refine-architecture` and `/audit-architecture` Updates

Update both skills to work with maturity, invariants, and fitness functions. These are independent changes within this phase.

### Tasks

**refine-architecture:**

- [ ] **Add maturity context loading**: In Step 0's context-loading sub-steps, insert between current sub-step 2 (Load decisions) and current sub-step 3 (Prerequisite check) as a new sub-step: "Read `~/.claude/skills/_shared/references/maturity-conventions.md` for maturity level definitions and promotion criteria." The maturity table itself is already in `_overview.md` which is loaded by default.

- [ ] **Update `references/guidance.md`** (refine-architecture's): Add a "Maturity Evaluation" section. During review, the Software Architecture reviewer should: (a) check if maturity levels are appropriate given evidence (dependents, stability, fitness functions), (b) propose promotions with justification when evidence supports it, (c) propose demotions when subsystems have regressed, (d) flag subsystems that claim high maturity but lack fitness functions. Include specific evaluation questions the reviewer should ask per maturity level.

- [ ] **Update reviewer registry** (`references/reviewer-registry.md`): Add a note that the Software Architecture reviewer should evaluate maturity levels as part of its standard review. No new reviewer needed — maturity evaluation fits within existing scope.

- [ ] **Update editor guardrails** (`references/sub-agent-prompts.md`): Add maturity-related rules to the editor guardrails section: (a) maturity level changes require a concrete annotation in the edit summary using the format: "MATURITY CHANGE: {subsystem} from {old} to {new} — justification: {evidence}", (b) fitness function entries must follow `maturity-conventions.md` format (full entries in `<subsystem>-api.md`, summary pointers in maturity table), (c) invariant changes (additions, amendments, retirements) require user confirmation before applying.

- [ ] **Update conflict resolution table** (`references/guidance.md`): Add a row for maturity assessment disagreements: "Maturity assessment | Trust Software Architecture reviewer for structural evidence, USER_INPUT for business-context promotions."

**audit-architecture:**

- [ ] **Add Step 3b — Fitness Function Audit**: After architecture reassessment (Step 3), add a step: for each subsystem with documented fitness functions, (a) check if the test file exists at the documented path, (b) if it exists, read it and verify it tests the documented property (heuristic — check test names, assertions, imports), (c) report: documented-and-present, documented-but-missing, test-exists-but-subsystem-changed (stale). Present findings grouped by status.

- [ ] **Add Step 3c — Invariant Compliance Check**: Read `architecture/invariants.md` (if exists; if missing, log "no invariants.md found — skipping compliance check" and proceed to Step 3d). For each invariant, use codebase exploration (Grep/Read) to spot-check compliance. This is heuristic, not exhaustive — look for obvious violations. Examples: if invariant says "no direct DB queries outside repository layer", grep for raw SQL outside the repository directory. If invariant says "all user-facing errors include actionable message", check error handling patterns in API handlers. Present findings with evidence (specific files/lines).

- [ ] **Add Step 3d — Maturity Promotion Suggestions**: Based on all findings (gap analysis, reassessment, fitness audit, invariant check), suggest maturity changes where evidence supports: (a) promotions — subsystem stable over recent slices, fitness functions in place, multiple dependents, (b) demotions — subsystem has new gaps, broken fitness functions, reduced confidence. Present as recommendations with evidence — user decides. If approved, update the maturity table in `_overview.md` and write a decision record (using the format from `decisions-format.md`).

- [ ] **Update `references/guidance.md`** (audit-architecture's): Add sections for: (a) fitness function audit strategy — how to verify tests match documented properties, (b) invariant compliance checking approach — heuristic spot-checking, what to grep for per invariant type, (c) maturity promotion/demotion criteria — what constitutes sufficient evidence. Also define four new finding categories with severity mapping and template format: stale-fitness-function (maps to gap quest), missing-fitness-function (maps to improvement quest), invariant-violation (maps to gap quest), invariant-amendment-needed (maps to improvement quest). Each category should have a template matching the existing gap/improvement quest format in `guidance.md`.

- [ ] **Update graceful stop cases** in audit-architecture SKILL.md: Add handling for interruption during Steps 3b/3c/3d. Insert between existing Step 3 and Step 4 cases in the graceful stop section. Use the existing `<!-- partial — interrupted during ... -->` marker pattern:
  - Step 3b: `<!-- partial — interrupted during fitness function audit — checked: [list of subsystems checked] -->`
  - Step 3c: `<!-- partial — interrupted during invariant compliance check — checked: [list of invariants checked] -->`
  - Step 3d: `<!-- partial — interrupted during maturity promotion review — completed: [list of subsystems evaluated] -->`

### Verification

- Read all updated files. Confirm:
  - refine-architecture loads maturity conventions (inserted between sub-step 2 and sub-step 3 in Step 0) and guidance has evaluation criteria
  - refine-architecture editor guardrails (`sub-agent-prompts.md`) include maturity change evidence, fitness format, and invariant confirmation rules
  - refine-architecture conflict resolution table includes maturity assessment row
  - audit-architecture has Steps 3b/3c/3d with clear instructions
  - audit-architecture guidance documents fitness function audit, invariant compliance, and maturity promotion strategies
  - Graceful stop cases cover new steps
  - No existing behavior changed in either skill — all additions are new steps
