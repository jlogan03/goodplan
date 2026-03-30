# Decision: Simplicity as the Default — Complexity Requires Justification

**Status**: active
**Date**: 2026-03-17
**Domain**: architecture
**Context**: Cross-cutting workflow design principle, discussed during audit-docs-and-tests side quest definition

## Decision

Simplicity is the default posture across all workflow skills. The agent should actively push toward the simplest solution that meets the requirements. When a more complex approach is needed (for performance, reliability, correctness, etc.), the agent must surface the added complexity explicitly and have a conversation with the user about whether it's justified — before committing to it.

## Rationale

Complexity that enters early compounds across architecture, plans, and implementation. Without an active force pushing toward simplicity, agents tend toward over-engineering: adding abstractions, configurability, and defensive patterns "just in case." The cost of unnecessary complexity is ongoing (maintenance, cognitive load, debugging surface area), while the cost of adding complexity later when actually needed is usually low.

Alternatives considered:
- **No explicit principle** — relies on general "don't over-engineer" guidance, which is too easy to ignore under pressure to be thorough
- **Dedicated simplicity reviewer** — rejected because simplicity isn't separable from domain evaluation; every reviewer should apply this lens in their domain rather than having a single reviewer that conflicts with others

## Consequences

### Where this applies

| Skill | How simplicity pressure manifests |
|---|---|
| `/explore` | Actively research simpler alternatives, not just solutions. When a complex approach is found, look for lighter-weight options before moving on. |
| `/define-architecture` | One design-it-twice constraint is always "simplest version that works." Comparison explicitly surfaces complexity cost of more elaborate options. |
| `/create-plan` | Evaluate each planned component against "is there a simpler way to achieve this?" before writing. Call out infrastructure, abstractions, or patterns beyond the minimum. |
| `/refine-plan` | Cross-cutting criterion in all reviewers: every review includes a "Complexity Justification" section flagging anything that could be simpler and whether it's warranted. Research spawned when complexity is flagged. |
| `/implement-plan` | Reviewers check implementation against plan simplicity expectations. Flag gold-plating, premature abstractions, configurability nobody asked for. |
| `/audit-architecture` | Evaluate whether architecture complexity is proportional to what the codebase actually needs. |
| `/audit-tests` | Evaluate whether test infrastructure is proportional to what's being tested. |

### What this enables
- Informed complexity trade-offs rather than accidental accumulation
- A codebase where every abstraction and pattern earns its place
- Easier onboarding — less unnecessary structure to learn

### What this constrains
- Agents cannot silently add "nice to have" complexity — they must surface and justify it
- Reviewers must evaluate simplicity, adding a dimension to every review cycle
