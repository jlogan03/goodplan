# Slice Set Review Criteria

Domain-specific evaluation criteria for the slice set reviewer. Evaluates whether a set of slice definitions is well-structured, complete, and implementable. Does NOT evaluate the technical approach within each slice or alignment with the epic goal — domain and holistic reviewers handle those.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- The epic goal and architecture — does the slice set cover the full scope?
- Existing slice dependencies — do declared dependencies match actual code/data flow?
- The codebase structure — do slice boundaries align with module boundaries?
- Prior slices (if any are already landed) — does the new set build on them correctly?

## Evaluation Criteria

1. **Scope coverage**: Does the slice set cover the entire epic scope with no gaps or overlaps?
   Consider: every capability described in the epic goal should map to at least one slice. Conversely, no two slices should implement the same capability. Look for missing edge cases, error handling, or integration work that falls between slices.

2. **Ordering and dependencies**: Is the execution order logical and are dependencies correctly declared?
   Consider: slices that depend on shared infrastructure should come first. A slice that needs an API endpoint should depend on the slice that creates it. Circular dependencies are a CRITICAL issue. Under-declared dependencies lead to implementation failures; over-declared dependencies reduce parallelism unnecessarily.

3. **Slice granularity**: Is each slice appropriately sized — neither too large nor too trivial?
   Consider: a slice should be completable in a single focused session (roughly 1-4 chunks). A slice with 8+ chunks likely needs decomposition. A slice with a single trivial chunk may be better merged with an adjacent slice. Each slice should deliver a meaningful increment of functionality.

4. **Verifiability**: Can each slice's completion be independently verified?
   Consider: a well-defined slice has clear "done" criteria. If you can't describe a concrete check that proves the slice works, the scope is too vague. Slices that say "improve X" without measurable criteria are poorly defined.

5. **Effort estimation reasonableness**: Are effort estimates plausible given the scope?
   Consider: estimates should correlate with the number of files touched, the complexity of the logic, and the testing burden. A slice that touches 15 files across 4 subsystems shouldn't have the same estimate as one that adds a single utility function.

## Examples

**Good (no issues):**
- Every epic goal capability maps to exactly one slice
- Dependencies form a DAG with clear topological order
- Each slice has 2-4 chunks with concrete verification criteria
- Effort estimates vary appropriately with complexity

**Bad (CRITICAL):**
- A major capability from the epic goal has no corresponding slice
- Circular dependency between slices
- Two slices modify the same file/module with conflicting intentions
- A slice has no verifiable completion criteria

**Bad (IMPORTANT):**
- Dependencies are under-declared — slice B uses output from slice A but doesn't declare the dependency
- A slice is too large (6+ chunks) and should be decomposed
- Effort estimates are uniform despite varying complexity

**Bad (MINOR):**
- Slice naming is inconsistent (some use verbs, some use nouns)
- A dependency is over-declared (adds unnecessary sequencing)
- Effort estimate is slightly off but not egregiously so
