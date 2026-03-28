# Merged Review — Phase 2: Unit Tests for Critical Files

## Plan Adherence

All plan checkboxes are checked. The 3 specified test files cover all specified functions and edge cases per the plan.

## Issues

### IMPORTANT-1: helpers.test.ts covers only 9 of 30 exports — overview mutation helpers are a notable gap

**Sources**: typescript (IMPORTANT), software-architecture (IMPORTANT)
**Resolution**: DIRECTLY_ACTIONABLE

The test covers the 9 highest-risk functions as intended by the plan, but helpers.ts exports 30 public functions. The most architecturally significant untested functions are the overview mutation helpers: `updateOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, and `updateTaskOverviewStatus`. These contain real logic (null-guards, map transforms) and maintain overview-entity consistency that INV-001 depends on. The test for `setEpicStatus` explicitly notes it does NOT sync overview and defers to `updateOverviewStatus` — but that function has no test.

Secondary gaps: `buildInitialQuestJson`, `buildInitialEpicJson`, `createEpicSubdirectories`, `isSliceTerminal`, `isEpicTerminal`, `isQuestTerminal`, getters.

**Action**: Add tests for at minimum the overview mutation helpers (`updateOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`) and the entity builder factories. This may be out of scope for this iteration if the plan deliberately scoped to 9 functions — USER_INPUT needed on whether to expand scope.

### IMPORTANT-2: markdown-files.test.ts error test has redundant double-invocation pattern

**Sources**: typescript (IMPORTANT), software-architecture (MINOR), generalist (MINOR)
**Resolution**: DIRECTLY_ACTIONABLE

Lines 54-65 call `writeMarkdownFiles` twice — once inside `expect().toThrow()` and again in a manual try/catch to inspect the error code. Replace with a single try/catch:

```ts
try {
  writeMarkdownFiles(tmpDir, files);
  expect.unreachable("should have thrown");
} catch (err) {
  expect(err).toBeInstanceOf(GoodplanError);
  expect((err as GoodplanError).code).toBe("DATA_WRITE_ERROR");
}
```

### MINOR-1: serialize.test.ts — empty directory / empty tree edge cases

**Sources**: typescript (MINOR), software-architecture (MINOR)
**Resolution**: DIRECTLY_ACTIONABLE

Two related gaps: (a) empty directory serialization only tested in INLINE mode, not NO_INLINE (typescript); (b) empty tree as top-level input `serializeStateTree(dir({}), NO_INLINE)` not tested (software-architecture). Both are trivial to add.

### MINOR-2: `import.meta.dirname` fallback to `"."` is unnecessary and fragile

**Sources**: typescript (MINOR), generalist (MINOR)
**Resolution**: DIRECTLY_ACTIONABLE

Line 13 of markdown-files.test.ts uses `import.meta.dirname ?? "."`. Under Bun/Vitest, `import.meta.dirname` is always defined, so the fallback is dead code. If it ever triggered, `"."` would create temp dirs relative to CWD non-deterministically. Use `os.tmpdir()` as the fallback or remove the fallback entirely.

### MINOR-3: helpers.test.ts uses `as` casts instead of structural assertions for type narrowing

**Source**: typescript (MINOR)
**Resolution**: DIRECTLY_ACTIONABLE

Multiple tests use `as` casts (e.g., `result as StateError`). If the cast is wrong, failures produce confusing property-access errors. Consider structural assertions (`expect(result).toHaveProperty('code')`) before accessing narrowed properties.

### MINOR-4: `processLearnings` test doesn't verify rolled-up learning content

**Source**: typescript (MINOR)
**Resolution**: DIRECTLY_ACTIONABLE

The "rolls up to both" test (line 289) checks `toHaveLength(1)` but not the shape of the rolled-up entry. A malformed rollup writing the wrong shape would pass. Add `toMatchObject` on at least one entry.

### MINOR-5: `biome-ignore` comment style differs from plan specification

**Source**: generalist (MINOR)
**Resolution**: No action needed — the `biome-ignore` directive is actually better than the plain comment the plan specified, as it suppresses the lint warning while documenting intent.

## Strengths

- Test fixtures are clean and composable (`makeEpic`, `makeSlice`, `makeQuest`, etc.)
- Real state tree fixtures used — no mocks — aligning with project conventions
- Proper temp directory cleanup with `beforeEach`/`afterEach` and `finally` blocks
- Tests verify both primary effects and side effects (e.g., status change + overview sync)
- Type safety via `satisfies`, proper imports, justified `as any` for exhaustive switch guard
- Test boundary choices are architecturally sound — helpers tested as pure functions on `ProjectState`, markdown-files tested with real filesystem I/O
- No production code changes — all test-only as required

## Score Summary

| Reviewer | Score |
|----------|-------|
| Generalist | 9/10 |
| TypeScript | 7/10 |
| Software Architecture | 8/10 |

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 2 |
| Minor | 5 (after dedup) |

## Resolution Summary

- DIRECTLY_ACTIONABLE: 6
- RESEARCH_NEEDED: 0
- USER_INPUT: 1 (IMPORTANT-1: whether to expand helpers.test.ts scope to cover overview mutation helpers)
