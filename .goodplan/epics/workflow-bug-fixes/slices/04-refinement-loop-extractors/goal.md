# Slice 04: Refinement Loop + Extractors

## Goal

Build the artifact-agnostic refinement loop (`gp refine:*` commands), convergence evaluator, circuit breaker, the extractor framework with all 10 extractor types, and a bootstrap reviewer/rubric for testing.

## In Scope

- `src/trust/convergence/` -- convergence evaluator (pure function: events + rubric -> CONVERGED/CONTINUE/CIRCUIT-BROKEN)
- `src/trust/extractors/` -- extractor framework (gray-matter + remark parsing), all 10 extractor types
- `gp refine:start`, `score`, `synthesize`, `revise`, `evaluate`, `converge`, `stuck`, `override` commands
- Circuit breaker logic (stuck-finding, reviewer-disagreement, round-budget-exceeded)
- Bootstrap reviewer registry + rubric (minimal, hardcoded, 1-2 reviewers for testing)
- Unit tests in `tests/trust/` and integration tests in `tests/commands/`

## Out of Scope

- Full reviewer registry with all reviewers (slice 07a)
- Full rubric set (slice 07a)
- Entity-specific commands (slices 05-07b)
- Skills that orchestrate the refinement loop (slices 08-11)

## Dependencies

- Slice 01 (event-engine) -- event log for refinement events
- Slice 02 (invariant-engine) -- invariant checks on refinement events
- Slice 03 (derived-state-core-commands) -- derived state for convergence evaluation

## Verification

1. Unit tests pass for convergence evaluator (CONVERGED/CONTINUE/CIRCUIT-BROKEN paths)
2. Circuit breaker fires correctly on stuck-finding, reviewer-disagreement, and round-budget-exceeded
3. All 10 extractors parse their respective structured sections from sample artifacts
4. Extractors reject malformed input with SCHEMA_INVALID error
5. `gp refine:start` through `gp refine:converge` exercises the full loop with bootstrap rubric
6. `gp refine:stuck` and `gp refine:override` work correctly
7. Integration test: draft artifact -> review -> score -> evaluate -> converge (or circuit-break)

## Estimated Sessions

2-3
