# Phase 1: Shared Convention File

Create `~/.claude/skills/_shared/references/maturity-conventions.md` defining all three concepts consumed by multiple skills.

### Tasks

- [ ] **Create `maturity-conventions.md`** with a table of contents at the top (linking to each of the 6 sections below), followed by sections:
  - **Maturity Levels**: Table with 4 levels (Experimental, Developing, Maturing, Foundational), descriptions, and change protocols per level. Use the table from the design spec (`docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` lines 120-128). Include "What maturity captures" bullets.
  - **Maturity Table Format**: Lives in `architecture/_overview.md` under `## Subsystem Maturity`. Columns: Subsystem, Maturity, Dependents, Fitness Functions, Notes. Include the example table from the design spec.
  - **Maturity Promotion Criteria**: Evidence justifying a promotion: stability (no significant bugs/changes over recent slices), fitness functions in place, multiple dependents, generic-enough design. Promotions are always user decisions captured as decision records. Demotions when subsystems regress (new gaps, broken fitness functions, reduced confidence).
  - **System Invariants Format**: Lives in `architecture/invariants.md`. Each invariant has: statement, rationale, scope (which subsystems it applies to), how to verify (manual check description or test reference). Include examples from the design spec (lines 195-199). Document how to add, amend, and retire invariants (add: during define-architecture or initiative architecture proposals; amend: with justification, captured as decision; retire: when no longer applicable, with rationale).
  - **Fitness Function Convention**: Full entries live in a `## Fitness Functions` section of each `<subsystem>-api.md` file, alongside the subsystem they protect. Each entry has: property being tested, test file path (or "candidate — not yet written"), what the test verifies. The maturity table's Fitness Functions column contains a summary pointer (e.g., test file path or "candidate") — not the full entry. Fitness functions are actual tests in the codebase; the architecture file documents their intent. Candidates are identified early (during define-architecture) and converted to real tests when subsystems mature.
  - **Consumer Guide**: Table mapping each artifact to which skills read/write it:

    | Artifact | Created by | Evaluated by | Audited by | Checked by reviewers |
    |---|---|---|---|---|
    | Maturity table | `/define-architecture` | `/refine-architecture` | `/audit-architecture` | SW Architecture reviewer |
    | `invariants.md` | `/define-architecture` | `/refine-architecture` | `/audit-architecture` | Holistic reviewer |
    | Fitness functions | `/define-architecture` (candidates) | `/refine-architecture` | `/audit-architecture` | SW Architecture reviewer, Holistic reviewer |

### Verification

- Read the file. Confirm all 6 sections present with examples and table of contents at top.
- Cross-reference with design spec — maturity levels, invariant examples, fitness function examples, and consumer mapping should all be present.
- Verify the format descriptions are precise enough for consuming skills to implement without ambiguity.
- Verify maturity table format example renders as valid Markdown (correct column alignment, separator row).
