# Phase 3: Fitness Functions -- Generalist Review

**Score: 9/10**

## Summary

All 9 fitness test files are present and cover every invariant specified in the plan (INV-002 through INV-007, plus transition completeness, tree accuracy, and concurrent modification detection). The single production change (`export` on `handlerRecord`) is minimal and exactly as planned. The global-setup fix correctly enables binary compilation for fitness tests. 92 tests, 824/824 passing, clean implementation.

## Plan Adherence

Every task checkbox in Phase 3 is satisfied:
- `state-machine-purity.test.ts` -- INV-003: checks forbidden I/O imports, skips `import type`
- `transition-completeness.test.ts` -- source-parses `StateEvent` union, compares to `handlerRecord` keys, smoke-tests `reduce()`
- `data-determinism.test.ts` -- INV-002: round-trips all 4 fixtures through `assembleState`/`commitState`, asserts byte-identity
- `schema-validation.test.ts` -- INV-005: malformed JSON (missing fields, wrong types, unparseable), verifies `DATA_VALIDATION_ERROR`
- `tree-accuracy.test.ts` -- verifies tree keys match filesystem listings across all fixtures
- `concurrent-modification.test.ts` -- external file tamper detected as `DATA_CONCURRENT_MODIFICATION`
- `atomic-writes.test.ts` -- INV-007: source analysis of temp-file-then-rename pattern
- `stateless-commands.test.ts` -- INV-004: schema-driven check for entity-identifying flags
- `schema-output-accuracy.test.ts` -- INV-006: validates schema --json structure, stdin schemas, arg consistency
- Doc comment added to `tests/integration/helpers.ts` (lines 2-12)
- `handlerRecord` exported in `reduce.ts` line 69, `handlers` Map remains unexported

## Findings

### Critical: 0

None.

### Important: 1

1. **`stateless-commands.test.ts` uses hardcoded allowlists instead of deriving from production code** (lines 14-37). The `READ_ONLY_COMMANDS`, `ENTITY_ARGS`, and `STDIN_ENTITY_COMMANDS` sets are manually maintained. If a new mutation command is added without updating these sets, the fitness function silently passes. The plan says to "import the command registry (or use `schema --json` output)" -- the test does use schema output for the command list, but the exemption sets are manual. A more robust approach: derive read-only vs. mutation classification from the schema output or a command metadata field. This is a moderate drift risk, not a correctness bug today.

### Minor: 3

1. **`schema-validation.test.ts` calls `assembleState()` twice per error test** (lines 37-46, 56-57, 66-75). The first call asserts it throws, then it's called again in a try/catch to inspect the error. Could use a single try/catch with `expect.fail()` at the end, or Vitest's `expect().toThrowError()` with a custom matcher. Not a correctness issue, just redundant work.

2. **`tree-accuracy.test.ts` checks tree keys are a subset of filesystem** (line 50) but does not check the reverse -- filesystem entries that should be in the tree but are missing. The comment on line 48-49 explains this is intentional (some files may lack registered schemas), but it means the test wouldn't catch a bug where `assembleState` silently drops a known file type. Acceptable given the explanation, but worth noting.

3. **`atomic-writes.test.ts` uses string-contains checks on source code** (lines 21-22, 26, 31). These are brittle if variable names change (e.g., `tmpPath` renamed to `tempFile`). The regex for `atomicAppend` on line 38 uses `^}` with the `m` flag which could match the wrong closing brace. Low risk given this is a fitness function (it would fail loudly, prompting a fix), but a source AST approach would be more resilient.

## Production Change Assessment

The `export` added to `const handlerRecord` on line 69 of `src/core/state/reduce.ts` is safe:
- It exposes an already-existing compile-time-checked record
- The runtime `handlers` Map remains unexported
- No API surface change for consumers -- only test code imports it
- The `satisfies` constraint ensures type safety is preserved

## Global Setup Fix

The previous logic (`||` joining `tests/unit`, `tests/fitness`) incorrectly skipped compilation when fitness tests were selected. The fix uses `&&` with negation, correctly compiling the binary whenever integration OR fitness tests are in the run. This is a necessary bugfix, not a behavioral change for other test configurations.
