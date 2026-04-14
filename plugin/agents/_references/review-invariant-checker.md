# Invariant Checker Review Criteria

Domain-specific evaluation criteria for the invariant checker reviewer. Evaluates whether artifacts respect all active project invariants. Does NOT evaluate overall artifact quality — holistic and domain reviewers handle that.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Run `gp invariant:list --json` (or read the invariants directly from `.goodplan/`) to discover all active invariants
- Read `architecture/invariants.md` if it exists — this documents system-level invariants
- Check the artifact under review for any actions, patterns, or decisions that would conflict with active invariants
- Look at the existing codebase to understand how invariants are currently maintained

## Evaluation Criteria

1. **Invariant identification**: Did you find and read ALL active invariants before evaluating?
   Consider: invariants may be stored in `.goodplan/invariants/`, `architecture/invariants.md`, or discoverable via `gp invariant:list`. Missing an invariant means missing a potential violation.

2. **Direct violations**: Does the artifact explicitly contradict any active invariant?
   Consider: an architecture proposal that introduces a direct dependency where an invariant prohibits it. A plan that modifies a protected subsystem boundary. A goal that targets changing something an invariant declares immutable.

3. **Implicit violations**: Would implementing this artifact likely cause invariant violations as a side effect?
   Consider: a plan that doesn't mention a protected boundary but whose tasks would naturally cross it. A slice set whose ordering would require temporary invariant violations. An architecture that doesn't address how existing invariants would be maintained during migration.

4. **Justified exceptions**: If the artifact intentionally relaxes or changes an invariant, is the justification explicit and reasonable?
   Consider: sometimes invariants need to evolve. The artifact should explicitly call out which invariant is being changed and why. Silent invariant erosion is a CRITICAL issue; explicit, justified change is acceptable.

5. **New invariant implications**: Does the artifact introduce patterns that should become invariants but aren't documented?
   Consider: this is a MINOR observation, not a blocking issue. Note patterns that look invariant-worthy for the project maintainer to consider.

## Examples

**Good (no issues):**
- Artifact explicitly references relevant invariants and explains how it maintains them
- Plan includes verification steps that check invariant compliance after each phase
- Architecture proposal notes which existing invariants apply and how the new design satisfies them

**Bad (CRITICAL):**
- Plan modifies a subsystem boundary that an invariant declares stable, with no mention of the invariant
- Architecture introduces a circular dependency where an invariant requires acyclic dependency graphs
- Goal contradicts an active invariant without acknowledging the conflict

**Bad (IMPORTANT):**
- Artifact is silent on invariant compliance — doesn't violate anything obvious but also doesn't demonstrate awareness
- Slice ordering would require temporary invariant violations during implementation without a mitigation strategy

**Bad (MINOR):**
- Artifact introduces a new pattern that looks like it should be an invariant but isn't documented as one
