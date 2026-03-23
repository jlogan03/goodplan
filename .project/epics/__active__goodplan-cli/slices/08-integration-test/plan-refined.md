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
- No production code changes except adding `export` to `const handlerRecord` in `src/core/state/reduce.ts` line 69 (needed by transition-completeness fitness function; the `handlers` Map on line 111 remains unexported)

## Phase 1: Fixtures & Test Helpers

Create on-disk fixture `.project/` structures and a shared test helper module for spawning the compiled binary.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tests/fixtures/*.json 2>/dev/null || ls tests/fixtures/*/ 2>/dev/null` — no fixture files exist yet
- [ ] `cat tests/integration/helpers.ts` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls tests/fixtures/` — contains fixture directories for different lifecycle states (e.g., `fresh-init/`, `epic-activated/`, `slice-in-progress/`)
- [ ] `cat tests/integration/helpers.ts` — exports `runCommand()`, `runChain()`, `withFixture()` functions
- [ ] A smoke test (`tests/integration/smoke.test.ts`) that spawns the binary with `--version` and verifies exit 0

### Tasks

- [x] Create fixture directory `tests/fixtures/fresh-init/` — a minimal `.project/` with `idea.md`, `overview.json`, and `activity-log.jsonl` as produced by `goodplan init`. Generate by running `goodplan init` in a temp dir and copying the result. Use a fixed timestamp (e.g., `2026-01-01T00:00:00.000Z`) in all generated files.
- [x] Create fixture directory `tests/fixtures/epic-created/` — a project with an epic at `created` status. Hand-craft with fixed timestamps (`2026-01-01T00:00:00.000Z`). Build on `fresh-init` by adding `epics/__active__initial/` with `overview.json` (status: `created`) and `goal.md`.
- [x] Create fixture directory `tests/fixtures/epic-activated/` — hand-crafted with fixed timestamps. A project with an activated epic that has slice definitions. Includes architecture files, `slices/sequencing.md`, at least one slice with `goal.md`, and epic status `activated`.
- [x] Create fixture directory `tests/fixtures/slice-in-progress/` — hand-crafted with fixed timestamps. An activated epic with a slice at `plan-refined` status, ready for `slice:implement`.
- [x] Create `tests/integration/helpers.ts` with:
  - `runCommand(binPath, args, options?)` — spawns binary in a given cwd, returns `{ stdout, stderr, exitCode, json? }`. Parses stdout as JSON when `--json` flag present. `options` includes optional `stdin?: string` (piped via `spawnSync`'s `input` option) and `env?: Record<string, string>`. `json` field typed as `unknown` (not `any`) to enforce narrowing under `noUncheckedIndexedAccess`.
  - `runChain(binPath, commands, options?)` — runs a sequence of commands, returns array of results. Stops on first non-zero exit unless `continueOnError` option set.
  - `withFixture(fixtureName, fn)` — copies fixture to a temp dir, sets `GOODPLAN_DIR=<tempDir>/.project/` in spawned process environment (rather than relying on cwd-based discovery, which risks finding the repo's own `.project/`), passes the temp path to `fn`, cleans up after. Uses `node:child_process` (`execFileSync`/`spawnSync`).
  - `buildBinary()` — asserts the compiled binary exists at the well-known path (set by `globalSetup`) and returns that path. Does not compile — compilation is handled by `globalSetup`.
- [x] Create `tests/global-setup.ts` — Vitest `globalSetup` module that compiles the binary once before all test files and writes it to a well-known path (e.g., `./goodplan` in project root). This runs in a separate module context from test files; `buildBinary()` in the helper bridges by reading the known path.
- [x] Create `vitest.config.ts` at project root with `testTimeout: 30_000` — single config file (simplest for a single-package project; unit tests are fast enough that 30s won't mask issues). Configure `globalSetup` pointing to `tests/global-setup.ts`.
- [x] Create `tests/integration/smoke.test.ts` — basic smoke test that builds the binary and runs `--version`, `--help`, and `init` to verify the test infrastructure works.
- [x] Verify: `bun test tests/integration/smoke.test.ts` passes.

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
  - From fresh-init fixture: `epic:create` with stdin `{ "name": "test-epic", "goal": "Test goal" }` → verify epic directory and status
  - From epic-created fixture: `epic:explore --epic test-epic` → `submit-explore --epic test-epic` → `epic:define-architecture --epic test-epic` → `submit-architecture --epic test-epic` → `epic:define-slices --epic test-epic` → `submit-slices --epic test-epic` → `epic:add-verification --epic test-epic` with stdin verification criterion → `epic:activate --epic test-epic` → verify activated status
  - Test `epic:list`, `epic:show` read commands at various states
- [ ] Create `tests/integration/workflow-slice.test.ts` — test slice lifecycle using `runChain()`:
  - From epic-activated fixture: `slice:create --epic test-epic` with stdin `{ "name": "test-slice" }` → `slice:plan` → `start-plan` → `submit-plan` → `slice:refine-plan` → `start-refinement` → `submit-refinement` with stdin `{ "scores": { "correctness": 8, "completeness": 8 } }` → `slice:implement` → `start-implementation` → `submit-implementation` → `slice:complete` with stdin `{ "verificationPassed": true, "learnings": [], "deferred": [], "architectureDelta": "" }` → verify completed status and learnings
  - Test `slice:list`, `slice:show` read commands
- [ ] Create `tests/integration/workflow-quest.test.ts` — test quest lifecycle alongside an active epic:
  - From epic-activated fixture: `quest:create` with stdin `{ "name": "test-quest", "goal": "Test quest goal" }` → `quest:plan` → `start-plan` → `submit-plan` → `quest:refine-plan` → `start-refinement` → `submit-refinement` with stdin `{ "scores": { "correctness": 8, "completeness": 8 } }` → `quest:implement` → `start-implementation` → `submit-implementation` → `quest:complete` with stdin `{ "verificationPassed": true, "learnings": [], "deferred": [] }` → verify completed status
  - Note: `start-*` and `submit-*` commands are shared between slices and quests — they detect the active target from context
- [ ] Create `tests/integration/error-transitions.test.ts` — test invalid state transitions:
  - Attempt `slice:plan` on a slice that hasn't been created → `STATE_INVALID_TRANSITION` error
  - Attempt `epic:activate` without verification criteria → `STATE_MISSING_VERIFICATIONS` error
  - Attempt `slice:implement` before plan is refined → `STATE_SLICE_NOT_READY` error
  - Verify JSON error output includes error code and message
- [ ] Create `tests/integration/error-circuit-breaker.test.ts` — test refinement circuit breaker:
  - Use a fixture starting at a high refinement round (e.g., round 9 of 10) so only 1-2 spawns are needed to hit `MAX_REFINEMENT_ROUNDS` (defined in `src/core/state/transitions/helpers.ts`) → `STATE_MAX_ROUNDS_REACHED` error
  - Submit with `--override` → succeeds past maxRounds
- [ ] Create `tests/integration/runner-modes.test.ts` — test main runner behavior:
  - `./goodplan badcommand` → exit 2 (validation error), error on stderr
  - `./goodplan badcommand --json` → JSON error to stdout, empty stderr
  - `./goodplan --help` → shows command list, exit 0
  - `./goodplan --version` → shows version string, exit 0
  - `echo '{}' | ./goodplan epic:create --json` with empty stdin → JSON validation error to stdout, empty stderr
  - `NO_COLOR=1 ./goodplan --help` → output contains no ANSI escape codes
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
- [ ] Fitness tests cover: state machine purity, transition completeness, data layer determinism, schema validation, tree accuracy, concurrent modification detection, atomic write pattern, stateless commands (INV-004), schema output accuracy (INV-006)

### Tasks

Note: Data Layer fitness functions (`data-determinism`, `schema-validation`, `tree-accuracy`, `concurrent-modification`) import production modules directly because these invariants are internal to the Data Layer and not observable through the CLI binary interface. All fixtures beyond `fresh-init` should be hand-crafted with fixed timestamps (e.g., `2026-01-01T00:00:00.000Z`) to ensure determinism.

- [ ] Create `tests/fitness/` directory structure.
- [ ] Create `tests/fitness/state-machine-purity.test.ts` (INV-003): Statically analyze imports in `src/core/state/` — verify no I/O modules (`fs`, `node:fs`, `path`, `node:path`, `child_process`, `http`, `net`) are value-imported. Parse import statements and skip `import type` declarations, which produce no runtime I/O and are safe.
- [ ] Create `tests/fitness/transition-completeness.test.ts`: Export `handlerRecord` from `src/core/state/reduce.ts` (the one allowed production code change — add `export` to `const handlerRecord` on line 69; the `handlers` Map on line 111 remains unexported). Derive event types via `Object.keys(handlerRecord)`. Verify the key count in `handlerRecord` matches the `StateEvent` union member count by parsing `state-events.ts` source to count exported union members (consistent with the purity test's source-parsing approach), detecting drift if new events are added without handlers. Additionally, smoke-test that `reduce()` returns a non-error result for each event type with valid minimal input.
- [ ] Create `tests/fitness/data-determinism.test.ts` (INV-002): Using a fixture `.project/` directory, run `assembleState()` then `commitState()` on unchanged state. Verify output files are byte-identical to input files. Test with multiple fixtures to cover different entity types.
- [ ] Create `tests/fitness/schema-validation.test.ts` (INV-005): Feed malformed JSON (missing required fields, wrong types, extra fields) to `assembleState()`. Verify Zod validation errors are produced with specific field paths and messages.
- [ ] Create `tests/fitness/tree-accuracy.test.ts`: Run `assembleState()` on a fixture `.project/` directory. Verify the resulting tree's `DirectoryEntry.contents` keys match actual filesystem directory listings at each level.
- [ ] Create `tests/fitness/concurrent-modification.test.ts`: Run `assembleState()` to get initial state, externally modify a `.project/` JSON file on disk, then attempt `commitState(dir, state, state)`. Verify `DATA_CONCURRENT_MODIFICATION` error is produced.
- [ ] Create `tests/fitness/atomic-writes.test.ts` (INV-007): Examine the `commitState()` implementation to verify it uses a temp-file-then-rename pattern for JSON writes. This can be a code-reading test (verify the pattern exists in source) or a runtime test (verify intermediate state is never visible).
- [ ] Create `tests/fitness/stateless-commands.test.ts` (INV-004): Import the command registry (or use `schema --json` output) and verify every mutation command either has a required entity-identifying flag (`--slice`, `--epic`, `--quest`, `--id`) or accepts a required `name`/`id` field in its stdin schema — no command should rely on ambient/session state to determine its target.
- [ ] Create `tests/fitness/schema-output-accuracy.test.ts` (INV-006): Spawn the binary with `schema --json`, parse output, and verify: (a) flag names match citty `args` keys, (b) required/optional status matches, (c) stdin schema present for commands that accept stdin.
- [ ] Add a brief doc comment in the test helper explaining how to run integration and fitness tests.
- [ ] Verify: `bun test tests/fitness/` passes. Full test suite (`bun test`) still passes with all existing + new tests. Total time under 30 seconds.
