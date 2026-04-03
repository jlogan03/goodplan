# Integration Review: Test Harness Foundation

**Reviewer:** Generalist
**Score:** 8/10
**Issues:** Critical: 0, Important: 2, Minor: 3

## Goal Alignment

The implementation delivers on all major plan goals:

- **Shared utilities extracted:** `utils.ts` (809 lines) exports all specified functions: `createLogger`, `gp`, `gpJson`, `gpForce`, `verifyEntityStatus`, `checkViolation`, `createCostTracker`, `writeTranscriptEntry`, `flushTranscript`, `isSuccess`, `runSkillSession`, `createMinimalFixture`, `parseModel`, `tierDefault`, `createSimulatedUser`, `createAskUserHandler`, `FixtureSetupError`, `CliResult`.
- **Simulated user with persistent session:** Implemented via `AsyncQueue<SDKUserMessage>` feeding a persistent `query()` session. Accumulates conversation history across questions. Uses Agent SDK subscription (no ANTHROPIC_API_KEY needed).
- **Model selection:** `parseModel()` + `tierDefault()` used consistently across all 5 scripts.
- **All 5 scripts migrated:** test-plugin-skills, test-onboard, test-migrate, validate, harness all import from `./utils`.
- **AUTONOMOUS removed:** `grep` confirms zero matches across all dogfood scripts.
- **firstOption removed:** `grep` confirms zero matches across all dogfood scripts.
- **`.project/` references cleaned up:** Only in test-migrate.ts (intentional, testing migration FROM .project/) and test-utils.ts (testing that checkViolation does NOT flag .project/).

## Cross-Phase Integration

Phases work well together:

- Phase 1 utilities are consumed by Phase 2 (simulated user uses `createCostTracker`, `tierDefault`) and Phase 3 (all scripts import from utils).
- `runSkillSession` correctly composes Phase 2's `createAskUserHandler` with Phase 1's `checkViolation` when both `simulatedUser` and `checkViolations` are provided.
- The `SkillSessionResult` return type cleanly bundles violations, cost, and result for callers.
- Test coverage from Phase 1 (34 unit tests, 29 integration tests) validates the foundation that Phases 2-3 build on.

## Important Issues

### 1. Simulated user architecture diverged from plan (persistent vs stateless)

The plan specifies a **stateless** simulated user using direct `@anthropic-ai/sdk` `messages.create()` calls. The implementation uses a **persistent** Agent SDK `query()` session with `AsyncQueue` feeding messages. This is architecturally significant:

- **Pro:** Persistent session accumulates context naturally -- better answer quality across multi-question sequences.
- **Pro:** Uses Agent SDK subscription, removing the `@anthropic-ai/sdk` / `ANTHROPIC_API_KEY` dependency for the simulated user.
- **Con:** The `close()` method is now required (plan said "No `close()` needed -- stateless, no hang risk"). Every caller must remember to close. Most scripts handle this correctly via `finally` blocks or explicit `close()`.
- **Con:** `AsyncQueue` is single-consumer with a stored `resolve` callback -- concurrent `ask()` calls would race. The JSDoc documents this, but no runtime guard prevents it.
- **Con:** The `drainLoop` catch handling for AbortError is fragile -- it checks `err.message.includes("aborted")` which is implementation-dependent.

This is a reasonable architectural improvement but should be explicitly documented as a plan deviation.

### 2. validate.ts and harness.ts use inline `log()` instead of `createLogger`

Both validate.ts (line 47-49) and harness.ts (line 147-148) define their own `log(file, content)` function that takes a filename parameter and appends to `LOG_DIR/file`. This is a different pattern from `createLogger()` which returns a logger bound to a single file. The plan says "Replace inline logging with `createLogger()`" for all scripts. test-plugin-skills.ts, test-onboard.ts, and test-migrate.ts correctly use `createLogger`. validate.ts and harness.ts retain inline helpers because they log to multiple files per run -- this is a pragmatic choice but an incomplete migration.

## Minor Issues

### 1. `SimulatedUser` interface includes `close()` but plan said "No close() needed"

The exported `SimulatedUser` interface (line 77-81) includes `close(): void` and `totalCost(): number`. The `totalCost()` method is a useful addition not in the plan. The `close()` method reflects the persistent session architecture. If the simulated user were ever reverted to stateless, callers would break. Consider documenting the interface contract more explicitly.

### 2. Hardcoded fallback path in `resolveDefaultGpBin`

Lines 57-65 of utils.ts have a hardcoded fallback to version `1.0.2/macos-arm64`. The warning message is good, but this path will inevitably go stale. The dynamic resolution (lines 39-54) should cover most cases, making this a low-risk issue.

### 3. Type narrowing uses `as Record<string, unknown>` casts

The `drainLoop` in `createSimulatedUser` (lines 460-479) and `onMessage` callbacks across scripts use `as Record<string, unknown>` + runtime property checks to narrow SDK types. This is pragmatic given SDK type limitations (noted in TODO comments), but produces verbose code. As SDK types improve, these should be simplified.

## Observations (Not Issues)

- **Test coverage is strong:** 34 unit tests for utils, 29 integration tests via test-utils.ts, 10 simulated user tests, plus plugin skills and validate.ts passing with haiku. This is thorough for Experimental maturity.
- **Consistent pattern across migrated scripts:** All 5 scripts follow the same structure: import from utils, `parseModel(tierDefault(...))`, `createSimulatedUser`, `runSkillSession` with `simulatedUser` + `checkViolations`, `finally { simulatedUser.close() }`. Easy to read and maintain.
- **harness.ts created project-scoped wrappers** (`gpLocal`, `gpLocalJson`, `gpLocalForce`) that delegate to shared utils with a default `cwd`. Clean pattern that avoids repeating `{ cwd: NONDET_EVAL_DIR }` everywhere.
- **LOG_DIR moved to `tools/dogfood/logs/`** in harness.ts (line 51) per plan -- no longer writing into state directories.
- **Violation detection correctly uses `.goodplan/`** not `.project/` in the shared `checkViolation` function, fixing the stale path issue from pre-migration code.
