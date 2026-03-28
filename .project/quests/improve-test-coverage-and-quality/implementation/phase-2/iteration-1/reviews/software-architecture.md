# Software Architecture Review — Phase 2: Unit Tests for Critical Files

## Issues

**[IMPORTANT]** helpers.test.ts tests only 8 of 30 exported functions — significant public API surface untested

The helpers.ts module exports 30 public functions/constants. The test covers: `evaluateRefinement`, `guardEpicStatus`, `guardSliceStatus`, `guardQuestStatus`, `processLearnings`, `appendActivityLog`, `setSliceStatus`, `setQuestStatus`, `setEpicStatus`. That is 9 out of 30 exports. Notably missing:

- `updateOverviewStatus` (epic overview sync — the complement to `setEpicStatus` which the test explicitly notes does NOT sync overview)
- `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview` (overview mutation helpers used during entity creation)
- `buildInitialQuestJson`, `buildInitialEpicJson` (entity builder factories)
- `createEpicSubdirectories` (directory scaffolding)
- `updateTaskOverviewStatus`, `isTaskTerminal`, `getTask` (task helpers)
- `isSliceTerminal`, `isEpicTerminal`, `isQuestTerminal` (terminal status checks)
- `getEpic`, `getSlice`, `getQuest`, `getProject` (getter helpers)

Many of these are trivial (getters, terminal checks), but `updateOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, and `updateTaskOverviewStatus` contain real logic (null-guard, map transform) that should be tested — especially since overview sync bugs are a class of issue that silently corrupts state.

The phase description says "3 highest-risk untested files" — the test does cover the highest-risk functions (guards, refinement, learnings), but for a file this central to the state machine, the overview mutation helpers are a notable gap.

File: tests/unit/state/helpers.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** serialize.test.ts lacks empty-tree edge case

`serializeStateTree` is called with `dir({})` as a nested child (line 116-117) but never as the top-level input. Testing `serializeStateTree(dir({}), NO_INLINE)` returning `{}` is trivial but confirms the base case of the recursion.

File: tests/unit/data/serialize.test.ts:36
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** markdown-files.test.ts error test has redundant double-call pattern

The error path test (lines 54-65) calls `writeMarkdownFiles` twice: once inside `expect(...).toThrow()` and again inside a manual try/catch. The second call is testing the error code, but `toThrow` already confirmed the throw. A cleaner pattern: single try/catch asserting both `instanceof GoodplanError` and `.code` in one block, or use Vitest's `toThrowError` matcher and a separate assertion on the caught error. The current pattern executes the failing I/O operation twice unnecessarily.

File: tests/unit/data/markdown-files.test.ts:54
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Test boundary alignment — helpers.test.ts tests through public API correctly but misses the overview sync contract

The test for `setSliceStatus` (line 381) correctly verifies both the slice.json update AND the overview sync — this is the right boundary. However, `setEpicStatus` (line 419) explicitly asserts that overview is NOT updated, with a comment saying "that's updateOverviewStatus". This is accurate documentation of behavior, but since `updateOverviewStatus` itself is not tested anywhere in this file, there is a gap in the module's public contract coverage. The caller must pair `setEpicStatus` + `updateOverviewStatus` to get full sync — that pairing pattern should have at least one test.

File: tests/unit/state/helpers.test.ts:419
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The tests are well-structured, test through public APIs, use real state tree fixtures (no mocks), and align with project conventions (Vitest, no filesystem mocks for state tests, real temp dirs for I/O tests). The test boundary choices are sound — helpers are tested as pure functions operating on `ProjectState`, and markdown-files are tested with real filesystem operations in temp directories. The serialize tests cover all entry types including the exhaustive switch guard.

To reach 9+: add coverage for the overview mutation helpers (`updateOverviewStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`) which are the most architecturally important untested functions — they maintain the overview ↔ entity consistency that INV-001 depends on flowing through the state machine.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
