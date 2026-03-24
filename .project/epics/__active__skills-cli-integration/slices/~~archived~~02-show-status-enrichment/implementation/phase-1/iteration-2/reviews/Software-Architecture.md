# Software Architecture Review — Phase 1: Show Artifact Enrichment (Iteration 2)

## Issues

No issues found.

## Score: 10/10

The implementation is architecturally clean and well-aligned with the system's layering, invariants, and epic target architecture.

Key observations:

- **Module boundary placement is correct.** `src/core/artifacts.ts` is a peer to `src/core/tree.ts` — a pure function interpreting the state tree with no I/O. It is not placed in `src/core/data/` (which would imply filesystem access) or in `src/core/state/` (which would violate INV-003). The JSDoc module comment explicitly states it must not be imported by the state machine.
- **Dependency direction is correct.** `artifacts.ts` depends only on tree types (shared pure types) and schema types (Zod inferred). The Commands layer imports it; the State Machine does not (verified via grep — no imports from `src/core/state/`). This follows the unidirectional dependency rule: Commands -> Core (pure helpers) -> Types.
- **Type narrowing via overloaded signatures** provides a deep interface — callers get `EpicArtifactFlags` or `SliceArtifactFlags` automatically based on the entity type string, with no runtime type assertions needed at call sites. This is the right design for a function consumed by three show commands with different entity shapes.
- **Schema placement follows established precedent.** `src/schemas/commands/artifacts.ts` mirrors `src/schemas/commands/status.ts` — computed projections that appear in command output only, never persisted. The TODO comment correctly notes that output schema exposure via `schema --command` is deferred.
- **Epic architecture alignment is solid.** The `completion` field discrepancy identified in the research was resolved by updating the convention doc to remove `completion` (matching the plan's 6-field shape). The artifact shape matches `cli-changes.md` section 2 exactly.
- **INV-001 (mutations through state machine):** Not affected — this is a read-only enrichment on show commands.
- **INV-003 (state machine purity):** Verified — `src/core/state/` has no imports of `artifacts.ts`.
- **INV-005 (schema validation):** Zod schemas are defined but not yet wired into runtime output validation — the TODO comment documents this correctly, and output schema exposure is explicitly deferred.
- **INV-006 (schema output accuracy):** Not affected — the `schema` command only exposes args/stdin schemas, not output schemas.
- **All 92 fitness function tests pass.** No regressions.
- **Test boundaries align with module boundaries.** Unit tests exercise `detectArtifacts()` through its public API with tree fixtures. Integration tests exercise the full command pipeline. No internal mocking.
- **`getDir()` returning `undefined` is handled.** The `detectArtifacts()` function accepts `DirectoryEntry | undefined` and falls back to `EMPTY_DIR`, so a missing directory path produces all-false flags rather than a crash. This is a defensive design that handles edge cases gracefully.

## Summary
- Critical: 0
- Important: 0
- Minor: 0
