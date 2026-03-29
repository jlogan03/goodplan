# TypeScript Review — Phase 4: State Machine Scaffold + INIT_PROJECT

## Issues

**[IMPORTANT]** `handleInitProject` uses `new Date()` which breaks purity

The `handleInitProject` function calls `new Date().toISOString()` at line 27 of `src/core/state/transitions/init.ts`. This means two calls with identical inputs produce different outputs (different timestamps). The purity test in `reduce.test.ts` acknowledges this by only comparing non-timestamp fields, but this violates INV-003 ("the state machine is pure -- no I/O") and the state-machine-api.md contract ("Given the same (state, event), they always return the same result").

The timestamp should be injected via the event payload (e.g., `{ type: "INIT_PROJECT", name: string, ts: string }`) or passed as a parameter from the RPC layer. This keeps the reducer deterministic and makes tests exact-match rather than structural-match.

File: src/core/state/transitions/init.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Local `InitProjectEvent` interface duplicates and may drift from `StateEvent`

`src/core/state/transitions/init.ts` defines its own `InitProjectEvent` interface (lines 10-13) rather than extracting the type from the `StateEvent` discriminated union in `src/schemas/state-events.ts`. If `StateEvent` is updated (e.g., adding a `ts` field per the issue above), this local interface must be manually kept in sync. Use `Extract<StateEvent, { type: "INIT_PROJECT" }>` to derive the type from the single source of truth.

File: src/core/state/transitions/init.ts:10
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Purity test does not assert deep structural equality

The "same inputs produce identical outputs" test (line 123 in `reduce.test.ts`) only spot-checks `Object.keys` and a few fields rather than asserting full structural equality. This is a direct consequence of the `new Date()` impurity above -- once timestamps are injected, the test should use `expect(result1).toEqual(result2)` for a complete purity assertion.

File: tests/unit/state/reduce.test.ts:123
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `isStateError` type guard uses `as` casts instead of narrowing

In `src/schemas/state-events.ts`, the `isStateError` function casts `result as StateError` to check property types (lines 17, 19). After the `"code" in result` check, TypeScript already knows `result` has a `code` property. Using `(result as Record<string, unknown>).code` or restructuring as `(result as { code: unknown }).code` would be marginally safer, though in practice the current code works correctly because the `in` check precedes the cast. This is cosmetic.

File: src/schemas/state-events.ts:17
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation is clean, well-structured, and follows the architecture correctly. Type safety is good -- `noUncheckedIndexedAccess` compliance is evident in `tree.ts`, `verbatimModuleSyntax` is honored with `import type`, and there are no `as any` or `@ts-ignore` escapes. The `reduce` function correctly returns `ProjectState | StateError` per the architecture spec. Tests cover the happy path, guard rejection, unknown events, and immutability.

The score is held back by two IMPORTANT issues: the `new Date()` call breaks the documented purity invariant (INV-003), and the duplicated event type creates a drift risk. Fixing both would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
