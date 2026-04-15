# Learnings: 04-refinement-loop-extractors

## Domain

### Artifact parsing is simpler than anticipated
The original architecture spec called for remark + remark-gfm + remark-frontmatter + unist-util-select (~35KB). Implementation proved that `gray-matter` + `js-yaml` (~6KB total) is sufficient for all 10 extractors. The markdown artifacts use controlled templates with YAML frontmatter and fenced YAML blocks -- full AST parsing is unnecessary when the structure is predictable.

### Finding deduplication needs two granularity levels
The circuit breaker uses a two-field key (severity + dimension) for stuck-finding detection because it is a safety-net heuristic. The feedback synthesizer uses a three-field key (severity + dimension + normalized first-80-chars of description) because it loses information when merging. This dual-granularity approach was a deliberate design decision, not an accident.

### Convergence evaluation is stateless per round
The evaluator only looks at the current round's scored events, not historical trends. This is correct for the "are we done?" question. The circuit breaker handles the temporal dimension (stuck findings, score stagnation). Clean separation of concerns.

## Architecture

### Port interface pattern works well for testability
`ReviewerDispatcher` and `ArtifactEditor` as port interfaces (following the `GitOps` pattern from engine layer) made the refinement loop fully testable with mock implementations. The integration tests use simple mock dispatchers/editors and exercise the full loop without any I/O.

### Zod v4 discriminatedUnion requires string literal discriminants
`CircuitBreakerResult` cannot use `z.discriminatedUnion` because the discriminant (`triggered`) is boolean. The implementation uses `z.union` with `z.literal(true)` and `z.literal(false)`, which still provides type narrowing. This is a Zod v4 limitation worth documenting.

### Trust layer imports only from schemas and util (not engine)
Despite the architecture allowing trust -> engine imports, the actual extractors and convergence evaluator only need types from `src/schemas/`. The refinement loop has no engine dependency. This is cleaner than expected -- engine coupling can be deferred until reviewer registry needs event access.

## Code Patterns

### Registry pattern reuse from InvariantRegistry
The `ExtractorRegistry` followed the same `register`/`getById`/`getAll` pattern as `InvariantRegistry` from slices 01-03. The pattern transfers cleanly. The `extract()` convenience method returning `ExtractResult<unknown>` with callers narrowing via Zod parse avoids unsafe generic casts.

### Strict Zod schemas for controlled templates
All extractor output schemas use `.strict()` rather than `.strip()`. This is intentional: these schemas parse controlled templates (not external inputs), so unexpected fields indicate a parse bug. Different convention from engine event envelopes which use `.strip()`.

### Feedback synthesizer uses average scores for dimension aggregation
When multiple reviewers score the same dimension, the synthesizer averages the scores. This is a reasonable default but may need refinement (e.g., min-score or weighted average by relevance).

## Dependencies

### gray-matter ships its own types
No `@types/gray-matter` needed. `js-yaml` requires `@types/js-yaml` as a dev dependency.

### gray-matter returns empty object for empty frontmatter
The parse-utils handle this edge case: empty frontmatter is treated as `FRONTMATTER_MISSING`, not a successful parse with empty data.

## Plan Accuracy

### Plan was highly accurate
All 5 phases executed in a single round each. The plan's task breakdown, file structure, and interface designs were directly implementable. Key plan decisions that paid off:
- Artifact-type extractors (not reviewer-domain extractors) was the right framing
- Registry pattern reuse from InvariantRegistry worked without modification
- Pure function design for evaluator and circuit breaker simplified testing
- Port interfaces for dispatcher/editor enabled clean integration testing

### ReviewerFinding gained a `dimension` field not in architecture doc
The architecture doc's `ReviewerPayload.findings` had `severity`, `description`, and `location`. The implementation added `dimension` to findings (separate from the dimension scores) to enable structured key matching for stuck-finding detection and dedup. The `location` field was dropped (replaced by dimension-based matching).

### Architecture doc's evaluateConvergence signature diverged
The architecture doc shows `evaluateConvergence(scoredEvents, rubric, relevanceWeights, maxRounds)`. Implementation uses `ConvergenceConfig` object as the 4th parameter instead of bare `maxRounds`. This is more extensible.
