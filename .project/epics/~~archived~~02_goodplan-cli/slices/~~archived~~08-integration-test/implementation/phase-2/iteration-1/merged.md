# Merged Review — Phase 2: Integration Tests (Iteration 1)

**Reviewers:** Generalist (9/10), TypeScript (8/10), Software Architecture (8/10)
**Merged Score: 8/10**

## Critical (0)

None.

## Important (4)

### IMP-1: Unsafe `result.json` property access without narrowing
**Source:** TypeScript
**Files:** workflow-slice.test.ts, workflow-quest.test.ts, workflow-epic.test.ts, error-transitions.test.ts

`result.json` is typed `unknown` but tests cast with `as Record<string, unknown>` or `as { error: { code: string } }` without checking `result.json` is defined first. Some tests already do `expect(result.json).toBeDefined()` before the cast (e.g., workflow-init.test.ts), but most chain-based tests skip it. If JSON output shape changes, tests throw confusing runtime errors instead of clear assertion failures.

**Fix:** Add `expect(result.json).toBeDefined()` before every cast, or create a typed narrowing helper used consistently.

### IMP-2: Duplicate test coverage between smoke.test.ts and dedicated files
**Source:** Software Architecture

`smoke.test.ts` contains `--version`, `--help`, and `init` tests that are fully duplicated in `runner-modes.test.ts` and `workflow-init.test.ts`. The smoke tests were appropriate for Phase 1 bootstrapping but now create maintenance burden.

**Fix:** Remove overlapping tests from `smoke.test.ts`, keeping only the `withFixture` infrastructure validation test (which is unique).

### IMP-3: `runner-modes.test.ts` epic:create validation test lacks GOODPLAN_DIR — fragile ordering dependency
**Source:** TypeScript, Software Architecture (converged)

The test at line 47 sends `{}` to `epic:create --json` without setting `GOODPLAN_DIR`, relying on validation running before project resolution. If command ordering changes, the test breaks for the wrong reason (`DATA_NO_PROJECT` instead of `VALIDATION_INVALID_INPUT`).

**Fix:** Set `GOODPLAN_DIR` to a temp dir so the test isolates validation behavior regardless of command execution order.

### IMP-4: workflow-init.test.ts does not use withFixture — manual cleanup boilerplate
**Source:** Generalist, TypeScript, Software Architecture (converged)

Init tests use manual `mkdtempSync` + `try/finally` + `fs.rmSync` in every test. Understandable since `init` creates `.project/` from scratch, but duplicates boilerplate across four tests and diverges from the suite pattern.

**Fix:** Extract a `withTempDir` helper (lighter than `withFixture`) to reduce repetition.

## Minor (6)

### MIN-1: `error-transitions.test.ts` — "non-existent slice" test name is misleading
**Source:** Generalist, TypeScript, Software Architecture (converged)

Test asserts `STATE_INVALID_TRANSITION` for a non-existent slice, but the name suggests entity-not-found semantics. The behavior is correct (state machine treats missing entity as invalid transition), but the naming obscures the intent.

**Fix:** Rename to "slice:plan on unknown slice returns STATE_INVALID_TRANSITION" or similar.

### MIN-2: `withFixture` calls `buildBinary()` internally but tests also call it in `beforeAll`
**Source:** TypeScript

Both `withFixture` and the test-level `beforeAll` call `buildBinary()`. The `FixtureContext` exposes `bin` but tests use the outer `bin` variable instead. Harmless but confusing.

**Fix:** Either remove `bin` from `FixtureContext` or use `ctx.bin` inside `withFixture` callbacks consistently.

### MIN-3: Missing `import type` for type-only import in helpers.ts
**Source:** TypeScript

`SpawnSyncReturns` from `node:child_process` is used only as a type annotation but imported with a value import. Tests are excluded from tsconfig so no build error, but inconsistent with project conventions (`verbatimModuleSyntax: true`).

**Fix:** Change to `import type { SpawnSyncReturns } from 'node:child_process'`.

### MIN-4: Missing abandon workflow coverage
**Source:** Software Architecture

`ABANDON_SLICE`, `ABANDON_EPIC`, and `ABANDON_QUEST` transitions (including clearing active pointers) have no integration test coverage. Important for recovery from stuck states.

**Fix:** Add abandon path tests to error-transitions.test.ts or a dedicated file.

### MIN-5: Missing sequential slice enforcement test (`STATE_SLICE_NOT_READY` guard)
**Source:** Software Architecture

The `slice-in-progress` fixture exists but no test exercises the cross-cutting guard that prevents starting the next slice before the current one completes/abandons.

**Fix:** Add a test using the `slice-in-progress` fixture to verify the guard.

### MIN-6: No verification of activity-log.jsonl after workflow transitions
**Source:** Software Architecture

INV-001 requires all mutations go through the state machine with activity logging, but no test checks that `activity-log.jsonl` grows after transitions.

**Fix:** Add a single assertion at the end of a lifecycle test checking the JSONL file has the expected number of lines.

## Resolved / Non-actionable

- **Plan vs. implementation command names** (Generalist): Plan says `start-plan`/`start-refinement`/`start-implementation` but tests use the correct real command names. Implementation is right; plan was imprecise. No action needed.
- **Circuit breaker fixture round 10/10 vs plan's suggested 9/10** (Generalist): Functionally equivalent — test exercises the correct behavior. No action needed.
- **`quest:complete` stdin field `architectureDelta` vs plan's `deferred`** (Generalist): Test passes with current schema. Plan was imprecise about the field name. No action needed.
