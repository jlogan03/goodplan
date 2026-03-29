# TypeScript Review — Phase 01: Decision & Rollup State Machine

## Issues

**[MINOR]** Transition map allocated on every `handleUpdateDecision` call
The `validTransitions` record with `new Set(...)` values is created inside the function body, meaning every invocation allocates fresh Set objects. The existing codebase pattern (see `DECISION_TERMINAL_STATUSES`, `SLICE_TERMINAL_STATUSES`, `EPIC_TERMINAL_STATUSES` in `helpers.ts`) is to define these as module-level constants. This is a pure style/consistency issue — the performance impact is negligible for a CLI tool, but it diverges from the established pattern.
File: src/core/state/transitions/decision.ts:98
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `validTransitions` uses `Record<string, ReadonlySet<string>>` instead of typed keys
The `validTransitions` key type is `string` rather than using the `DecisionEntry["status"]` type or a union literal. This means a typo in a key name (e.g., `"acitve"`) would silently pass. Using typed keys would give compile-time safety. This is low-risk since the keys are simple and tested, but it misses an opportunity TypeScript provides.
File: src/core/state/transitions/decision.ts:98
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. Types are precise — `Extract<StateEvent, { type: ... }>` for narrowing, `Partial<Omit<DecisionEntry, "id" | "date">>` for the changes type, proper `noUncheckedIndexedAccess` compliance with `!` assertions only after bounds-checked indexing. The code follows all established patterns: one file per transition, pure functions with no I/O, `appendActivityLog` on every mutation, batch operations for the O(n^2) fix. The `isStateError` type guard is used correctly throughout tests. Schema types are inferred from Zod (`z.infer`). Import style uses `type` imports where appropriate per `verbatimModuleSyntax`. The two minor issues are style/consistency nits that don't affect correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
