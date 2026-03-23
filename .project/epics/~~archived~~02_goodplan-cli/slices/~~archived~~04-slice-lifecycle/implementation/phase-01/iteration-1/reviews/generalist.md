# Phase 01 Review: StateEvent Types & Supporting Schemas

**Reviewer**: Generalist
**Score**: 9/10
**Critical**: 0 | **Important**: 1 | **Minor**: 2

---

## Summary

All six plan tasks completed correctly. The StateEvent union is extended with all 6 slice lifecycle events, input schemas for Learning and ArchitectureDelta are co-located with their storage schemas, CompleteInput in rpc/types.ts carries the optional payload fields, overviewItemSchema exports both the schema and the inferred type with optional `epic`, reduce.ts has placeholder handlers with compile-time exhaustiveness, and tests cover all 29 event types. Build passes, tests pass, linting clean.

## Important (1)

### I1: COMPLETE_SLICE event fields are non-optional but CompleteInput fields are optional

In `src/schemas/state-events.ts`, the `COMPLETE_SLICE` event has `deferred`, `learnings`, and `architectureDelta` as **required** arrays. In `src/core/rpc/types.ts`, the corresponding `CompleteInput` slice variant has these as **optional** (`deferred?: ...`, `learnings?: ...`, `architectureDelta?: ...`). This is likely intentional (the RPC layer will default missing fields to `[]` before dispatching the event), but this contract is implicit. If the Phase 2 reducer handler or a future RPC method forgets to coerce `undefined` to `[]`, runtime errors will occur. Consider adding a brief comment in the event type or in `CompleteInput` documenting this coercion expectation so Phase 2 implementers know to handle it.

## Minor (2)

### M1: Inline `import()` types in StateEvent union

The `COMPLETE_SLICE` variant uses `import("./entities/slice.js").DeferredItem[]` and similar inline import types rather than top-level `import type` statements. This works but is inconsistent with the rest of the file, which uses a standard `import type` at the top (e.g., for `Verification`/`VerificationResult`). Aligning the style would improve readability.

### M2: Import reordering and formatting changes in reduce.ts

The diff includes non-functional import reordering and function signature reformatting in `reduce.ts`. These are harmless (likely auto-formatter) but inflate the diff, making future git-blame noisier. Not actionable now, just noting.

## Positive Observations

- Clean separation of input schemas (validated at boundary) vs storage schemas (forward-compatible) follows INV-005/INV-007 correctly.
- `handleNotImplemented` stub pattern with `satisfies` exhaustiveness is a solid approach for incremental implementation.
- Architecture spec (`state-machine-api.md`) updated in lockstep with the code change to add `goal` to `CREATE_SLICE`.
- Test coverage includes structural validation of all new event types including the complex `COMPLETE_SLICE` payload.
