# Learnings: rpc-api-doc-drift

## Architecture docs written as design specs drift silently when code evolves through multiple slices
_Source: rpc-api-doc-drift_

The `rpc-layer-api.md` doc was written at `72bb892` as a design spec, partially updated twice, but never fully reconciled with code that evolved through 8+ slices. Ten divergences accumulated. Future architecture audit side quests should be scheduled periodically — drift is a natural consequence of iterative development, not negligence.

## Divergence investigation (checking git history) prevents wasted effort on "code bugs" that are actually intentional changes
_Source: rpc-api-doc-drift_

All 10 doc-code divergences turned out to be intentional code changes where the doc lagged behind. Without the git history investigation, the plan would have assumed all gaps were doc issues — which they were, but the investigation also revealed the `rollupTo` type ambiguity that led to a schema tightening. Always investigate intent before assuming which side needs fixing.

## Open string schemas at input boundaries should be tightened when only specific values are supported
_Source: rpc-api-doc-drift_

`LearningInput.rollupTo` used `z.array(z.string())` while only `'epic'` and `'project'` were actually supported. Tightening to `z.enum()` at the input boundary was safe (all existing data only used those values) and aligned the code with the documented contract. The entry schema (`LearningEntry`) was left open for stored-data safety. Pattern: constrain inputs, tolerate outputs.
