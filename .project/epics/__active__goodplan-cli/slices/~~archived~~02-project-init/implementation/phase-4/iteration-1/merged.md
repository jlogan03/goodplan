# Merged Review — Phase 4, Iteration 1: State Machine Scaffold + INIT_PROJECT

**Consensus Score: 7-9/10** (Generalist: 9, Architecture: 7, TypeScript: 7)
**Critical: 0 | Important: 2 | Minor: 3**

All reviewers agree the implementation is clean, well-structured, and architecturally correct. Module boundaries, dependency direction, immutability, and test coverage are solid. Score is held back by two important issues flagged unanimously.

---

## Important (2)

### I1: `new Date()` in reducer breaks purity invariant (INV-003)

**Flagged by:** All 3 reviewers
**File:** `src/core/state/transitions/init.ts:27`
**Resolution:** DIRECTLY_ACTIONABLE

`handleInitProject` calls `new Date().toISOString()`, making the reducer non-deterministic — identical `(state, event)` inputs produce different outputs. This violates INV-003 and the state-machine-api.md contract. The purity test works around this by only comparing non-timestamp fields, masking the violation.

**Fix:** Add `ts: string` (ISO 8601) to the `INIT_PROJECT` event payload, injected by the RPC layer. The handler reads `event.ts` instead of calling `new Date()`. This matches the documented pattern for `ArchitectureDelta.ts`. Once fixed, the purity test should assert full `toEqual` structural equality.

### I2: `InitProjectEvent` duplicates `StateEvent` definition

**Flagged by:** All 3 reviewers
**File:** `src/core/state/transitions/init.ts:10-13`
**Resolution:** DIRECTLY_ACTIONABLE

A local `InitProjectEvent` interface is defined instead of deriving it from the `StateEvent` discriminated union. If `StateEvent` is updated (e.g., adding `ts` per I1), the local copy silently drifts.

**Fix:** Use `Extract<StateEvent, { type: "INIT_PROJECT" }>` to derive the type from the single source of truth, or export named variants from `state-events.ts`.

---

## Minor (3)

### M1: Purity test weakened by `new Date()` workaround

**Flagged by:** Generalist, TypeScript
**File:** `tests/unit/state/reduce.test.ts:123-133`

The "same inputs produce identical outputs" test avoids comparing timestamps, reducing its regression value. Once I1 is fixed, assert full structural equality via `expect(result1).toEqual(result2)`.

### M2: `isStateError` type guard could false-positive on objects with `code` + `message`

**Flagged by:** Architecture
**File:** `src/schemas/state-events.ts:10`

The structural check (`"code" in result` + string checks) could match unintended objects if the state tree later contains entries with `code` and `message` properties. Low risk today since `ProjectState` doesn't overlap. Consider adding a discriminant tag or negative check if the state tree grows.

### M3: `isStateError` uses `as` cast instead of narrowing

**Flagged by:** TypeScript
**File:** `src/schemas/state-events.ts:17`

After the `"code" in result` check, the function casts `result as StateError` to access properties. Using `(result as Record<string, unknown>).code` or restructuring would be marginally safer. Cosmetic — current code works correctly.

---

## Conformance Checklist (all pass)

| Requirement | Status |
|---|---|
| `reduce()` signature matches state-machine-api.md | Pass |
| `StateEvent` discriminated union (INIT_PROJECT only) | Pass |
| `StateError` shape: `{ code, message, detail? }` | Pass |
| `isStateError` type guard | Pass |
| INIT_PROJECT guard: `hasChild(state, "", "project.json")` | Pass |
| INIT_PROJECT produces: project.json, 3 overviews, 3 JSONL, collection dirs | Pass |
| project.json fields match data-model.md | Pass |
| activity-log entry shape | Pass |
| Unknown event returns STATE_INVALID_TRANSITION | Pass |
| No `fs`/`path` imports in `src/core/state/` (INV-003) | Pass |
| Tests: happy path, guard, unknown event, purity, immutability | Pass |
| `export type` / `verbatimModuleSyntax` compliance | Pass |
| Types re-exported through `src/core/state/types.ts` | Pass |
