# Merged Feedback — Integration Tests & Fitness Functions (Slice 08)

## CRITICAL Issues

**C1. Plan references non-existent error codes in Phase 2 error-transitions tests**
Flagged by: TypeScript (CRITICAL), Holistic (IMPORTANT), TUI/CLI (IMPORTANT), Software Architecture (IMPORTANT)

The plan references `STATE_SLICE_NOT_FOUND` and `STATE_GUARD_FAILED` — neither exists in `StateErrorCode`. The actual codes are:
- "Slice not found" scenarios → `STATE_INVALID_TRANSITION`
- "Activate without verification" → `STATE_MISSING_VERIFICATIONS`
- `STATE_SLICE_NOT_READY` (already referenced correctly in the plan)

Fix: Replace all invented error codes with actual codes from `src/schemas/state-events.ts`. Add specific expected error code for each test scenario.
Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

**I1. Missing vitest configuration for integration test timeouts**
Flagged by: TypeScript (IMPORTANT), TUI/CLI (IMPORTANT), Software Architecture (IMPORTANT), Holistic (MINOR)

No `vitest.config.ts` exists. `buildBinary()` in `beforeAll` and binary-spawning tests need longer than the default 5s timeout. The research file explicitly flags this gap.

Fix: Add a Phase 1 task to create a vitest config (or workspace config) setting ~30s timeout for `tests/integration/` and `tests/fitness/`.
Resolution: DIRECTLY_ACTIONABLE

**I2. `error-concurrent.test.ts` (Phase 2) is not testable at the binary-spawn level**
Flagged by: TUI/CLI (IMPORTANT), Software Architecture (MINOR)

Concurrent modification detection happens within a single `commitState()` call — it compares on-disk content against the `oldState` snapshot from the same invocation. Two separate binary invocations each get their own fresh `assembleState()` snapshot, so external file modification between two commands won't trigger the error. The invariant is already properly tested in Phase 3's `concurrent-modification.test.ts` which calls the Data Layer API directly.

Fix: Remove `tests/integration/error-concurrent.test.ts` from Phase 2. The concurrent modification invariant is covered by Phase 3's fitness function.
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 3 `transition-completeness.test.ts` should use `handlerRecord` keys instead of a new `EVENT_TYPES` export**
Flagged by: TypeScript (IMPORTANT)

The plan proposes adding an `EVENT_TYPES` const array to production code. But `handlerRecord` in `src/core/state/reduce.ts` already has compile-time exhaustiveness via `satisfies`. The fitness test can derive event types from `Object.keys(handlerRecord)` with a type assertion, avoiding a separate array that could drift.

Fix: Export `handlerRecord` (or derive `EVENT_TYPES` from it via `Object.keys(handlerRecord) as StateEvent["type"][]`) rather than maintaining a separate array.
Resolution: DIRECTLY_ACTIONABLE

**I4. Fitness functions cover only 5 of 7 invariants — INV-004 and INV-006 are missing**
Flagged by: Holistic (IMPORTANT)

Phase 3 covers INV-001/002, INV-003, INV-005, INV-007. Missing:
- **INV-004** (every command is stateless — target flags required): No test verifies mutation commands require explicit target flags.
- **INV-006** (schema output reflects actual command signatures): No test verifies `schema` command output matches command definitions.

The confirmed goal says "7 fitness functions." Either add the missing 2 or clarify which 7 are in scope.
Resolution: DIRECTLY_ACTIONABLE

**I5. `state-machine-purity.test.ts` should distinguish `import type` from value imports**
Flagged by: TypeScript (IMPORTANT)

The purity fitness test scans `src/core/state/` for I/O imports, but `import type` statements produce no runtime I/O and are safe. The test must only flag value imports of I/O modules, not type-only imports.

Fix: Test should parse imports and skip `import type` statements. Only value imports of I/O modules (fs, path, child_process, etc.) violate purity.
Resolution: DIRECTLY_ACTIONABLE

**I6. `withFixture` helper needs to handle `GOODPLAN_DIR` env var or cwd for binary spawning**
Flagged by: TypeScript (IMPORTANT)

