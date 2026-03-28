# Software Architecture Review — Phase 3: Fitness Functions

## Issues

**[IMPORTANT]** Global-setup skip logic is fragile — relies on string matching against process.argv

The `isUnitOnly` check in `tests/global-setup.ts` uses `vitestArgs.includes("tests/unit")` which is a substring match against `process.argv.join(" ")`. This works today but is brittle: a path like `tests/unit-integration/` would match `tests/unit`, and custom vitest config paths could break it. This is a pre-existing design that was actually *improved* by this phase (the old logic was wrong — it excluded `tests/fitness` from binary compilation), so the fix is correct in direction. However, the approach remains fragile.

File: tests/global-setup.ts:17
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Consider a more robust approach — for example, checking if any test file matching `tests/fitness/**` or `tests/integration/**` is in the resolved file list, or simply always compiling the binary (it's a one-time cost per test run). Not urgent since the current logic works for all actual directory names in the project.

---

**[MINOR]** Data-determinism and tree-accuracy tests silently skip missing fixtures

Both `data-determinism.test.ts` and `tree-accuracy.test.ts` use `if (!fs.existsSync(fixtureDir)) return;` which makes the test pass silently if a fixture is missing. If someone renames or removes a fixture, the test coverage quietly drops. The `slice-refining-max-rounds` fixture exists on disk but is not in the fixture lists of these two tests.

File: tests/fitness/data-determinism.test.ts:59
File: tests/fitness/tree-accuracy.test.ts:83
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Either (a) assert the fixture exists (`expect(fs.existsSync(fixtureDir)).toBe(true)`) or (b) dynamically discover fixtures from the `tests/fixtures/` directory instead of hardcoding the list. Also consider adding `slice-refining-max-rounds` to the fixture lists since it provides additional entity type coverage.

---

**[MINOR]** Atomic-writes test is a source-string-matching test, not a behavioral test

`atomic-writes.test.ts` verifies INV-007 by checking that `commit.ts` source code contains specific strings like `"writeFileSync(tmpPath"` and `"renameSync(tmpPath"`. This is a code-reading test (explicitly allowed by the plan) but it is fragile — variable renames, refactors to use a helper function, or switching to `fs.promises` would break the test without changing the actual atomic-write behavior. The test does add value as a regression guard (it would catch someone removing the atomic pattern entirely) but cannot detect subtle correctness issues (e.g., rename happening before all data is flushed).

File: tests/fitness/atomic-writes.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

No change required — the plan explicitly allows this approach. Noting for awareness: if `commitState` is ever refactored, this test will likely need updating. A future improvement could add a behavioral test (e.g., verify that a partially-written file is never observable by checking that `commitState` either fully writes or leaves the old file intact).

---

No other issues found.

## Score: 9/10

Strong implementation. All 7 invariants (INV-001 through INV-007) have corresponding fitness functions. The production code change is minimal and precisely scoped (adding `export` to `handlerRecord`). Data layer tests use proper temp-dir isolation with `beforeEach`/`afterEach` cleanup. The split between source-analysis tests (purity, atomic-writes), direct-import tests (determinism, schema-validation, tree-accuracy, concurrent-modification), and binary-spawning tests (stateless-commands, schema-output-accuracy) is well-aligned with what each invariant actually needs to verify. The transition-completeness test is particularly well-designed — it cross-references the source union definition against the runtime handler record AND smoke-tests every handler, which would catch both missing handlers and runtime crashes. The global-setup fix correctly addresses the binary compilation gap for fitness tests.

The 1-point deduction is for the silent fixture skipping (minor but reduces confidence in test coverage maintenance over time).

## Summary
- Critical: 0
- Important: 1
- Minor: 2
