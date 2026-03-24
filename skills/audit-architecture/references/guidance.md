# Audit Architecture Guidance

Exploration strategy, finding severity levels, and side quest proposal format for the audit-architecture skill.

## Exploration Strategy

### How to Detect Boundary Violations

1. **Import analysis**: For each subsystem boundary documented in architecture, grep for imports that cross it:
   ```
   # Find imports from module A into module B (where architecture says B should not depend on A)
   Grep for import/require paths that reference the other subsystem's internal paths
   ```
2. **Transitive dependencies**: A depends on B depends on C — if architecture says A and C should be independent, the transitive dependency through B is a violation.
3. **Re-exports**: Module re-exporting internals of another module (even if the direct import is "allowed") creates coupling the architecture didn't intend.

### How to Detect Pattern Divergence

1. **Grep for architectural patterns**: If architecture specifies "event-driven communication between X and Y," grep for direct function calls between X and Y.
2. **Check data flow**: If architecture says data flows A → B → C, check for shortcuts (A → C directly).
3. **Look for ad-hoc patterns**: Utility functions, helper modules, or shared state that architecture doesn't describe — these often indicate organic growth that outpaced the architecture.

### How to Assess Module Depth from Code

1. **Count public exports** vs internal implementation files/functions.
2. **Measure caller friction**: How many imports/calls does a typical consumer need to accomplish one task?
3. **Check for "setup ceremonies"**: If callers need to configure, initialize, or pass many options before using a module, it's shallow.
4. **Look at test structure**: Tests that mock many internals suggest a shallow module (deep modules can be tested through their public API).

### How to Detect Missing or Dead Subsystems

- **Missing**: Glob for directories/files not described by any architecture file. Pay attention to `src/`, `lib/`, `app/` — compare directory structure against architecture `_overview.md`.
- **Dead**: For each subsystem described in architecture, verify at least one code file exists that implements it. Empty or stub-only subsystems may be dead (not yet implemented) or truly dead (abandoned).

## Finding Severity Levels

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Structural flaw actively causing problems or blocking progress | Circular dependency between subsystems; core module depends on UI layer; data integrity risk from uncontrolled shared state |
| **IMPORTANT** | Significant drift that will cause problems as codebase grows | Subsystem boundary violated in 5+ places; shallow module with 10+ callers that should be deep; pattern used in code contradicts architecture's stated approach |
| **MINOR** | Drift that's worth noting but not urgent | One-off boundary violation with clear reason; naming mismatch between architecture and code; small utility not described in architecture |
| **INFO** | Observation, not a problem | Code matches architecture well in this area; interesting pattern emerged that architecture could document |

### Severity Assignment Rules

