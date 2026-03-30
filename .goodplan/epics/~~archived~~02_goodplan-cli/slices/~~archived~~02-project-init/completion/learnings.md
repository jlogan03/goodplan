# Learnings: 02-project-init

## Pure tree types need a shared module — the data layer is too specific a home

The architecture placed tree types (`ProjectState`, `StateEntry`, navigation helpers) in the data layer (`src/core/data/`), but the state machine also needs them for guards and transition handlers. The integration review caught this as a CRITICAL layer boundary violation. Fix: extracted to `src/core/tree.ts` as a shared pure module (zero I/O dependencies). Future slices should place pure types that cross layer boundaries in shared locations from the start, not in the first layer that needs them.

## Reducers must receive timestamps via event payload — new Date() breaks purity

The initial INIT_PROJECT handler used `new Date().toISOString()` inside the reducer, violating INV-003 (reducer purity — same inputs must produce same output). All three reviewers caught this independently. The RPC layer now injects a `ts` field on the event payload. Every future `StateEvent` variant that needs timestamps must include `ts`, populated by the RPC layer before calling `reduce()`.

## Zod 4 safeParse().data is the canonical output — write that, not the input

`commitState` initially wrote the original object after Zod validation, not `result.data`. In Zod 4, `safeParse` may strip unknown keys or coerce values during parsing. Writing the input instead of `result.data` causes in-memory/on-disk divergence that compounds as schemas evolve. Always write `result.data` — it represents what Zod actually validated and normalized.

## Schema field shapes should match architecture from the start

The slice `deferred` field was implemented as `z.array(z.string())` but the architecture specifies `DeferredItem` objects with `description` and `targetSlice` fields. Caught in integration review. Even for fields not yet exercised by the current slice, matching the architecture shape prevents breaking schema changes when later slices exercise the field. Cost of fixing is minimal now vs. migration pain later.

## StateEvent needs a documented ts convention in the architecture

Adding `ts: string` to `INIT_PROJECT` was a good design decision (keeps reducers pure by externalizing non-determinism), but it diverges from the documented `state-machine-api.md`. This is a pattern all future events will follow. The architecture doc needs a convention: "Events that produce timestamped entities include a `ts: string` field, injected by the RPC layer."
