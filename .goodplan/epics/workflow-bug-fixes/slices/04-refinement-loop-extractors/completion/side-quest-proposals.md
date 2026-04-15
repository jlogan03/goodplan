# Side Quest Proposals: 04-refinement-loop-extractors

## 1. Update trust.md architecture doc to match implementation

- **Rationale**: Five documented interfaces/types diverge from implementation (dependencies, ReviewerFinding, CircuitBreakerReason, evaluateConvergence signature, DimensionResult). These should be reconciled before downstream slices build on outdated assumptions.
- **Scope**: Small -- updating type definitions and library table in trust.md
- **Priority**: High -- stale architecture docs cause plan misalignment in future slices

## 2. Add relevance-weighted dimension aggregation to feedback synthesizer

- **Rationale**: Current synthesizer averages dimension scores equally across reviewers. When relevance weights differ (high vs low), the aggregation should weight accordingly. Currently the evaluator handles relevance for convergence decisions, but the synthesizer's feedback to the editor does not reflect relevance.
- **Scope**: Small -- modify `synthesizeFeedback` to accept relevance weights and weight averages
- **Priority**: Medium -- affects edit quality but not correctness

## 3. Add token-overlap similarity for stuck-finding detection

- **Rationale**: The circuit breaker uses severity+dimension as a two-field key for stuck-finding detection. This may produce false positives when genuinely different findings share the same severity and dimension. A Jaccard similarity check on description text would improve precision.
- **Scope**: Small -- add a similarity function and use it in `checkStuckFinding`
- **Priority**: Low -- current heuristic is acceptable as a safety net
