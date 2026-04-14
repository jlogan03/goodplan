# Architecture Delta: 04-refinement-loop-extractors

## Alignment

- Trust layer directory structure matches architecture: `src/trust/convergence/`, `src/trust/extractors/`, `src/trust/interfaces/`
- Schema placement in `src/schemas/trust/` matches architecture guidance
- Dependency rules respected: trust imports only from schemas and util
- 10 extractors match the architecture doc's extractor type list exactly
- Convergence states (CONVERGED, CONTINUE, CIRCUIT-BROKEN) match architecture
- Three circuit breaker triggers match architecture (stuck-finding, reviewer-disagreement, round-budget-exceeded)
- Port interface pattern (ReviewerDispatcher, ArtifactEditor) follows GitOps precedent

## Drift

### Dependencies reduced (intentional)
- **Architecture doc**: lists remark + remark-gfm + remark-frontmatter + unist-util-select + yaml (~35KB)
- **Implementation**: uses only gray-matter + js-yaml (~6KB)
- **Reason**: Full markdown AST unnecessary for controlled templates with predictable structure
- **Action needed**: Update trust.md Libraries table

### ReviewerFinding schema changed
- **Architecture doc**: `findings` has `severity`, `description`, `location?`
- **Implementation**: `findings` has `severity`, `dimension`, `description` (no `location`)
- **Reason**: `dimension` field enables structured matching for stuck-finding and dedup. `location` was deemed less useful for artifact-level findings.
- **Action needed**: Update trust.md ReviewerPayload section

### CircuitBreakerReason schema richer than documented
- **Architecture doc**: shows `findingId`, `reviewerScores` array
- **Implementation**: uses `findingKey` (not `findingId`), `spread` number (not `reviewerScores` array)
- **Reason**: Implementation is more efficient -- circuit breaker only needs the spread value, not full reviewer scores
- **Action needed**: Update trust.md CircuitBreakerReason type definition

### evaluateConvergence signature changed
- **Architecture doc**: `evaluateConvergence(scoredEvents, rubric, relevanceWeights, maxRounds)`
- **Implementation**: `evaluateConvergence(scoredEvents, rubric, relevanceWeights, config: ConvergenceConfig)`
- **Reason**: ConvergenceConfig groups maxRounds with stagnationWindow, disagreementThreshold, reductionThreshold
- **Action needed**: Update trust.md Interface section

### DimensionResult schema simplified
- **Architecture doc**: `DimensionResult` has `reviewerId` and `relevance` fields
- **Implementation**: `DimensionResult` has only `name`, `score`, `threshold`, `passed`
- **Reason**: reviewerId is on the ReviewerPayload envelope, relevance is tracked in the evaluator's relevanceWeights map
- **Action needed**: Update trust.md DimensionResult type

## Gaps

### Reviewer Registry not yet implemented
- `src/trust/reviewers/` is listed in architecture but was out of scope for this slice
- This is expected -- reviewer registry is a separate slice

### Override mechanism not yet implemented
- `gp refine:override` command and `convergence-overridden` event are documented but not built
- This is command-layer work, expected in a later slice

### Rubric loading from YAML files not yet implemented
- The `Rubric` interface exists as a TypeScript type, but no YAML loader
- Rubrics are passed as objects to the evaluator; file-based loading is deferred

## Emergent Patterns

### ScoredEvent as round-tagged payload wrapper
The `ScoredEvent` type (`{ round: number; payload: ReviewerPayload }`) emerged as the natural unit of convergence history. Not in the architecture doc but used consistently across evaluator, circuit breaker, and refinement loop.

### SynthesizedFeedback as inter-round data contract
The `SynthesizedFeedback` type bridges the gap between reviewer payloads and the artifact editor. It deduplicates findings and aggregates scores, providing a clean input for edit prompts. Not explicitly documented in architecture.

### RoundCompleteData callback for progress reporting
The `onRoundComplete` callback with `RoundCompleteData` provides a hook for callers (skills) to report progress without coupling the loop to any specific reporting mechanism.
