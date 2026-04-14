# Slice 02: Invariant Engine

## Goal

Build the invariant enforcement framework with all 24 core invariants implemented as TypeScript functions, check-before-append integration with the event engine, GitOps interface with MemoryGitOps for tests, and extensible invariants via YAML.

## In Scope

- `src/engine/invariants/` -- core invariant framework
- Rule types: unique, count_limit, required, foreign_key, all_match, precondition, custom
- All 24 invariants implemented and tested
- Check-before-append integration (event engine calls invariant engine before writing)
- GitOps interface (ports-and-adapters boundary) with MemoryGitOps for testing
- Extensible invariants via YAML in `invariants.md` (parsing and activation/deactivation)
- Unit tests in `tests/engine/`

## Out of Scope

- Derived state computation (slice 03)
- CLI commands for invariant management (slice 07b)
- Full reviewer registry (slice 07a)

## Dependencies

- Slice 01 (event-engine) -- needs event log reader/writer and event schemas

## Verification

1. Unit tests pass for each of the 24 invariants
2. Invalid events are rejected before append with clear error codes
3. MemoryGitOps allows full invariant testing without real git operations
4. YAML-based extensible invariants can be parsed, activated, and deactivated
5. Each invariant has positive (accepts valid state) AND negative (rejects invalid state) test case
6. Integration test: append event -> invariant check -> accept/reject flow works end-to-end

## Estimated Sessions

2
