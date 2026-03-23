# Plan: Integration Tests & Fitness Functions

## Overview

Write end-to-end integration tests that spawn the compiled `goodplan` binary against real `.project/` directory structures, plus fitness functions that verify architectural invariants. This is the final slice in the goodplan-cli epic — it validates the complete system works as a binary and establishes quality baselines for ongoing development.

Approach: Phase 1 creates on-disk fixture directories and a shared test helper module (binary spawning, temp dir management, command chaining). Phase 2 writes focused integration tests covering workflow segments, error paths, and main runner behavior. Phase 3 writes fitness function tests for each architectural invariant (state machine purity, transition completeness, data layer determinism, schema validation, tree accuracy, concurrent modification, atomic write pattern).

Key decisions:
- Fixtures are on-disk `.project/` directory trees in `tests/fixtures/` — closest to production, easy to inspect
- Integration tests spawn the compiled binary (not imports) via child_process
- Workflow tests are focused segments (not one mega-chain) — each starts from a fixture at the right state
- Helper supports both single command and sequential chain execution
- Atomic writes fitness function verifies the temp-file-then-rename pattern, not simulated interruption
- No production code changes in this slice

## Phase 1: Fixtures & Test Helpers

Create on-disk fixture `.project/` structures and a shared test helper module for spawning the compiled binary.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/fixtures/*.json 2>/dev/null || ls tests/fixtures/*/ 2>/dev/null` — only `.gitkeep` exists, no fixture directories
- [ ] `cat tests/integration/helpers.ts` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls tests/fixtures/` — contains fixture directories for different lifecycle states (e.g., `fresh-init/`, `epic-activated/`, `slice-in-progress/`)
- [ ] `cat tests/integration/helpers.ts` — exports `runCommand()`, `runChain()`, `withFixture()` functions
- [ ] A smoke test (`tests/integration/smoke.test.ts`) that spawns the binary with `--version` and verifies exit 0

### Tasks

- [ ] Create fixture directory `tests/fixtures/fresh-init/` — a minimal `.project/` with `idea.md`, `overview.json`, and `activity-log.jsonl` as produced by `goodplan init`. Generate by running `goodplan init` in a temp dir and copying the result.
- [ ] Create fixture directory `tests/fixtures/epic-created/` — a project with an epic at `created` status. Build on `fresh-init` by adding `epics/__active__initial/` with `overview.json` (status: `created`) and `goal.md`.
- [ ] Create fixture directory `tests/fixtures/epic-activated/` — a project with an activated epic that has slice definitions. Includes architecture files, `slices/sequencing.md`, at least one slice with `goal.md`, and epic status `activated`.
- [ ] Create fixture directory `tests/fixtures/slice-in-progress/` — an activated epic with a slice at `plan-refined` status, ready for `slice:implement`.
- [ ] Create `tests/integration/helpers.ts` with:
  - `runCommand(binPath, args, options?)` — spawns binary in a given cwd, returns `{ stdout, stderr, exitCode, json? }`. Parses stdout as JSON when `--json` flag present.
  - `runChain(binPath, commands, options?)` — runs a sequence of commands, returns array of results. Stops on first non-zero exit unless `continueOnError` option set.
  - `withFixture(fixtureName, fn)` — copies fixture to a temp dir, passes the temp path to `fn`, cleans up after. Uses `Bun.spawnSync` or Node child_process.
  - `buildBinary()` — compiles the binary once per test suite (via `beforeAll`), returns the binary path.
- [ ] Create `tests/integration/smoke.test.ts` — basic smoke test that builds the binary and runs `--version`, `--help`, and `init` to verify the test infrastructure works.
- [ ] Verify: `bun test tests/integration/smoke.test.ts` passes.

## Phase 2: Integration Tests

