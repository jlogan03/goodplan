# Architecture Delta: 02-invariant-engine

## Alignment

- **Location:** Invariant engine at `src/engine/invariants/` matches architecture exactly.
- **Dependency direction:** Engine layer imports only from `schemas/` and `util/`. No imports from trust, context, or commands.
- **24 core invariants:** All 24 rules from the architecture catalog are implemented.
- **GitOps port:** `src/engine/interfaces/git-ops.ts` matches the architecture's ports-and-adapters design.
- **Pure synchronous checks:** All rules are `(event, ctx) => violation | null` with no I/O.

## Drift

1. **`ruleType` vs `type` on InvariantRule.** Architecture doc specifies `type: InvariantRuleType`. Implementation uses `ruleType` to avoid JS keyword collision and confusion with `event.type`. This is intentional and should be reflected in the architecture doc.

2. **CheckContext uses event replay, not DerivedState.** Architecture shows `checkInvariants(event, derivedState, rules)` with `DerivedStateData` as the second argument. Implementation uses `CheckContext` wrapping raw events with pre-indexed maps. This was a deliberate design choice to avoid a circular dependency (invariants run before state is computed). The `CheckContext` interface is designed for forward-compatible extension when derived state lands in slice 03.

3. **`appliesTo` domain filtering is registry-side, not rule-side.** Architecture doesn't specify how domain filtering works. Implementation adds `appliesTo: EventDomain[]` on each rule and filters in `registry.getByDomain()`. Empty array means "all domains."

## Gaps

1. **No `DerivedStateData` integration yet.** Architecture shows invariants receiving derived state. Current implementation works on raw events only. Slice 03 (Derived State Computer) will need to either extend `CheckContext` or provide a parallel path.

2. **YAML extensible invariants not connected to CLI commands.** Architecture specifies `gp invariant:list/propose/activate/deactivate/check` commands. Only the loader/parser is built; CLI integration deferred to the commands layer slice.

3. **`spine.write-only-via-milestone` is a placeholder.** Checks for preceding `milestone-committed` event, but the milestone system design is not finalized. Will need rework.

## Emergent Patterns

1. **Declarative YAML DSL for custom invariants** (`event-count`, `field-exists`, `field-matches`) with no eval/Function. Safe, portable, auditable. Could be extended with more check types.

2. **`GetCheckContext` factory pattern** for lazy context loading. Production uses replay; tests inject pre-built contexts. Clean separation.

3. **`InvariantError` as a structured error class** with `violations` array. Provides rich error reporting for callers without string parsing.