The existing codebase uses `GOODPLAN_DIR` env var to override the `.project/` location. The helper must either set `cwd` to the fixture's parent directory or set `GOODPLAN_DIR` when spawning the binary. The plan is ambiguous on this.

Fix: Specify that `withFixture` sets `cwd` to the temp directory containing the `.project/` structure when spawning the binary.
Resolution: DIRECTLY_ACTIONABLE

**I7. Phase 2 workflow tests use ambiguous CLI command names**
Flagged by: Holistic (IMPORTANT)

The plan uses commands like `slice:plan (submit-plan)` which is ambiguous — `slice:plan` triggers a phase transition while `submit-plan` is a sub-agent content submission. Integration tests need both for a full lifecycle chain.

Fix: Specify exact command names for each test step, distinguishing between state-transition commands and content-submission commands.
Resolution: CODEBASE_EXPLORATION

**I8. Phase 3 fitness functions that import production modules should acknowledge this design choice**
Flagged by: Software Architecture (IMPORTANT)

`data-determinism.test.ts`, `schema-validation.test.ts`, `tree-accuracy.test.ts`, and `concurrent-modification.test.ts` import and call `assembleState()`/`commitState()` directly. This is appropriate for Data Layer invariants (INV-002, INV-005) since these properties aren't observable through the CLI binary, but the plan should explicitly acknowledge the distinction.

Fix: Add a note in Phase 3 overview: "Data Layer fitness functions import production modules directly because these invariants are internal to the Data Layer and not observable through the CLI binary interface."
Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**M1. Plan says "No production code changes" but Phase 3 allows EVENT_TYPES export**
Flagged by: Software Architecture (MINOR)

Self-contradiction in Key Decisions section. If I3 is resolved by exporting `handlerRecord`, update the note accordingly.

Fix: Update Key Decisions to acknowledge the minimal production code change (exporting `handlerRecord` or equivalent).
Resolution: DIRECTLY_ACTIONABLE

**M2. Plan locates EVENT_TYPES in wrong module**
Flagged by: Software Architecture (MINOR)

Plan says `src/core/state/` but the `handlerRecord` is in `src/core/state/reduce.ts` and `StateEvent` is in `src/schemas/state-events.ts`. If deriving from `handlerRecord` (per I3), it belongs in `reduce.ts`.

Fix: Specify exact file: `src/core/state/reduce.ts`.
Resolution: DIRECTLY_ACTIONABLE

**M3. Should use `node:child_process` for binary spawning, not `Bun.spawnSync`**
Flagged by: TypeScript (MINOR), TUI/CLI (MINOR)

The compiled binary is a standalone executable. `node:child_process` (`execFileSync`/`spawnSync`) is appropriate and consistent with existing test imports.

Fix: Specify `node:child_process` definitively.
Resolution: DIRECTLY_ACTIONABLE

**M4. Fixture generation approach may produce non-deterministic fixtures**
Flagged by: Software Architecture (MINOR)

Generated fixtures contain timestamps that vary per run. Complex fixtures beyond `fresh-init` should be hand-crafted with fixed timestamps (e.g., `2026-01-01T00:00:00.000Z`).

Fix: Clarify that all fixtures beyond `fresh-init` should be hand-crafted with fixed timestamps.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 2 exit code assertions should verify correct output stream (stdout vs stderr)**
Flagged by: TUI/CLI (MINOR)

Tests should assert that `--json` error output goes to stdout and non-JSON errors go to stderr, per the architecture.

Fix: Add explicit stream assertions for each error output mode.
Resolution: DIRECTLY_ACTIONABLE

**M6. Circuit breaker test doesn't specify maxRounds source**
Flagged by: TUI/CLI (MINOR)

`error-circuit-breaker.test.ts` says "hit maxRounds" but doesn't specify where the value comes from or how the test should discover it.

Fix: Note where `maxRounds` is defined so the test can reference or import it.
Resolution: CODEBASE_EXPLORATION

