# Plan: Improve Test Coverage and Quality

## Overview

Address findings from `/audit-tests` (2026-03-27) across four themes: investigate integration test failures first (may simplify downstream fixes), then add unit tests for 3 critical untested files, fix stale test data, and add 2 missing fitness functions.

All changes are test code — no production code modifications. The source of truth for each test is the production code it validates.

## Phase 1: Investigate Integration Test Failures

Diagnose and fix why 53 integration/fitness tests fail with exit code 2 on the `quest-completions` branch.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run test -- --run 2>&1 | tail -5` shows failures — some integration/fitness tests fail with exit code 2

**After implementation** (should pass / show presence):
- [ ] `bun run test -- --run 2>&1 | tail -5` shows all tests passing (or only pre-existing failures unrelated to this branch)

### Tasks

- [ ] **Reproduce and diagnose**: Run `bun run test -- --run` to see the current failure state. Check if the compiled binary is stale — run `bun run build` first, then re-run tests. If failures persist after rebuild, examine the exit code 2 errors (VALIDATION_ errors) to identify the pattern. Common causes: stale binary, changed stdin parsing, schema validation changes, fixture schema drift.
- [ ] **Fix root cause**: Apply the fix. If the issue is a stale binary (tests compile on setup but the branch's code changes aren't reflected), fix the global-setup or build sequence. If the issue is fixture drift (fixtures don't match current schema), update fixtures. If the issue is a validation change in the CLI, update tests to match new behavior.
- [ ] **Verify full test suite passes**: Run `bun run test -- --run` and confirm 0 failures.

### Verification

- Full test suite passes (unit + integration + fitness)
- No tests were deleted or skipped to achieve passing — all 93+ test files still run

## Phase 2: Unit Tests for Critical Files

Add direct unit tests for the 3 highest-risk untested files identified by the audit.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/unit/state/helpers.test.ts 2>&1` fails — file doesn't exist
- [ ] `ls tests/unit/data/serialize.test.ts 2>&1` fails — file doesn't exist
- [ ] `ls tests/unit/data/markdown-files.test.ts 2>&1` fails — file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls tests/unit/state/helpers.test.ts` succeeds
- [ ] `ls tests/unit/data/serialize.test.ts` succeeds
- [ ] `ls tests/unit/data/markdown-files.test.ts` succeeds
- [ ] `bun run test -- --run tests/unit/state/helpers.test.ts` passes
- [ ] `bun run test -- --run tests/unit/data/serialize.test.ts` passes
- [ ] `bun run test -- --run tests/unit/data/markdown-files.test.ts` passes

### Tasks

- [ ] **Create `tests/unit/state/helpers.test.ts`**: Read `src/core/state/transitions/helpers.ts` to understand the functions. Test:
  - `evaluateRefinement()` — all branches: scores pass, override, null refinement skip-path, max rounds error, stay with round increment
  - `guardEpicStatus()` / `guardSliceStatus()` / `guardQuestStatus()` — not found, wrong status, correct status, array of expected statuses
  - `processLearnings()` — empty array, rollup to epic+project, rollup to project only, missing epicName when "epic" target requested
  - `appendActivityLog()` — appends to existing log
  - Status setters (`setSliceStatus`, `setQuestStatus`, `setEpicStatus`) — verify status updated AND overview.json synced
- [ ] **Create `tests/unit/data/serialize.test.ts`**: Read `src/core/data/serialize.ts`. Test:
  - Flat tree with json/jsonl entries — unwraps correctly
  - Nested directories — recursive serialization
  - Markdown with `inline: false` returns `true`
  - Markdown with `inline: true` returns raw string content
  - Mixed entry types in one tree
  - Exhaustive switch coverage (all StateEntry types)
- [ ] **Create `tests/unit/data/markdown-files.test.ts`**: Read `src/core/data/markdown-files.ts`. Test with temp directory fixtures:
  - `writeMarkdownFiles()` — creates dirs, writes content, files exist after
  - `copyMarkdownFiles()` — copies existing file, skips missing source gracefully
  - Error path — write to read-only dir throws GoodplanError with correct code
  - Atomic write pattern — temp file cleaned up on success

### Verification

- All 3 new test files pass individually and as part of the full suite
- `bun run test -- --run` still passes with no regressions

## Phase 3: Fix Stale Test Data

Update hardcoded values and fixtures that have drifted from current codebase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'toHaveLength(38)' tests/unit/schemas/state-events.test.ts` returns 1 — stale count
- [ ] `ls tests/fixtures/fresh-init/.project/tasks/overview.json 2>&1` fails — missing tasks dir