Focused workflow tests, error path tests, and main runner tests — all spawning the compiled binary.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/integration/workflow*.test.ts 2>/dev/null` — no workflow test files exist
- [ ] `ls tests/integration/error*.test.ts 2>/dev/null` — no error test files exist
- [ ] `ls tests/integration/runner*.test.ts 2>/dev/null` — no runner test files exist

**After implementation** (should pass / show presence):
- [ ] `bun test tests/integration/` — all integration tests pass
- [ ] Integration tests cover: init, epic lifecycle (create → activate), slice lifecycle (create → complete), quest lifecycle, error paths, main runner modes
- [ ] `bun test tests/integration/ 2>&1 | tail -1` — test count is ≥ 20

### Tasks

- [ ] Create `tests/integration/workflow-init.test.ts` — test `goodplan init` in an empty directory: verify exit 0, JSON output, `.project/` created with expected structure (idea.md, overview.json, activity-log.jsonl).
- [ ] Create `tests/integration/workflow-epic.test.ts` — test epic lifecycle segments using `runChain()`:
  - From fresh-init fixture: `epic:create` → verify epic directory and status
  - From epic-created fixture: skip explore → define architecture → define slices → activate → verify activated status
  - Test `epic:list`, `epic:show` read commands at various states
- [ ] Create `tests/integration/workflow-slice.test.ts` — test slice lifecycle using `runChain()`:
  - From epic-activated fixture: `slice:create` → `slice:plan` (submit-plan) → `slice:refine-plan` (submit-refinement) → `slice:implement` (submit-implementation) → `slice:complete` → verify completed status and learnings
  - Test `slice:list`, `slice:show` read commands
- [ ] Create `tests/integration/workflow-quest.test.ts` — test quest lifecycle alongside an active epic:
  - From epic-activated fixture: `quest:create` → plan → implement → complete → verify completed status
- [ ] Create `tests/integration/error-transitions.test.ts` — test invalid state transitions:
  - Attempt `slice:plan` on slice that hasn't been created → STATE_SLICE_NOT_FOUND or similar error
  - Attempt `epic:activate` without verification criteria → STATE_GUARD_FAILED
  - Attempt `slice:implement` before plan is refined → STATE_SLICE_NOT_READY
  - Verify JSON error output includes error code and message
- [ ] Create `tests/integration/error-circuit-breaker.test.ts` — test refinement circuit breaker:
  - Submit enough refinement rounds to hit maxRounds → STATE_MAX_ROUNDS_REACHED error
  - Submit with `--override` → succeeds past maxRounds
- [ ] Create `tests/integration/error-concurrent.test.ts` — test concurrent modification detection:
  - Load state via one command, externally modify a JSON file, attempt another command → DATA_CONCURRENT_MODIFICATION error
- [ ] Create `tests/integration/runner-modes.test.ts` — test main runner behavior:
  - `./goodplan badcommand` → exit 2 (validation error)
  - `./goodplan badcommand --json` → JSON error to stdout, empty stderr
  - `./goodplan --help` → shows command list, exit 0
  - `./goodplan --version` → shows version string, exit 0
  - `./goodplan epic:create --json` without required flags → JSON validation error to stdout
- [ ] Verify: `bun test tests/integration/` passes. Run 3 times to check for flakiness.

### Verification
All integration tests pass consistently across 3 runs. Test count ≥ 20. Total integration test time under 30 seconds.

## Phase 3: Fitness Functions

Architectural property tests that verify system invariants hold. These are regression guards — if a future change breaks an invariant, the fitness function fails.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/fitness/ 2>/dev/null` — directory does not exist (only `.gitkeep` may exist)

**After implementation** (should pass / show presence):
- [ ] `bun test tests/fitness/` — all fitness function tests pass
- [ ] Fitness tests cover: state machine purity, transition completeness, data layer determinism, schema validation, tree accuracy, concurrent modification detection, atomic write pattern

### Tasks

- [ ] Create `tests/fitness/` directory structure.
- [ ] Create `tests/fitness/state-machine-purity.test.ts` (INV-003): Statically analyze imports in `src/core/state/` — verify no I/O modules (`fs`, `node:fs`, `path`, `node:path`, `child_process`, `http`, `net`) are imported. Use `grep` or Bun file reading to scan source files.
- [ ] Create `tests/fitness/transition-completeness.test.ts`: Export a `EVENT_TYPES` const array from the state machine (compile-time validated against the `StateEvent` union for exhaustiveness). For each event type, verify at least one test exists in `tests/unit/state/` that exercises it. This may require creating the `EVENT_TYPES` export in `src/core/state/` if it doesn't exist — this is the one allowed production code change (a const array + `satisfies` assertion).
- [ ] Create `tests/fitness/data-determinism.test.ts` (INV-002): Using a fixture `.project/` directory, run `assembleState()` then `commitState()` on unchanged state. Verify output files are byte-identical to input files. Test with multiple fixtures to cover different entity types.
- [ ] Create `tests/fitness/schema-validation.test.ts` (INV-005): Feed malformed JSON (missing required fields, wrong types, extra fields) to `assembleState()`. Verify Zod validation errors are produced with specific field paths and messages.
- [ ] Create `tests/fitness/tree-accuracy.test.ts`: Run `assembleState()` on a fixture `.project/` directory. Verify the resulting tree's `DirectoryEntry.contents` keys match actual filesystem directory listings at each level.
- [ ] Create `tests/fitness/concurrent-modification.test.ts`: Run `assembleState()` (or `loadState()`), externally modify a `.project/` JSON file, then attempt `commitState()`. Verify `DATA_CONCURRENT_MODIFICATION` error is produced.
- [ ] Create `tests/fitness/atomic-writes.test.ts`: Examine the `commitState()` implementation to verify it uses a temp-file-then-rename pattern for JSON writes. This can be a code-reading test (verify the pattern exists in source) or a runtime test (verify intermediate state is never visible).
- [ ] Verify: `bun test tests/fitness/` passes. Full test suite (`bun test`) still passes with all existing + new tests. Total time under 30 seconds.
