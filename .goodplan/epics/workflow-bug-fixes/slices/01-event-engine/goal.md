# Slice 01: Event Engine

## Goal

Build the append-only event log engine: JSONL writer/reader with prevId chain validation, Zod-based event envelope schema, ~80 event type schemas organized by scope, ContentRef type, and `gp verify` command for structural integrity checks.

## In Scope

- `src/engine/events/` -- event log writer (append JSONL, flock-based write safety), reader (read/stream), prevId chain validation
- `src/schemas/` -- event envelope schema (Zod) with all 10 envelope fields (id, schemaVersion, ts, scope, actor, domain, type, payload, prevId)
- Event type schemas organized by scope: `project.ts`, `epic.ts`, `slice.ts`, `side-quest.ts`, `refinement.ts`, `trust-domain.ts`, etc.
- ContentRef type (file paths initially, git blob SHA deferred)
- `gp verify` command -- 5 structural integrity checks (prevId chain, schema validation, etc.)
- Schema evolution contract (forward/backward compat strategy)
- Update hooks (`protect-state.sh`) to protect `events.jsonl` and spine files immediately -- architecture explicitly requires Layer 0 hook updates, do not defer to Layer 3
- Unit tests in `tests/engine/`

## Out of Scope

- Invariant checking (slice 02)
- Derived state computation (slice 03)
- Any CLI commands beyond `gp verify`
- Git blob SHA ContentRef implementation (deferred)
- Performance optimization (caching, indexing)

## Dependencies

None -- this is the foundation slice.

## Verification

1. Unit tests pass: can append events, read them back, validate prevId chain
2. `gp verify` runs against a test event log and reports integrity status
3. All ~80 event type schemas compile and validate sample payloads
4. Flock-based write safety works (concurrent append test)
5. Schema validation rejects malformed events with clear error messages

## Estimated Sessions

3-4
