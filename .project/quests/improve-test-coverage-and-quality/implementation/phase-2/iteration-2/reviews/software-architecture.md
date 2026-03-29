# Software Architecture Review — Phase 2: Unit Tests for Critical Files (iteration 2)

## Issues

**[MINOR]** helpers.test.ts: `updateOverviewStatus` pairing contract still untested

The iteration-1 IMPORTANT issue noted that `updateOverviewStatus` (the companion to `setEpicStatus`) had no tests. The iteration-2 diff shows this remains absent. The test for `setEpicStatus` (line 430–444) correctly documents the split behavior — "Overview is NOT updated by setEpicStatus (that's updateOverviewStatus)" — but there is still no test exercising `updateOverviewStatus` alone or the correct caller pattern of `setEpicStatus` + `updateOverviewStatus`. The overview mutation helpers `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview` are also still absent.

This was an IMPORTANT in iteration-1 and was listed as one of the unresolved gaps. It is downgraded to MINOR here because the highest-risk functions (guards, refinement logic, learnings rollup, the status-setters that include overview sync for slices and quests) are all covered. The epic split pattern is real but the behavior is already exercised indirectly through the broader state tests. However the explicit unit contract for `updateOverviewStatus` is still missing from this file.

File: tests/unit/state/helpers.test.ts:430
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** markdown-files.test.ts: error path test uses `try/catch` correctly but skips the `expect.unreachable` signal for the copy failure path

`writeMarkdownFiles` error path (lines 45–64) now uses a clean single try/catch with `expect.unreachable` — that is correct and addresses the iteration-1 MINOR. However `copyMarkdownFiles` has an error path (when `copyFileSync` fails on a non-missing-source scenario) that is untested. The "skips missing source gracefully" test covers the `existsSync` fast-path but not the `copyFileSync` failure path (which also throws `GoodplanError` with `DATA_WRITE_ERROR`). This is a minor gap — the error throw path in `copyMarkdownFiles` follows the same pattern as `writeMarkdownFiles` so the risk is low, but it is a real error path in the module's public contract.

File: tests/unit/data/markdown-files.test.ts:82
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** serialize.test.ts: empty top-level tree now covered, but deeply-nested markdown in `NO_INLINE` mode lacks a test confirming the boolean `true` propagates through directory recursion

The iteration-1 MINOR about missing empty-tree top-level case is resolved (line 133–137). All four entry types are exercised. One remaining gap: there is no test with a markdown file nested inside a subdirectory using `NO_INLINE`, which would confirm `serializeDirectory`'s recursion correctly threads the `options` argument down to `serializeMarkdown`. The current markdown tests are flat. This is low risk (the recursive call passes `options` by reference) but the explicit case is absent.

File: tests/unit/data/serialize.test.ts:71
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Significant improvement from iteration-1 (8/10). The iteration-1 IMPORTANT issue (double-invocation / redundant error test pattern) is resolved in markdown-files.test.ts. The serialize.test.ts empty-tree case is added. The helpers.test.ts structural improvements (fixture helpers, type-narrowing patterns, activity log tests) are sound.

All three files test through public module APIs, use real state tree construction (no mocks for state logic), use real temp directories for I/O tests, and align with project conventions (Vitest, INV-003 purity boundary respected — helpers.test.ts imports no I/O modules). Test boundary alignment is good: helpers tests are pure in-memory, markdown-files tests use real fs, serialize tests use real tree types.

The remaining gaps are all MINOR: the `updateOverviewStatus` pairing contract, the `copyMarkdownFiles` error path, and the nested-markdown recursion case. None represent architectural risks — they are coverage completeness items.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
