# Integration Review — Epic Lifecycle (All 6 Phases)

**Reviewer:** Claude (holistic integration)
**Scope:** 65 files, 7387 insertions, 164 deletions across phases 1-6
**Tests:** 409 passing, tsc clean, binary compiles

## Goal Alignment

The implementation matches the slice goal comprehensively:

- Full epic lifecycle: create, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, complete, abandon
- Verification management: add-verification, update-verification
- 8 submit commands: plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices
- Data layer upgrades: loadState with .state-cache.json, concurrent modification detection in commitState
- Transition table exports for future fitness functions

## Phase Integration Assessment

### Phase 1 -> Phase 3 (Types -> State Machine)
**Clean.** The 23-member StateEvent union in `state-events.ts` maps 1:1 to the `handlerRecord` in `reduce.ts`. The `satisfies` check ensures compile-time exhaustiveness — adding a new event type without a handler is a type error. All event variants carry `ts: string` per the documented convention.

### Phase 2 -> Phase 4 (Data Layer -> RPC)
**Clean.** All three RPC entry points (begin, complete, submit) follow the identical pattern: `loadState -> build event -> reduce -> commitState`. The `loadState`/`commitState` pair correctly threads `oldState` through for concurrent modification detection. Cache is written as the last step in commitState (crash-safe).

### Phase 3 -> Phase 4 (State Machine -> RPC)
**Clean.** `reduce()` returns `ProjectState | StateError`. All RPC functions check with `isStateError()` and throw `GoodplanError` on state errors, converting state-machine codes to CLI exit codes. No event types are constructed that don't exist in the handler map.

### Phase 4 -> Phase 5/6 (RPC -> CLI Commands)
**Clean.** Every CLI command follows the same pattern: parse stdin/args -> validate -> call RPC -> output result. The `begin()` function handles all epic lifecycle phases. The `submit()` function handles all submit phases. The `complete()` function handles epic completion.

### Phase 5/6 -> Registration (Commands -> main.ts)
**Clean.** All 14 epic:* commands and 8 submit-* commands are registered in `main.ts` with correct imports. No orphaned commands.

## Invariant Compliance

| Invariant | Status |
|-----------|--------|
| INV-001: All mutations through state machine | Pass — all commands route through RPC -> reduce() -> commitState() |
| INV-002: Deterministic key ordering | Pass — commitState uses deterministicStringify for JSON, deterministicStringifyCompact for JSONL |
| INV-003: State machine is pure | Pass — reduce.ts and all transition handlers import only from schemas and tree.js (no fs, no path for I/O) |
| INV-004: Stateless commands with target flags | Pass — all epic commands require --epic, submit commands require --slice/--epic/--quest |
| INV-005: Schema validation on read and write | Pass — assembleState validates on read, commitState validates before write (uses result.data) |
| INV-006: Schema reflects actual signatures | N/A for this review (schema command not modified) |
| INV-007: Structured errors with exit codes | Pass — state errors use STATE_* codes (exit 3), validation errors use VALIDATION_* (exit 2) |

## Issues Found

### Minor

1. **Unnecessary `await` on synchronous functions.** All epic:* commands use `await begin(...)` and `await complete(...)` but these functions return plain values, not Promises. This is harmless (JS auto-wraps in a resolved Promise) but misleading — readers may assume these are async I/O operations. Contrast with submit commands which correctly call `submit(...)` without `await`. Consistency should go one direction.

2. **`setEpicStatus` in helpers.ts is defined but never called.** The lifecycle handlers use `setEpicJson` directly instead (which gives them control over all fields). The helper exists as a convenience but is dead code currently.

3. **loadState incremental update only detects new/removed files, not content changes.** This is documented as a known limitation (comment at top of load.ts) and bounded by commitState always writing a fresh cache, but worth noting: if an external tool edits a JSON file without adding/removing files, the cache will serve stale data until the next commitState.

## Strengths

- **Exhaustiveness checking everywhere.** The `satisfies` pattern in reduce.ts, `never` checks in switch defaults across begin/submit/complete, and typed Extract patterns make it impossible to add an event type without wiring it through every layer.
- **Shared refinement circuit breaker.** The `evaluateRefinement` helper in helpers.ts is correctly reused across epic refine-architecture, epic refine-slices, slice refinement, and quest refinement — 4 handlers sharing one implementation.
- **Crash-safe write ordering.** JSON first, JSONL second, cache last. Cache failure is non-fatal. Atomic writes via tmp+rename.
- **Clean rpcInit migration.** `rpcInit` is now a thin wrapper over `begin('create', {type:'project'})`, preserving backward compatibility while using the new generic RPC layer.
- **Transition table exports.** Every transition module exports its transition rows, enabling future fitness function enumeration (slice 08).

## Verdict

The implementation is well-integrated across all 6 phases. The layering is clean: types -> state machine -> RPC -> CLI, with no backward dependencies or architectural violations. The 3 minor issues are cosmetic or documentation-level; none affect correctness.

**Score: 9/10** | Critical: 0, Important: 0, Minor: 3
