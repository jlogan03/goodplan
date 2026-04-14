# Architecture Delta: 03-derived-state-core-commands

## Alignment

- **Derived State Computer** matches architecture exactly: `src/engine/derived-state/` with `compute.ts`, `reducers.ts`, `accessors.ts`, `serialize.ts`, `replay-all-scopes.ts`, `index.ts` barrel.
- **DerivedStateData interface** matches `engine.md` specification: `project`, `epics: Map`, `sideQuests: Map`, `convergenceSnapshots: Map`, `latestDimensionScores: Map`.
- **Phase detection** implements the phase-boundary event table from `engine.md` correctly (P0-P12 for epics, S0-S3 for side-quests).
- **Dependency direction** is correct: derived-state depends only on schemas and util. No reverse dependencies. `invariants/ -> derived-state/` direction maintained.
- **Command layer** follows the citty `defineCommand` pattern with `globalArgs` spread.

## Drift

1. **gp init emits only `project-initialized`** -- architecture (`commands.md`) says init emits 4 events including `architecture-committed`, `conventions-committed`, `subsystem-registered`. The other 3 are intentionally deferred to slice 07 (spine commands). This is documented in the plan but the architecture doc does not reflect the phased approach.

2. **Error code: STATE_ALREADY_INITIALIZED vs ALREADY_EXISTS** -- `commands.md` specifies `ALREADY_EXISTS` as the v2 error code for uniqueness violations. The implementation uses the v1 error code. Minor drift, should be corrected when error codes are unified.

3. **Stale entity detection is stubbed** -- `buildStatusResult.detectStaleEntities` returns empty because `DerivedStateData` does not track `lastActivityTs` per entity. The architecture implies warnings should be populated from derived state.

4. **Stub reducers for 8 of 11 domains** -- Only `entity-lifecycle`, `spine`, and `pause-steering` are implemented. Other domains (`refinement`, `exploration`, `pressure-test`, `finding`, `briefing`, `decision-learning`, `reshape`, `milestone`) are stubs. Expected -- these are built incrementally in later slices.

## Gaps

1. **No `gp verify` command yet** -- listed in global commands but not implemented in this slice (planned for a later slice).
2. **No ContentRef population** -- `gp init` does not create ContentRef objects. Content addressing is deferred.
3. **Trust projections (convergenceSnapshots, latestDimensionScores) are placeholder types** -- defined but never populated. Trust layer (slice 04+) fills these in.
4. **No `--agent-return` or `--output` flags on `gp schema`** -- deferred to later slices per plan.

## Emergent Patterns

1. **Sub-package convention for command helpers** -- `src/commands/global/status/build-result.ts` establishes a pattern where complex commands get a subdirectory for helper modules. This should be documented as a convention.
2. **Filesystem scanning fallback pattern** -- `buildStatusResult` uses a hybrid approach: derived state for entity counts, filesystem scanning for file lists. This pattern will recur until artifact-tracking events exist.
