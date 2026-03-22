# Software Architecture Review — Phase 01: StateEvent Types & Status Enums

## Issues

**[IMPORTANT]** `DATA_CONCURRENT_MODIFICATION` is duplicated across two error code sources
`DATA_CONCURRENT_MODIFICATION` appears in both `StateErrorCode` (in `src/schemas/state-events.ts`) and `DataErrorCode` (in `src/util/errors.ts`). The `GoodplanErrorCode` union combines both via `DataErrorCode | StateErrorCode`, so today this doesn't cause a type error — string literal unions deduplicate. However, it violates single-source-of-truth: the code has two authoritative locations for the same error code, and the `DATA_` prefix conventionally belongs to the Data Layer namespace, not the State Machine namespace. If someone removes it from `DataErrorCode` thinking the state-events version covers it (or vice versa), the other location silently becomes the sole source. The code should live in exactly one namespace — `DataErrorCode` in `errors.ts` is the natural home since concurrent modification is a Data Layer concern (filesystem-level), not a state machine concern.
File: src/schemas/state-events.ts:74
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Exhaustiveness test for event types is runtime-only, not compile-time enforced
The test at line 141 of `state-events.test.ts` lists all 23 event types in an array typed `StateEvent["type"][]` and checks the count. This catches additions to the union (the array would be short) but not removals — if an event type is removed from `StateEvent`, the test would fail to compile only if that specific string literal is no longer in the union. More critically, if a new event type is added to `StateEvent`, this test still passes (23 === 23) until someone manually adds the new type. A stronger compile-time approach: use a mapped type or `satisfies` to enforce that the array covers every member of the union. This is a minor style point since the individual per-type tests above provide good coverage.
File: tests/unit/schemas/state-events.test.ts:141
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation is clean, well-aligned with the architecture spec, and respects all documented invariants. The `StateEvent` discriminated union matches `state-machine-api.md` exactly (after the `ts` amendment). The `epicSchema` extension reuses `refinementSchema` from `shared.ts` consistent with `sliceSchema` and `questSchema`. The `verificationResultSchema` and `verificationSchema` are properly co-located with the epic entity. Error codes match the cross-cutting guards table in `transition-tables.md`. The architecture doc amendment (adding `ts` to `CREATE_EPIC` and `ACTIVATE_EPIC`) was done before the code change, preserving the doc-as-source-of-truth pattern. The `reduce.ts` default branch correctly handles unknown events with `STATE_INVALID_TRANSITION`, and the switch-to-handler-map migration is properly deferred. No INV violations detected. The one IMPORTANT issue (duplicated error code across namespaces) is a small ownership clarity concern.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