**After implementation** (should pass / show presence):
- [ ] `grep -c 'toHaveLength(41)' tests/unit/schemas/state-events.test.ts` returns 1 — updated count
- [ ] `ls tests/fixtures/fresh-init/.project/tasks/overview.json` succeeds
- [ ] `bun run test -- --run tests/unit/schemas/state-events.test.ts` passes
- [ ] `bun run test -- --run` full suite still passes

### Tasks

- [ ] **Update event count in `state-events.test.ts`**: Change `toHaveLength(38)` to `toHaveLength(41)`. Add `CREATE_TASK`, `DROP_TASK`, `CONVERT_TASK` to the `allTypes` array. Verify the test still validates all event types correctly.
- [ ] **Add `tasks/overview.json` to all test fixtures**: For each fixture directory in `tests/fixtures/` that has a `.project/` directory, add `tasks/overview.json` with `{"items":[]}` to match current `INIT_PROJECT` output. Fixtures to update: `fresh-init`, `epic-created`, `epic-activated`, `slice-in-progress`, `slice-refining-max-rounds`, and any others with `.project/`.
- [ ] **Verify no fixture-dependent tests break**: Run full test suite after fixture updates.

### Verification

- Event count test passes with 41 types
- All fixtures have `tasks/overview.json`
- Full test suite passes

## Phase 4: Add Fitness Functions

Add 2 missing fitness functions for documented invariants.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/fitness/structured-errors.test.ts 2>&1` fails — doesn't exist
- [ ] `ls tests/fitness/mutation-through-state-machine.test.ts 2>&1` fails — doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls tests/fitness/structured-errors.test.ts` succeeds
- [ ] `ls tests/fitness/mutation-through-state-machine.test.ts` succeeds
- [ ] `bun run test -- --run tests/fitness/structured-errors.test.ts` passes
- [ ] `bun run test -- --run tests/fitness/mutation-through-state-machine.test.ts` passes

### Tasks

- [ ] **Create `tests/fitness/structured-errors.test.ts`** (INV-007): Read `src/util/errors.ts` to enumerate all GoodplanError codes. Test that:
  - Each error code maps to a documented exit code (1, 2, or 3)
  - For a representative set of errors (at least one per exit code), spawn the compiled binary with inputs that trigger the error and verify: (a) correct exit code, (b) stdout contains valid JSON with `{ error: { code, message } }` shape
  - No error path produces exit code 0
- [ ] **Create `tests/fitness/mutation-through-state-machine.test.ts`** (INV-001): Static analysis approach — read source files and verify that:
  - `fs.writeFileSync` / `fs.writeFile` for `.json` files only appears in `src/core/data/commit.ts` (and documented exceptions: version-stamp, migrate)
  - No command handler or RPC function directly writes `.project/` JSON files
  - Import graph verification: commands and RPC modules do not import `fs` write functions directly (they go through the data layer)
- [ ] **Update fitness function references**: Update `commands-api.md` and `rpc-layer-api.md` fitness function sections to reference the new test files (replacing "candidate — not yet written" entries where applicable).

### Verification

- Both fitness functions pass
- Full test suite passes (now 95+ test files: 93 original + 2 new fitness + 3 new unit from Phase 2, minus any that were redundant)
- `_overview.md` fitness function listings are accurate
