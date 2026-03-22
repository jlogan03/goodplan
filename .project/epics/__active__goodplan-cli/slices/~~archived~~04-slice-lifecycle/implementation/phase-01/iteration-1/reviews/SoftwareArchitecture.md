# Software Architecture Review: Phase 01 — StateEvent Types & Supporting Schemas

## Issues

**[IMPORTANT]** COMPLETE_SLICE event uses Input types instead of storage types, diverging from state-machine-api.md spec
The `state-machine-api.md` spec defines `COMPLETE_SLICE` with `learnings: Learning[]` and `architectureDelta: ArchitectureDelta[]` (full storage types including `source`, `rollup`, `ts`). The implementation uses `LearningInput[]` and `ArchitectureDeltaInput[]` (input types that omit those fields). This is a reasonable design choice — the state machine event carries what the caller provides, and the RPC layer enriches before writing to storage — but it creates a divergence between the spec and the implementation. The spec should be updated to match this design decision, or else a future implementer reading the spec will be confused. The plan explicitly calls for input schemas, so this is intentional, but the spec update for `COMPLETE_SLICE` payload types was not included in the plan tasks (only `CREATE_SLICE`'s `goal` field was updated).
File: src/schemas/state-events.ts:68-70
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `handleNotImplemented` ignores its arguments — silent data loss risk
The placeholder handler `handleNotImplemented` discards both `state` and `event` parameters, returning only an error. This is fine as a temporary placeholder, but the `as Handler<"CREATE_SLICE">` cast silences the type system about the parameter mismatch. If anyone accidentally wires a real code path through these handlers before Phase 2 replaces them, the state and event data will be silently discarded. The function signature should accept the parameters even if unused, to avoid the cast:
```typescript
const handleNotImplemented = (_state: ProjectState, _event: StateEvent): StateError => ({
```
This eliminates the need for every `as Handler<"X">` cast in the handler record and makes the placeholder type-safe without casts.
File: src/core/state/reduce.ts:51-54
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Import-path style inconsistency in state-events.ts: inline imports vs top-level imports
`COMPLETE_SLICE` uses inline `import(...)` type references for `DeferredItem`, `LearningInput`, and `ArchitectureDeltaInput`, while the same file uses a top-level `import type` for `Verification` and `VerificationResult`. The inline imports work but diverge from the established pattern in this file. Using top-level `import type` would be consistent with the rest of the file and more readable.
File: src/schemas/state-events.ts:68-70
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test events for pre-existing types (COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION) are missing `ts` field
Several test event literals in `state-events.test.ts` omit the `ts` field (e.g., `{ type: "COMPLETE_PLAN", slice: "s" }`). TypeScript's structural typing with excess property checking on type annotations allows this because the StateEvent union is defined with plain object types (not strict), but these test objects don't match the documented universal `ts` convention. This is a pre-existing issue (not introduced by this phase) so it's minor, but the new events correctly include `ts` — consider fixing the old ones for consistency.
File: tests/unit/schemas/state-events.test.ts:135-138
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation that follows the plan precisely, maintains compile-time exhaustiveness, keeps the state machine pure, and passes all verification. The input schema / storage schema split is a good architectural decision. Two things prevent a 9: (1) the spec divergence for COMPLETE_SLICE payload types should be resolved to keep the spec as source of truth, and (2) the handleNotImplemented pattern uses unnecessary type casts that could be eliminated with a proper function signature.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
