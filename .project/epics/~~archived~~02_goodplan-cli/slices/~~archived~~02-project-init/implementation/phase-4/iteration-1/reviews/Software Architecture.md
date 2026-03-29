# Software Architecture Review — Phase 4: State Machine Scaffold + INIT_PROJECT

## Issues

**[IMPORTANT]** `new Date()` in transition handler breaks purity contract

The `handleInitProject` function calls `new Date().toISOString()` at line 27 of `init.ts`. This makes the reducer non-deterministic: the same `(state, event)` inputs produce different outputs depending on wall-clock time. The architecture docs (state-machine-api.md, conventions.md, invariants.md INV-003) all state the state machine must be pure, and the fitness function spec says "same inputs produce same outputs."

The existing purity test acknowledges this weakness — it explicitly avoids comparing timestamps and only checks structural equality. This masks the impurity rather than enforcing true determinism.

**Fix:** Move the timestamp into the event payload. `INIT_PROJECT` should carry a `ts: string` field (ISO 8601 timestamp) injected by the RPC layer (which is the orchestration layer responsible for I/O concerns). The transition handler should read `event.ts` instead of calling `new Date()`. This matches the pattern in the architecture where `ArchitectureDelta.ts` is documented as "injected by RPC layer, not caller-supplied."

File: src/core/state/transitions/init.ts:27
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `InitProjectEvent` interface duplicated from `StateEvent` union

`init.ts` defines its own `InitProjectEvent` interface (lines 10-13) rather than extracting it from the `StateEvent` discriminated union in `state-events.ts`. This creates a parallel type that can diverge from the canonical event definition as the codebase evolves. When future slices add fields to the `INIT_PROJECT` event variant in `StateEvent`, this local interface won't update automatically.

**Fix:** Use `Extract<StateEvent, { type: "INIT_PROJECT" }>` to derive the type from the union, or export named variants from `state-events.ts`. This keeps a single source of truth for event shapes.

File: src/core/state/transitions/init.ts:10
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `isStateError` could false-positive on objects with `code` and `message` fields

The `isStateError` type guard checks for the presence of `code` (string) and `message` (string) on any object. While this works today because `ProjectState` (a `DirectoryEntry`) doesn't have those fields, it is a structural check that could match unintended objects if the state tree ever contains JSON entries with `code` and `message` properties. A more robust approach would be to add a discriminant (e.g., `_tag: "StateError"`) or check that the object does NOT have a `type` field (since all `StateEntry` variants have `type`).

This is minor because current usage always checks the return type of `reduce()`, which is `ProjectState | StateError` — the structural overlap is unlikely in practice.

File: src/schemas/state-events.ts:10
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation correctly establishes the reducer pattern, module boundaries, dependency direction, and testability. The state machine has zero I/O imports (verified), the tree navigation helpers are well-designed with proper immutability, and tests cover the happy path, guard rejection, unknown events, and basic purity. However, the `new Date()` call in the transition handler is a genuine purity violation against a documented system invariant (INV-003), and the duplicated event type creates a maintenance hazard. Fixing the timestamp injection and deriving event types from the union would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