**M7. No `NO_COLOR` / `FORCE_COLOR` testing**
Flagged by: TUI/CLI (MINOR)

No test verifies the binary respects `NO_COLOR` and `FORCE_COLOR` env vars. The codebase uses picocolors which handles this automatically, but a regression test would be valuable.

Fix: Add a test case in `runner-modes.test.ts` verifying color-free output when `NO_COLOR=1`.
Resolution: DIRECTLY_ACTIONABLE

**M8. Fitness function count doesn't match confirmed goal**
Flagged by: Holistic (MINOR)

Confirmed goal says "7 fitness functions." With INV-004 and INV-006 added (per I4), count would be 9. Update the goal or clarify scope.

Fix: Reconcile the count with the actual fitness function list.
Resolution: DIRECTLY_ACTIONABLE

**M9. Phase 1 "before" check description is misleading**
Flagged by: Holistic (MINOR)

The `ls` check description says "only `.gitkeep` exists" but the check commands would show nothing (`.gitkeep` is not a JSON file or directory).

Fix: Update description to "no fixture files exist yet."
Resolution: DIRECTLY_ACTIONABLE

**M10. No documentation update tasks for new test infrastructure**
Flagged by: Holistic (MINOR)

Plan introduces fixtures, helpers, integration tests, and fitness functions with no task to document how to run them or explain the approach.

Fix: Add a brief documentation task or comment in the test helper.
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

C1, I1, I2, I3, I4, I5, I6, I8, M1, M2, M3, M4, M5, M7, M8, M9, M10 — **17 items**

## RESEARCH_NEEDED

I7 (CODEBASE_EXPLORATION — verify exact CLI command names for workflow tests), M6 (CODEBASE_EXPLORATION — locate maxRounds definition) — **2 items**

## Contradictions Resolved

1. **Severity of error codes issue**: TypeScript rated CRITICAL, others rated IMPORTANT. Trusting TypeScript (domain specialist) — elevated to CRITICAL in merged output. The issue would cause tests to assert against non-existent values, producing false passes or confusing failures.

2. **Severity of concurrent modification test**: TUI/CLI rated IMPORTANT, Software Architecture rated MINOR. Trusting TUI/CLI (domain specialist for testing binary behavior) — elevated to IMPORTANT. The test is fundamentally untestable at the binary-spawn level.

3. **Severity of vitest timeout**: Holistic rated MINOR, three others rated IMPORTANT. Majority + specialist agreement — kept at IMPORTANT.

## Unresolved (USER_INPUT required)

None.

## Available Research

### I7 Resolution — Exact CLI Command Names

**Slice Lifecycle (full chain for workflow tests):**
1. `slice:create` — create a slice
2. `slice:plan` — BEGIN_PLAN transition
3. `start-plan` — start planning subagent
4. `submit-plan` — submit plan content
5. `slice:refine-plan` — BEGIN_REFINEMENT transition
6. `start-refinement` — start refinement subagent
7. `submit-refinement` — submit refinement content
8. `slice:implement` — BEGIN_IMPLEMENTATION transition
9. `start-implementation` — start implementation subagent
10. `submit-implementation` — submit implementation content
11. `slice:complete` — complete a slice

**Epic Lifecycle:**
- `epic:create`, `epic:activate`, `epic:list`, `epic:show`

**Quest Lifecycle:**
- `quest:create`, `quest:plan`, `start-plan`, `submit-plan`, `quest:refine-plan`, `start-refinement`, `submit-refinement`, `quest:implement`, `start-implementation`, `submit-implementation`, `quest:complete`

Note: `start-*` and `submit-*` commands are shared between slices and quests — they detect the active target from context.

### M6 Resolution — maxRounds Location

`MAX_REFINEMENT_ROUNDS = 10` is defined at `src/core/state/transitions/helpers.ts` line 18. It's used by `evaluateRefinement()` (lines 238-275 in same file) which returns `STATE_MAX_ROUNDS_REACHED` when `refinement.round >= refinement.maxRounds`. The circuit breaker test should import or reference this constant.
