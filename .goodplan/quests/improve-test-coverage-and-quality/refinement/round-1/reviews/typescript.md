# TypeScript and JavaScript Review

Reviewer: typescript
Iteration: 1
Plan: /Users/iwhite/Repos/goodplan/.project/quests/improve-test-coverage-and-quality/plan-refining.md

## Issues

**[IMPORTANT]** Phase 2 helpers.test.ts task overstates `setEpicStatus` behavior
The plan says to "verify status updated AND overview.json synced" for `setEpicStatus`. However, `setEpicStatus` (line 64 of helpers.ts) does NOT sync overview.json — it only updates `epics/{name}/epic.json`. Overview sync is a separate function `updateOverviewStatus`. In contrast, `setSliceStatus` and `setQuestStatus` DO bundle overview sync. The test task should test `setEpicStatus` for what it actually does (set status + timestamp only), and separately test `updateOverviewStatus` if overview sync coverage is desired.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 helpers.test.ts task is incomplete — 30+ exported functions, plan covers ~10
The plan lists 5 function groups to test: `evaluateRefinement`, guards, `processLearnings`, `appendActivityLog`, and status setters. But `helpers.ts` exports 30+ functions including `getEpic`, `getProject`, `getSlice`, `getQuest`, `getTask`, `setEpicJson`, `setSliceJson`, `setQuestJson`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, `buildInitialQuestJson`, `buildInitialEpicJson`, `createEpicSubdirectories`, `updateTaskOverviewStatus`, `isSliceTerminal`, `isEpicTerminal`, `isQuestTerminal`, `isTaskTerminal`, and `updateSliceOverviewStatus`. A helpers.test.ts that only covers 10 functions would leave the "3 critical untested files" goal partially unmet. The plan should either explicitly scope which functions to test and justify omissions, or include all exported functions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 INV-001 fitness function approach has a gap — version-stamp modifies state via tree helpers, not fs writes
The plan says to check that `fs.writeFileSync`/`fs.writeFile` for `.json` files only appears in `commit.ts`. But `version-stamp.ts` (a documented INV-001 exception) does NOT use `fs.writeFileSync` — it uses `setEntry` (the tree helper), so it would pass the proposed static analysis check regardless. The real INV-001 violation to detect is code that calls `commitState` without going through `reduce()` first, or code that writes `.project/` JSON files directly. The `migrate.ts` exception DOES use `fs.writeFileSync` (lines 895, 924, 1298), so it IS correctly identified as an exception. However, the test description should clarify what it actually catches: direct filesystem writes bypassing the data layer. The import graph verification (commands/RPC don't import `fs` write functions directly) is a better signal for the real invariant.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 event count: plan hardcodes 41 but should derive count dynamically
The plan says to change `toHaveLength(38)` to `toHaveLength(41)`. The grep on `state-events.ts` confirms 41 `type:` lines currently. But this test has already drifted once (38 was correct when written, became stale when 3 task events were added). Instead of hardcoding 41, the test should derive the expected count from the source — e.g., parse the StateEvent union type or maintain the allTypes array as the single source of truth and just verify uniqueness + exhaustiveness. At minimum, add a comment explaining how to determine the correct count, so it doesn't silently drift again.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 markdown-files.test.ts — "Atomic write pattern — temp file cleaned up on success" is not directly testable
The plan asks to verify the temp file is cleaned up on success. But `writeMarkdownFiles` uses `fs.renameSync(tmpPath, absPath)` — the temp file becomes the final file atomically. There's no moment where both exist. Testing "temp file cleaned up" would require intercepting mid-write, which means mocking — contradicting the project convention of no filesystem mocks. The test should instead verify the atomic write indirectly: write succeeds, file exists with correct content, and no `.tmp.*` files remain in the directory.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 last task references `_overview.md` but the plan text says `commands-api.md` and `rpc-layer-api.md`
The verification section says "\_overview.md fitness function listings are accurate" but the task says to update `commands-api.md` and `rpc-layer-api.md`. Both need updating — `_overview.md` also has fitness function listings in its maturity table (e.g., "RPC Layer" currently shows "—" for fitness functions). The task should explicitly include updating `_overview.md` as well, or the verification will fail.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 serialize.test.ts — "Exhaustive switch coverage (all StateEntry types)" should test the `never` branch
The plan lists testing exhaustive switch coverage but doesn't specify how. The serializer has a `default: never` exhaustive check that throws on unknown types. The test should include a case that passes an invalid entry type (via type assertion) to verify the error path, confirming the exhaustive switch guard works at runtime.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases, good Expected Behavior sections, and appropriate verification steps. The TypeScript-specific issues are moderate: the helpers.test.ts scope gap is the most significant (covering ~1/3 of exports in a file described as "critical untested"), the `setEpicStatus` behavior mismatch would produce a misleading test, and the hardcoded event count perpetuates the exact staleness problem Phase 3 aims to fix. To reach 9+: fix the `setEpicStatus` description, expand or explicitly scope helpers.test.ts coverage, make the event count derivation dynamic, and correct the INV-001 fitness function description.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
