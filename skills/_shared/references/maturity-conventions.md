# Maturity, Invariants, and Fitness Function Conventions

Shared conventions consumed by `/create-architecture`, `/refine-architecture`, `/audit-architecture`, and plan refinement reviewers.

## Table of Contents

- [Maturity Levels](#maturity-levels)
- [Maturity Table Format](#maturity-table-format)
- [Maturity Promotion Criteria](#maturity-promotion-criteria)
- [System Invariants Format](#system-invariants-format)
- [Fitness Function Convention](#fitness-function-convention)
- [Consumer Guide](#consumer-guide)

---

## Maturity Levels

Each subsystem in the top-level architecture has a maturity designation reflecting confidence, investment, and usage accumulated over time.

| Level | Description | Change protocol |
|---|---|---|
| **Experimental** | New, actively being shaped, might be replaced entirely. Few or no dependents. | Changes are free |
| **Developing** | Design direction is clear but still filling out. Some dependents. | Changes expected but should be deliberate |
| **Maturing** | Well-used, most edge cases handled, multiple dependents. | Changes need justification and impact awareness |
| **Foundational** | Battle-tested, deeply relied upon, generic enough for future needs. | Changes are rare — require serious justification, migration planning, fitness function updates |

**What maturity captures:**

- How broadly the subsystem is used (number and importance of dependents)
- How much investment has gone into edge cases, error handling, hardening
- How generic and well-modularized the design is
- How confident we are it meets future needs without major overhaul

**Core purpose:** Prevent casual changes to subsystems that are deeply relied upon or represent significant investment in hardening. Maturity context tells consuming skills: this subsystem is [level] — scale caution accordingly.

---

## Maturity Table Format

**Canonical location:** `architecture/_overview.md` under `## Subsystem Maturity`

**Columns:** Subsystem, Maturity, Dependents, Fitness Functions, Notes

```markdown
## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Job system | Foundational | auth, billing, notifications, reports | job-system.test.ts | Generic task runner. Edge cases well-covered. |
| API contract | Maturing | all client-facing code | api-contract.test.ts | Schema validation solid. Pagination evolving. |
| Auth | Developing | API layer, admin UI | — | Core auth works. RBAC being extended. |
| Notifications | Experimental | — | — | Exploring channel abstractions. |
```

**Column definitions:**

- **Subsystem** — name matching the subsystem's architecture file (e.g., `job-system` maps to `job-system-api.md`)
- **Maturity** — one of the four levels above
- **Dependents** — other subsystems or layers that depend on this one
- **Fitness Functions** — test file path if written, "candidate" if identified but not yet written, "—" if none
- **Notes** — brief context on current state, what's evolving, why at this level

**Rules:**

- Every subsystem with an architecture file gets a row. New subsystems start at Experimental.
- The table is the single source of truth for maturity levels across the project.

---

## Maturity Promotion Criteria

Promotions move a subsystem up one level. They are always user decisions, captured as decision records.

**Evidence justifying promotion:**

- **Stability** — no significant bugs or design changes over recent slices
- **Fitness functions in place** — automated tests verifying the subsystem's architectural properties
- **Multiple dependents** — other subsystems rely on it, proving the interface works broadly
- **Generic-enough design** — the subsystem handles known variations without one-off hacks

**Who suggests promotions:** `/complete` (for slices and epics) and `/audit-architecture` suggest promotions when they observe the above signals. The user decides.

**Demotion criteria:** Subsystems can regress when:

- New gaps are discovered (edge cases, failure modes)
- Fitness functions break or are removed without replacement
- Confidence drops due to significant rework or design uncertainty
- Dependents report integration issues

**Who suggests demotions:** `/complete` and `/audit-architecture` suggest demotions when they observe the above signals. The user decides.

Demotions are also captured as decision records with rationale.

---

## System Invariants Format

**Canonical location:** `architecture/invariants.md`

System invariants are documented constraints that must hold across all feature additions. Unlike fitness functions (automated tests), invariants are human-readable rules verified during plan refinement.

**Each invariant has:**

| Field | Description |
|---|---|
| **Statement** | The constraint in plain language |
| **Rationale** | Why this invariant exists |
| **Scope** | Which subsystems it applies to (or "system-wide") |
| **Verification** | How to check compliance — manual check description or test file reference |

**Example `invariants.md`:**

```markdown
# System Invariants

## INV-001: User-facing errors include actionable messages

- **Rationale:** Users must be able to understand what went wrong and what to do next
- **Scope:** All API endpoints, UI error boundaries
- **Verification:** Manual review during plan refinement; error message lint rule (candidate)

## INV-002: No synchronous handler blocks for more than 200ms

- **Rationale:** Responsiveness guarantee for user-facing requests
- **Scope:** API layer, webhook handlers
- **Verification:** Performance test suite (`perf/response-time.test.ts`)

## INV-003: Every state mutation is auditable

- **Rationale:** Compliance and debugging require knowing who changed what and when
- **Scope:** System-wide
- **Verification:** Manual review — all mutations must go through audit-logged pathways

## INV-004: Sensitive data is never logged

- **Rationale:** Security and privacy compliance
- **Scope:** System-wide
- **Verification:** Log scrubbing tests (`security/log-scrub.test.ts`); manual review of new log statements
```

**Lifecycle:**

- **Add** — during `/create-architecture` (first epic), epic architecture proposals (subsequent epics), or when a side quest reveals a cross-cutting constraint. New invariants are proposed alongside the architectural changes that motivate them.
- **Amend** — with justification, captured as a decision record. Epic architecture proposals must state which invariants they preserve and justify any amendments.
- **Retire** — when no longer applicable, with rationale recorded. The invariant entry is kept but marked as retired with the reason.

---

## Fitness Function Convention

Fitness functions are automated tests that verify architectural properties — not business logic, but structural guarantees.

**Canonical location for full entries:** `## Fitness Functions` section of each `<subsystem>-api.md` file, alongside the subsystem they protect.

**Each fitness function entry has:**

| Field | Description |
|---|---|
| **Property** | The architectural property being tested |
| **Test file** | Path to the test file, or "candidate — not yet written" |
| **Verifies** | What the test checks, in plain language |

**Example in `job-system-api.md`:**

```markdown
## Fitness Functions

### Every async job type has a timeout and failure handler

- **Test file:** `tests/fitness/job-system.test.ts`
- **Verifies:** Scans all registered job types and asserts each defines a `timeout` and `onFailure` handler

### No direct database access outside repository layer

- **Test file:** candidate — not yet written
- **Verifies:** AST scan of job handler files confirming no direct DB imports
```

**Maturity table pointer:** The maturity table's "Fitness Functions" column contains a summary — test file path if written, "candidate" if identified but not written, "—" if none. The full entry with property/verifies lives in the subsystem's architecture file.

**Lifecycle:**

- **Identify candidates** — during `/create-architecture` or epic architecture proposals. Early identification sets expectations: "when this subsystem matures, these properties should be tested."
- **Convert to real tests** — when subsystems mature enough. `/create-plan` for slices that graduate a subsystem includes writing fitness functions as plan steps.
- **Maintain** — existing fitness functions must continue to pass. If a change intentionally alters an architectural property, the fitness function is updated per the plan, not silently removed.

**Examples of architectural properties fitness functions protect:**

- "All API endpoints validate input against their schema before processing"
- "No module in the data layer imports from the UI layer"
- "Every async job type has a timeout and a failure handler"
- "Database queries go through the repository layer, never direct"

---

## Consumer Guide

Which skills read and write each artifact:

| Artifact | Created by | Loaded by | Enforced by | Evaluated by | Promotion suggested by | Audited by | Checked by reviewers |
|---|---|---|---|---|---|---|---|
| Maturity table (`architecture/_overview.md`) | `/create-architecture` | `/create-plan`, `/create-slices`, `/complete`, `/implement-plan`, `/refine-plan`, `/refine-slices` | — | `/refine-architecture` | `/complete`, `/audit-architecture` | `/audit-architecture` | SW Architecture reviewer |
| `architecture/invariants.md` | `/create-architecture` | — | — | `/refine-architecture` | — | `/audit-architecture` | Holistic reviewer |
| Fitness functions (`<subsystem>-api.md`) | `/create-architecture` (candidates) | — | `/create-plan` | `/complete`, `/refine-architecture` | — | `/audit-architecture` | SW Architecture reviewer, Holistic reviewer |
| `maturity-conventions.md` | `/create-architecture` | `/complete` | — | `/refine-architecture` | — | `/audit-architecture` | — |
