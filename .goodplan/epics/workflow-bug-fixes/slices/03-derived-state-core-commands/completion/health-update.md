# Health Update: 03-derived-state-core-commands

## What Improved

- **Engine layer is now complete.** All three foundation subsystems (Event Engine, Invariant Engine, Derived State Computer) are implemented and tested. This unblocks all command-layer slices (04-12).
- **Test coverage is strong.** 133 tests across 10 test files cover: unit (compute, accessors, serialize), integration (replay-all-scopes, init-integration), and end-to-end (CLI smoke test).
- **v2 commands replace v1 cleanly.** `gp init`, `gp status`, `gp schema`, and `gp migrate` now use event-sourced state. Backward compatibility maintained for `gp status --json` output shape.
- **Architectural boundaries are clean.** No circular dependencies. Dependency direction verified: `engine/ -> schemas/ + util/` only, `commands/ -> engine/ + schemas/`.

## What Degraded

- **Hybrid data sourcing in buildStatusResult.** Artifact file lists come from filesystem scanning rather than events. This is a temporary dual-source-of-truth that adds complexity.
- **8 stub reducers.** Most event domains have no-op reducers. This is expected but means the derived state is incomplete -- commands that query refinement, exploration, or trust data will need to be aware of this.
- **Stale entity detection is non-functional.** The v1 feature (warning about inactive entities) is stubbed out. Users who relied on this signal will not see it until lastActivityTs is added.

## Overall Trajectory

**Improving.** The engine layer foundation is solid. The critical bridge between event engine and command layer is working. The 5-phase implementation went smoothly with high plan accuracy. The main risk going forward is managing the v1/v2 coexistence complexity as more commands migrate -- but the patterns established here (parallel registry, backward-compat output shapes, hybrid data sourcing) provide a roadmap.
