# Phase 2 Review: Unit Tests for Critical Files

**Reviewer**: Generalist
**Score**: 9/10

## Plan Adherence

All plan checkboxes are checked and all specified test cases are covered:

### `helpers.test.ts`
- [x] `evaluateRefinement()` — all 5 branches tested (scores pass, override, null skip-path, max rounds error, stay with increment)
- [x] `guardEpicStatus()` — not found, wrong status, correct status, array of expected statuses
- [x] `guardSliceStatus()` — not found, wrong status, correct status, epicName context, array of expected statuses
- [x] `guardQuestStatus()` — not found, wrong status, correct status, array of expected statuses
- [x] `processLearnings()` — empty array, rollup to epic+project, project only, missing epicName when "epic" target requested
- [x] `appendActivityLog()` — appends to existing log (plus bonus: creates log when none exists)
- [x] `setSliceStatus` — status updated AND overview synced
- [x] `setQuestStatus` — status updated AND overview synced
- [x] `setEpicStatus` — status and timestamp updated, overview NOT synced (correct per plan)

### `serialize.test.ts`
- [x] Flat tree with json/jsonl entries
- [x] Nested directories — recursive serialization
- [x] Markdown with `inline: false` returns `true`
- [x] Markdown with `inline: true` returns raw string
- [x] Mixed entry types in one tree
- [x] Exhaustive switch coverage (all StateEntry types)
- [x] Invalid entry type via `as any` with required inline comment

### `markdown-files.test.ts`
- [x] `writeMarkdownFiles()` — creates dirs, writes content, files exist
- [x] `copyMarkdownFiles()` — copies existing file, skips missing source gracefully
- [x] Error path — write to read-only dir throws GoodplanError with DATA_WRITE_ERROR code
- [x] Atomic write — file exists with correct content, no `.tmp.*` files remain

## Issues

### MINOR-1: Error test uses double-invocation pattern

In `markdown-files.test.ts` lines 54-65, the write failure test calls `writeMarkdownFiles` twice — once inside `expect().toThrow()` and again in a try/catch to inspect the error code. This is redundant; a single try/catch with multiple assertions would be cleaner and avoid running the failing operation twice. Functionally correct but unnecessarily complex.

### MINOR-2: `biome-ignore` comment style differs from plan specification

The plan specified `// Intentional: testing runtime guard against invalid input` as an inline comment. The implementation uses a `biome-ignore` directive comment (line 128) which serves the same purpose but is a lint suppression rather than a plain explanatory comment. This is actually better — it suppresses the linter warning for the intentional `as any` while documenting the reason. Not a real issue; noting for completeness.

### MINOR-3: `import.meta.dirname` fallback in markdown-files.test.ts

Line 13 uses `import.meta.dirname ?? "."` as a fallback. In the Bun/Vitest environment this project uses, `import.meta.dirname` is always defined for file-based modules. The fallback is harmless defensive coding but unnecessary.

## Strengths

- **Test fixtures are well-structured**: The helper functions (`makeEpic`, `makeSlice`, `makeQuest`, `stateWithEpicAndOverview`, etc.) in `helpers.test.ts` are clean, composable, and make tests readable.
- **Proper cleanup**: `markdown-files.test.ts` correctly uses `beforeEach`/`afterEach` with temp directories and restores permissions in a `finally` block.
- **Type safety**: Tests use `satisfies` for fixture types and proper type imports. The `as any` override for the exhaustive switch test is correctly justified.
- **Assertions are precise**: Tests check both primary effects (status change) and side effects (overview sync, timestamp update), matching the plan's requirements exactly.
- **No production code changes**: All changes are test-only as required.

## Summary

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| Important | 0 | — |
| Minor | 3 | Double invocation in error test, biome-ignore vs plain comment (actually better), unnecessary dirname fallback |

All 3 test files cover the specified functions with the correct edge cases. The tests are well-structured, use appropriate assertions, and match the source code behavior. No missing test cases from the plan.
