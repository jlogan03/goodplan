# Generalist Review — Phase 4: State Machine Scaffold + INIT_PROJECT

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Clean, well-structured implementation. The state machine scaffold is pure (no I/O imports), correctly dispatches events, and the INIT_PROJECT handler produces the expected tree structure per the data model spec. Tests cover the required scenarios: happy path, guard rejection, unknown event, purity, and immutability. Build is green, types are clean, purity grep passes.

## Important (1)

### I1: `new Date()` breaks reducer purity (INV-003 / state-machine-api.md)

**File:** `src/core/state/transitions/init.ts:27`

The handler calls `new Date().toISOString()` inside the reducer. The architecture spec states: "Given the same (state, event), they always return the same result." Two calls with identical inputs produce different timestamps, violating deterministic output. The purity test acknowledges this with a comment ("timestamps will differ") and works around it by only comparing non-timestamp fields — but this papers over a real contract violation.

The canonical fix is to have the RPC layer inject `ts` into the event payload (e.g., `{ type: "INIT_PROJECT", name: string, ts: string }`) so the reducer remains a pure function of its inputs. This matches how `ArchitectureDelta.ts` is documented ("injected by RPC layer, not caller-supplied").

**Impact:** Technically breaks the purity invariant. Practically low-risk since timestamps are not used in guard logic, but it sets a precedent that compounds as more transitions are added.

## Minor (2)

### M1: `InitProjectEvent` duplicates `StateEvent` definition

**File:** `src/core/state/transitions/init.ts:10-13`

A local `InitProjectEvent` interface is defined rather than extracting it from `StateEvent`. If `StateEvent` is extended (e.g., adding `ts` per I1), this local copy will silently drift. Use `Extract<StateEvent, { type: "INIT_PROJECT" }>` to derive it from the single source of truth.

### M2: Purity test is weakened by the `new Date()` issue

**File:** `tests/unit/state/reduce.test.ts:133`

The "same inputs produce identical outputs" test explicitly avoids comparing timestamps, reducing its value as a regression guard. Once I1 is addressed (timestamp in event payload), this test should assert full structural equality via deep-equal on the entire state tree.

## Conformance Checklist

| Requirement | Status |
|---|---|
| `reduce()` signature matches `state-machine-api.md` | Pass |
| `StateEvent` discriminated union (INIT_PROJECT only) | Pass |
| `StateError` shape: `{ code, message, detail? }` | Pass |
| `isStateError` type guard via `"code" in result` | Pass |
| INIT_PROJECT guard: `hasChild(state, "", "project.json")` | Pass |
| INIT_PROJECT produces: project.json, 3 overviews, 3 JSONL, collection dirs | Pass |
| project.json fields match data-model.md | Pass |
| activity-log entry shape: ts, phase, scope, status, summary | Pass |
| Unknown event returns STATE_INVALID_TRANSITION | Pass |
| No `fs`/`path` imports in `src/core/state/` (INV-003) | Pass |
| Tests: happy path, guard rejection, unknown event, purity, immutability | Pass |
| `export type` for types, regular `export` for runtime (verbatimModuleSyntax) | Pass |
| Types re-exported through `src/core/state/types.ts` | Pass |