- A single violation is MINOR; a pattern of violations (3+) in the same direction is IMPORTANT.
- Any violation that creates a circular dependency is CRITICAL.
- Dead architecture (describes something that doesn't exist) is MINOR if the feature hasn't been built yet, IMPORTANT if it was built differently.
- Missing subsystems (code exists with no architecture coverage) are IMPORTANT if they have 3+ consumers, MINOR otherwise.

## Fitness Function Audit Strategy

### How to Verify Tests Match Documented Properties

1. **Read the subsystem's `## Fitness Functions` section** for the documented property, test file path, and what the test should verify.
2. **Check file existence**: Use Glob or Read to confirm the test file is at the documented path.
3. **Heuristic content verification** (if file exists):
   - Read the test file
   - Check test names/descriptions — do they reference the documented architectural property?
   - Check assertions — do they test the structural guarantee (e.g., import restrictions, schema validation) rather than business logic?
   - Check imports — does the test import from the subsystem it's supposed to protect?
4. **Staleness detection**: Compare the test's assumptions against the current architecture file. If the subsystem's boundary, API surface, or key patterns have changed since the test was written, flag as potentially stale.

### Classification Rules

- A fitness function with `Test file: candidate — not yet written` is not audited — it's noted as a candidate.
- A fitness function where the test file exists but tests completely different properties than documented is classified as **stale**, not **present**.
- A fitness function where the test file partially covers the documented property is classified as **present** with a note about incomplete coverage.

## Invariant Compliance Checking Approach

### Heuristic Spot-Checking

Invariant compliance checking is intentionally heuristic — it samples the codebase for obvious violations rather than proving compliance exhaustively.

### What to Grep For Per Invariant Type

| Invariant Type | Grep Strategy |
|---|---|
| Layer restriction ("no X outside Y") | Grep for the restricted pattern outside the allowed directory |
| Message/format requirement ("all errors include X") | Sample error handling code in relevant layers, check for the required element |
| Security constraint ("never log X") | Grep for log statements near sensitive data patterns |
| Performance constraint ("no sync blocking > Nms") | Check for synchronous operations in the constrained scope |
| Consistency requirement ("all mutations go through X") | Grep for direct mutations outside the required pathway |

### Reporting

For each invariant, report one of:
- **Compliant** — spot-check found no violations (with evidence of what was checked)
- **Violation found** — specific files/lines that violate the invariant
- **Amendment needed** — the invariant itself may need updating based on how the codebase has evolved

## Maturity Promotion and Demotion Criteria

> **Authoritative source**: `../../_shared/references/maturity-conventions.md` defines the general maturity levels, promotion evidence, and demotion triggers. The audit-specific criteria below provide detailed evidence thresholds for each level transition.

### Sufficient Evidence for Promotion

| From | To | Required Evidence |
|---|---|---|
| Experimental | Developing | Design direction is clear; at least one dependent; no major rewrites planned |
| Developing | Maturing | Multiple dependents; most edge cases handled; fitness function candidates identified; stable over 2+ recent slices |
| Maturing | Foundational | All key fitness functions written and passing; deeply relied upon by multiple subsystems; generic design handles known variations; stable over 3+ slices with no significant changes |

### Sufficient Evidence for Demotion

- Fitness functions broken or removed without replacement
- Significant rework or design changes in progress
- New gaps discovered (edge cases, failure modes not previously known)
- Dependents reporting integration issues
- Confidence drop due to requirements change

### Decision Record Format

Maturity changes are captured as decision records using the format from `decisions-format.md`. The decision statement should follow: "Promote/Demote {subsystem} from {old level} to {new level}." The rationale should cite specific evidence from the audit.

## Finding Categories — Maturity, Fitness, and Invariant

Four additional finding categories extend the existing gap/improvement categories:

### stale-fitness-function

**Severity mapping**: Maps to gap quest — the test exists but no longer matches the architecture.

```markdown
# Side Quest: Fix stale fitness function for <subsystem>

**Type**: gap
**Source**: Architecture audit <date>
**Severity**: IMPORTANT

## Goal

Update fitness function test at `<test-path>` to match current architecture for <subsystem>.

## Current State

Test was written for: <original architectural property>
Architecture now specifies: <current architectural property>
Specific drift: <what changed>

## Target State

Test verifies the current architectural property as documented in `<subsystem>-api.md`.

## Scope

- Files to modify: <test file path>
- Estimated complexity: low
- Dependencies: none
```

### missing-fitness-function

**Severity mapping**: Maps to improvement quest — the property should be tested but isn't yet.

```markdown
# Side Quest: Write fitness function for <subsystem> — <property>

**Type**: improvement
**Source**: Architecture audit <date>
**Severity**: MINOR (unless subsystem is Maturing/Foundational, then IMPORTANT)

## Goal

Write automated test verifying: <architectural property>

## Architecture Reference

Documented in `<subsystem>-api.md` § Fitness Functions as candidate.

## Scope

- Files to create: <suggested test path>
- Estimated complexity: <low/medium>
- Dependencies: none
```

### invariant-violation

**Severity mapping**: Maps to gap quest — code violates a documented constraint.

```markdown
# Side Quest: Fix invariant violation — <INV-ID>

**Type**: gap
**Source**: Architecture audit <date>
**Severity**: IMPORTANT (CRITICAL if security/data-integrity invariant)

## Goal

Bring code into compliance with <INV-ID>: "<invariant statement>"

## Violations Found

<list of specific files/lines with evidence>

## Target State

All code in scope complies with the invariant.

## Scope

- Files to modify: <list>
- Estimated complexity: <low/medium/high>
- Dependencies: none
```

### invariant-amendment-needed

**Severity mapping**: Maps to improvement quest — the invariant itself needs updating.

```markdown
# Side Quest: Amend invariant <INV-ID>

**Type**: improvement
**Source**: Architecture audit <date>
**Severity**: MINOR

## Goal

Update <INV-ID> to reflect how the codebase has evolved.

## Current Invariant

"<current statement>"

## Proposed Amendment

"<proposed new statement>"
Rationale: <why the invariant should change>

## Scope

- Files to modify: architecture/invariants.md
- Estimated complexity: low
- Dependencies: Decision record required (user approval)
```

## Side Quest Proposal Format

### Gap Quest (`type: gap`)

```markdown
# Side Quest: <name>

**Type**: gap
**Source**: Architecture audit <date>
**Severity**: <from findings>

## Goal

Bring <specific modules/files> in line with <architecture file> which specifies <intended state>.

## Current State

<What the code actually does, with file paths and evidence>

## Target State

<What the architecture says it should do, with references>

## Scope

- Files to modify: <list>
- Estimated complexity: <low/medium/high>
- Dependencies: <other quests or slices that should complete first>

## Approach

<Suggested strategy — not a full plan, just enough to scope the work>
```

## Project Health Refresh

Audit findings map to specific project-health sections based on finding type.

### Finding Type Mappings

| Finding Type | Profile Section | Rationale |
|---|---|---|
| **Gap analysis** (code drifts from architecture) | **Health** | Areas where code diverges from intended architecture are fragile — changes there carry higher risk of breakage |
| **Gap analysis** (code drifts from architecture) | **Technical Debt** | Implementation drift is technical debt — code that should conform to architecture but doesn't |
| **Reassessment** (architecture needing change) | **Technical Debt** | Architecture that no longer fits reality is design debt — the target itself needs updating |
| **Reassessment** (architecture needing change) | **Extensibility** | Module depth and boundary quality findings directly inform how easy the system is to extend |

### Sections NOT Updated by Audit

- **Recent Changes**: Driven by slice completion, not audit. Audit should not touch this section.

### Improvement Quest (`type: improvement`)

```markdown
# Side Quest: <name>

**Type**: improvement
**Source**: Architecture audit <date>
**Severity**: <from findings>

## Goal

Refactor <specific modules/files> to match updated architecture for <subsystem/pattern>.

## Architecture Change

<What changed in the architecture files and why>
Decision: <path to decision file written during audit>

## Current State

<What the code currently does>

## Target State

<What the updated architecture now specifies>

## Scope

- Architecture files updated: <list>
- Code files to modify: <list>
- Estimated complexity: <low/medium/high>
- Dependencies: Run `/refine-architecture` first, then `/create-plan`

## Approach

<Suggested strategy>
```
