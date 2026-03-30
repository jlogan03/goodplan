## Issues

**[IMPORTANT]** helpers.test.ts: Many exported functions have no direct unit test coverage

The test covers 9 of 30 exported functions from `helpers.ts`. The following public API functions are untested: `getEpic`, `getProject`, `getSlice`, `setEpicJson`, `updateOverviewStatus`, `setSliceJson`, `updateSliceOverviewStatus`, `isSliceTerminal`, `isEpicTerminal`, `getQuest`, `setQuestJson`, `updateQuestOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, `buildInitialQuestJson`, `buildInitialEpicJson`, `createEpicSubdirectories`, `getTask`, `isTaskTerminal`, `updateTaskOverviewStatus`. While some of these are trivial wrappers, several contain meaningful logic (e.g., `updateSliceOverviewStatus` sets `completed` on terminal transitions, `addQuestToOverview` throws on missing overview). The plan says "3 highest-risk untested files" -- prioritize functions with branching logic or error paths.
File: tests/unit/state/helpers.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** markdown-files.test.ts: Error path test has redundant double-invocation pattern

Lines 54-65 call `writeMarkdownFiles` twice in the error case -- once inside `expect(...).toThrow()` and again in a manual try/catch. The first assertion already verifies the throw; the manual try/catch duplicates it. This is fragile (two calls with side effects on a read-only dir) and confusing. Replace with a single `expect(...).toThrow()` and use Vitest's `toThrowError` or `toMatchObject` to check the error code in one step:
```ts
try {
  writeMarkdownFiles(tmpDir, files);
  expect.unreachable("should have thrown");
} catch (err) {
  expect(err).toBeInstanceOf(GoodplanError);
  expect((err as GoodplanError).code).toBe("DATA_WRITE_ERROR");
}
```
File: tests/unit/data/markdown-files.test.ts:54
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** serialize.test.ts: Empty directory serialization only tested inline, not both modes

The "covers all StateEntry types" test (line 110) uses `INLINE` mode. The empty directory `d: dir({})` serialization should also be verified under `NO_INLINE` to confirm the behavior is mode-independent. This is a minor gap since the implementation doesn't branch on mode for directories, but tests should document that.
File: tests/unit/data/serialize.test.ts:110
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** helpers.test.ts: Type assertions used instead of type guards for narrowing test results

Multiple tests use `as` casts to narrow union types (e.g., `result as StateError`, `result as Epic`, `result as Extract<RefinementOutcome, { action: "error" }>`). This is acceptable in tests but makes failures harder to debug -- if the cast is wrong, you get confusing property-access errors instead of clear assertion failures. Consider using `expect(result).toHaveProperty('code')` or similar structural assertions before accessing narrowed properties.
File: tests/unit/state/helpers.test.ts:152
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** markdown-files.test.ts: `import.meta.dirname` fallback to `"."` is fragile

Line 13 uses `import.meta.dirname ?? "."`. Under Bun with Vitest, `import.meta.dirname` is always defined, so the fallback is dead code. If it ever triggered, `"."` would create temp dirs relative to CWD, which is non-deterministic and could pollute the working directory. Consider using `os.tmpdir()` as the fallback for robustness.
File: tests/unit/data/markdown-files.test.ts:13
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** helpers.test.ts: `processLearnings` test for "rolls up to both" doesn't verify learning content is correct

The test at line 289 checks `toHaveLength(1)` for each target but doesn't verify the rolled-up entry has the expected fields (`category`, `summary`, `file`, etc.). A malformed rollup that writes the wrong shape would pass. Add a `toMatchObject` or `toEqual` on at least one rolled-up entry.
File: tests/unit/state/helpers.test.ts:289
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Good foundation with clean structure, proper use of real state tree helpers (no mocks), and correct import patterns. Tests pass and cover the core happy/error paths for the functions they target. Deductions: (1) significant coverage gap -- only 9 of 30 exports tested for the "highest-risk" file; (2) the markdown error test has a confusing double-invocation pattern; (3) several minor assertion quality issues. To reach 9+: cover the remaining branching-logic functions in helpers.ts (at minimum `updateSliceOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `buildInitialQuestJson`, `buildInitialEpicJson`, `createEpicSubdirectories`, `isSliceTerminal`, `isEpicTerminal`), fix the double-invocation error test, and add structural assertions on rollup content.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
