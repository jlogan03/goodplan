# Plan: Improve Test Coverage and Quality

## Overview

Address findings from `/audit-tests` (2026-03-27) across four themes: investigate integration test failures first (may simplify downstream fixes), then add unit tests for 3 critical untested files, fix stale test data, and add 2 missing fitness functions.

All changes are test code — no production code modifications. The source of truth for each test is the production code it validates.

## Phase 1: Investigate Integration Test Failures

Diagnose and fix why 53 integration/fitness tests fail with exit code 2 on the `quest-completions` branch.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `bun run test -- --run 2>&1 | tail -5` shows failures — some integration/fitness tests fail with exit code 2

**After implementation** (should pass / show presence):
- [x] `bun run test -- --run 2>&1 | tail -5` shows all tests passing (or only pre-existing failures unrelated to this branch)

### Tasks

- [x] **Reproduce and diagnose**: Run `bun run test -- --run` to see the current failure state. Note: `global-setup.ts` already compiles the binary before tests run. If failures persist after a clean build, investigate fixture schema drift (e.g., missing `tasks/` directory) as root cause — Phase 3 also addresses this. Examine the exit code 2 errors (VALIDATION_ errors) to identify the pattern. Common causes: fixture schema drift, changed stdin parsing, schema validation changes. **Cross-phase note**: If fixture drift (e.g., missing `tasks/overview.json`) is confirmed as the root cause, fix minimally in Phase 1 (enough to pass tests) and defer comprehensive fixture updates to Phase 3 — do not duplicate the work.
- [x] **Fix root cause**: Apply the fix. If the issue is a stale binary (tests compile on setup but the branch's code changes aren't reflected), fix the global-setup or build sequence. If the issue is fixture drift (fixtures don't match current schema), update fixtures. If the issue is a validation change in the CLI, update tests to match new behavior.
- [x] **Verify full test suite passes**: Run `bun run test -- --run` and confirm 0 failures.

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

- [ ] **Create `tests/unit/state/helpers.test.ts`**: Read `src/core/state/transitions/helpers.ts` to understand the functions. Covers highest-risk logic (~10 functions). Simple getters, builders, terminal checks, and overview-add functions are covered transitively by transition handler integration tests. Test:
  - `evaluateRefinement()` — all branches: scores pass, override, null refinement skip-path, max rounds error, stay with round increment
  - `guardEpicStatus()` / `guardSliceStatus()` / `guardQuestStatus()` — not found, wrong status, correct status, array of expected statuses
  - `processLearnings()` — empty array, rollup to epic+project, rollup to project only, missing epicName when "epic" target requested
  - `appendActivityLog()` — appends to existing log
  - Status setters (`setSliceStatus`, `setQuestStatus`) — verify status updated AND overview.json synced
  - `setEpicStatus` — verify status and timestamp updated in epic.json (no overview sync — that's `updateOverviewStatus`)
- [ ] **Create `tests/unit/data/serialize.test.ts`**: Read `src/core/data/serialize.ts`. Test:
  - Flat tree with json/jsonl entries — unwraps correctly
  - Nested directories — recursive serialization
  - Markdown with `inline: false` returns `true`
  - Markdown with `inline: true` returns raw string content
  - Mixed entry types in one tree
  - Exhaustive switch coverage (all StateEntry types)
  - Include a test that passes an invalid entry type (via `as any` type assertion — intentional anti-pattern override for testing runtime guards against values the type system rejects; add inline comment `// Intentional: testing runtime guard against invalid input`) to verify the `default: never` exhaustive switch guard throws at runtime
- [ ] **Create `tests/unit/data/markdown-files.test.ts`**: Read `src/core/data/markdown-files.ts`. Test with temp directory fixtures:
  - `writeMarkdownFiles()` — creates dirs, writes content, files exist after
  - `copyMarkdownFiles()` — copies existing file, skips missing source gracefully
  - Error path — write to read-only dir throws GoodplanError with correct code
  - Atomic write pattern — verify indirectly: write succeeds, file exists with correct content, no `.tmp.*` files remain in directory

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
- [ ] Event count test uses a dynamic assertion (e.g., `allTypes.length`) or documents derivation — no hardcoded magic number
- [ ] `ls tests/fixtures/fresh-init/.project/tasks/overview.json` succeeds
- [ ] `bun run test -- --run tests/unit/schemas/state-events.test.ts` passes
- [ ] `bun run test -- --run` full suite still passes

### Tasks

- [ ] **Update event count in `state-events.test.ts`**: Rather than hardcoding a count (currently `toHaveLength(38)`, which will drift again once the 3 task events are added), update the test-local `allTypes` array by adding `CREATE_TASK`, `DROP_TASK`, `CONVERT_TASK`, then use `allTypes.length` for both assertions so they stay consistent. Add a comment like `// Must match StateEvent union members in src/schemas/state-events.ts` to document the completeness requirement. Note: `allTypes` is defined inside the test file — there is no runtime-accessible enumeration to import from the source. Verify the test still validates all event types correctly.
- [ ] **Add `tasks/overview.json` to all test fixtures**: For each fixture directory in `tests/fixtures/` that has a `.project/` directory, add `tasks/overview.json` with `{"items":[]}` to match current `INIT_PROJECT` output. Fixtures to update: `fresh-init`, `epic-created`, `epic-activated`, `slice-in-progress`, `slice-refining-max-rounds`, and any others with `.project/`. Exclude `pre-cli-project` and `learnings-migration` fixtures (pre-CLI format, used by migration tests — they intentionally lack modern entities).
- [ ] **Verify no fixture-dependent tests break**: Run full test suite after fixture updates.

### Verification

- Event count test passes with dynamically-derived count
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

- [ ] **Create `tests/fitness/structured-errors.test.ts`** (INV-007): Two distinct sub-steps:
  - **Static**: Import `src/util/errors.ts` and verify every GoodplanError code has a documented exit code mapping (1, 2, or 3) — no binary spawn needed.
  - **Dynamic**: Spawn the compiled binary with representative inputs that trigger each error category (at least one VALIDATION_* → exit 2, one STATE_* → exit 3, one INTERNAL_* → exit 1) and verify: (a) correct exit code, (b) stdout contains valid JSON with `{ error: { code, message } }` shape. Also verify no error path produces exit code 0.
- [ ] **Create `tests/fitness/mutation-through-state-machine.test.ts`** (INV-001): Static analysis approach — read source files and verify that:
  - `fs.writeFileSync` / `fs.writeFile` for `.json`/`.jsonl` files only appears in `src/core/data/commit.ts` (and documented exception: `migrate.ts`). Scope: `.json`/`.jsonl` files only; `.md` writes via `markdown-files.ts` are out of scope
  - No command handler or RPC function directly writes `.project/` JSON files
  - Import graph verification: commands and RPC modules do not import `fs` write functions directly (they go through the data layer)
- [ ] **Update fitness function references**: Update `commands-api.md` and `rpc-layer-api.md` fitness function sections to reference the new test files (replacing "candidate — not yet written" entries where applicable).
- [ ] **Update `_overview.md` subsystem maturity table**: List `tests/fitness/structured-errors.test.ts` in the Commands row and `tests/fitness/mutation-through-state-machine.test.ts` in the RPC Layer row.

### Verification

- Both fitness functions pass
- Full test suite passes (now 95+ test files: 93 original + 2 new fitness + 3 new unit from Phase 2, minus any that were redundant)
- `_overview.md` fitness function listings are accurate
