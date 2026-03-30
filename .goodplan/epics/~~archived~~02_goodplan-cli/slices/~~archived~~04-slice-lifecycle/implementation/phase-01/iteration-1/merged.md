# Merged Review: Phase 01 — StateEvent Types & Supporting Schemas

**Scores**: Generalist 9/10 | TypeScript 9/10 | SoftwareArchitecture 8/10
**Critical**: 0 | **Important**: 2 | **Minor**: 3

---

## Important

### I1: COMPLETE_SLICE spec divergence — update state-machine-api.md for payload types

`state-machine-api.md` defines `COMPLETE_SLICE` with `learnings: Learning[]` and `architectureDelta: ArchitectureDelta[]` (full storage types). The implementation uses `LearningInput[]` and `ArchitectureDeltaInput[]` (input-boundary types without `source`, `rollup`, `ts`). This is the correct design — the RPC layer enriches before storage — but the spec was not updated (only `CREATE_SLICE`'s `goal` field was updated in this phase). Update `state-machine-api.md` to reflect the input types so the spec remains the source of truth.

_Source: TypeScript + SoftwareArchitecture (SoftwareArchitecture more specific — kept that framing)_
_File: `src/schemas/state-events.ts:68-70`, `state-machine-api.md`_

### I2: `handleNotImplemented` uses unnecessary `as Handler<T>` casts — fix signature instead

`handleNotImplemented` discards `state` and `event` parameters and is cast at every call site with `as Handler<"X">`. The cast silences the type system. If a real code path is accidentally routed through these placeholders, state and event data are silently discarded. Fix the signature to accept (and prefix-ignore) the parameters:

```typescript
const handleNotImplemented = (_state: ProjectState, _event: StateEvent): StateError => ({
  tag: "error",
  ...
});
```

This eliminates all per-entry casts and makes the placeholder type-safe without suppression.

_Source: SoftwareArchitecture_
_File: `src/core/state/reduce.ts:51-54`_

---

## Minor

### M1: Inline `import()` types in COMPLETE_SLICE — use top-level `import type`

`COMPLETE_SLICE` references `DeferredItem`, `LearningInput`, and `ArchitectureDeltaInput` via inline `import("./entities/slice.js").X` syntax. Every other type in this file uses a top-level `import type` statement. Align to the established pattern for consistency and readability.

_Source: Generalist + TypeScript + SoftwareArchitecture (all agree; TypeScript most specific)_
_File: `src/schemas/state-events.ts:68-70`_

### M2: COMPLETE_SLICE event fields required, but CompleteInput fields are optional — document the coercion contract

`COMPLETE_SLICE` event type has `deferred`, `learnings`, and `architectureDelta` as required arrays. `CompleteInput` (slice variant) marks these optional. The RPC layer is expected to coerce `undefined` to `[]` before dispatching. This is the right split, but the contract is implicit. Add a brief comment at the optional fields in `CompleteInput` noting that the RPC layer must coerce to `[]` before dispatch.

_Source: Generalist_
_File: `src/core/rpc/types.ts`_

### M3: Pre-existing test events missing `ts` field

Several test event literals in `state-events.test.ts` (e.g., `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_IMPLEMENTATION`) omit the `ts` field. This is a pre-existing issue — not introduced here — and the new events correctly include `ts`. Fix the old test objects for consistency when convenient.

_Source: SoftwareArchitecture_
_File: `tests/unit/schemas/state-events.test.ts:135-138`_

---

## Deduplicated / Discarded

- **Generalist I1** (COMPLETE_SLICE optional vs required fields coercion): retained as M2 — generalist flagged as Important, but the architectural reviewers correctly treated the spec divergence as the primary issue; the coercion note is a minor documentation gap.
- **Generalist M2 / TypeScript M (formatting in reduce.ts)**: both reviewers noted diff noise from import reordering; not actionable, omitted from merged output.

---

## Positive Observations

- Clean input-vs-storage schema split follows INV-005/INV-007 correctly.
- `handleNotImplemented` + `satisfies` exhaustiveness check is the right incremental approach; only the cast pattern needs fixing.
- Architecture spec updated in lockstep for `CREATE_SLICE` `goal` field.
- Test coverage includes structural validation of all 29 event types including complex `COMPLETE_SLICE` payload.
- `exactOptionalPropertyTypes` respected throughout; discriminated union is well-structured.
