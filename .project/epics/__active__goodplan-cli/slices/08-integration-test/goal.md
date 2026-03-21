# Integration Tests & Fitness Functions

## What We're Building
End-to-end integration tests that spawn the compiled binary and run full workflows, plus fitness functions for the state machine and data layer. This validates the complete system works as a binary and establishes the quality baseline for ongoing development.

## Behavior
1. Integration tests spawn the compiled `goodplan` binary in temp directories with fixture `.project/` structures.
2. Full workflow tests: create project → create epic → activate → create slices → plan → refine → implement → complete, verifying state and output at each step.
3. Error path tests: invalid transitions, missing flags, concurrent modification, circuit breaker.
4. Main runner integration tests: spawn binary and verify entry-point behavior — unknown command exit codes, `--json` flag routing (JSON errors to stdout, human errors to stderr), `--help` output, `--version` output. These catch regressions in `src/index.ts` that unit tests can't cover (proven by tracer bullet pre-dispatch regression).
4. Fitness functions (architectural property tests):
   - State machine purity: no I/O imports in `src/core/state/`
   - State machine completeness: every (status, event) pair in transition-tables.md has a corresponding test
   - Data layer determinism: JSON round-trip produces byte-identical output
   - Data layer schema validation: malformed data rejected on both read and write
   - Data layer concurrent modification: detected and rejected
   - Data layer atomic writes: survive interruption
   - Data layer derived fields: accurate after state assembly

## Success Criteria
- [ ] Full epic lifecycle integration test passes: init → epic:create → explore → architecture → activate → slice:create → plan → refine → implement → complete
- [ ] Full quest lifecycle integration test passes alongside an active epic
- [ ] Invalid transition test: attempting slice:plan before previous slice completes returns STATE_SLICE_NOT_READY
- [ ] Circuit breaker test: maxRounds exceeded without override returns STATE_MAX_ROUNDS_REACHED
- [ ] Concurrent modification test: external file change between commands causes DATA_CONCURRENT_MODIFICATION
- [ ] Fitness: `grep -r "from.*fs" src/core/state/` returns nothing (state machine purity)
- [ ] Fitness: count of transition test cases matches count derived from the `StateEvent` discriminated union (same counting method as slice 03's fitness function — do not parse markdown separately)
- [ ] Fitness: JSON write → read → write produces byte-identical files
- [ ] Fitness: malformed JSON rejected by readEntity with Zod error details
- [ ] Main runner tests: `./goodplan badcommand` exits 2, `./goodplan badcommand --json` outputs JSON to stdout with empty stderr, `./goodplan --help` shows command list, `./goodplan --version` shows version
- [ ] All integration tests run in under 30 seconds

## Verification
1. Compile binary: `bun build --compile src/index.ts --outfile goodplan` — verify exit 0 and binary size is reasonable.
2. Run `bun test tests/integration/` — all integration tests pass.
3. Run `bun test tests/fitness/` — all fitness function tests pass.
4. Run `bun test tests/fitness/` — the fitness function derives expected count from `StateEvent` discriminated union and asserts test count matches. Verify the fitness test itself does not import or parse `transition-tables.md`.
5. Run the full integration suite 3 times — verify consistent results (no flaky tests).

## Scope Boundaries
**In scope:** Integration tests (spawn binary, full workflows), fitness functions (purity, completeness, determinism, validation, concurrency, atomicity, derived fields), test fixtures.
**Out of scope:** Unit tests (written in slices 02-04), performance testing, load testing.
