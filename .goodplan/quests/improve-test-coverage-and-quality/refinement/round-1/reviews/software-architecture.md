# Software Architecture Review: Improve Test Coverage and Quality

## Issues

**[IMPORTANT]** INV-001 fitness function lists version-stamp as a filesystem write exception, but it is not one

Phase 4 task for `mutation-through-state-machine.test.ts` says: "fs.writeFileSync / fs.writeFile for .json files only appears in src/core/data/commit.ts (and documented exceptions: version-stamp, migrate)." However, `version-stamp.ts` does NOT perform direct filesystem writes -- it uses `setEntry()` on the in-memory tree, which is then written through `commitState()` like everything else. The actual exception for direct `.json` writes outside `commit.ts` is only `migrate.ts`. Including `version-stamp` as an exception will cause the fitness function to have an incorrect allowlist and could mask real violations.

The fitness function should verify that `fs.writeFileSync`/`fs.writeFile` for `.json`/`.jsonl` files only appears in `src/core/data/commit.ts` and `src/core/rpc/migrate.ts` (documented INV-001 exception). `version-stamp.ts` should not be in the exception list. Also note that `markdown-files.ts` writes to the filesystem, but only `.md` files -- the fitness function scope should be explicit that it only guards JSON/JSONL entity files, not markdown.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 task says to update `commands-api.md` and `rpc-layer-api.md` but also mentions `_overview.md` in verification

The Phase 4 verification bullet says "_overview.md fitness function listings are accurate" but the tasks only mention updating `commands-api.md` and `rpc-layer-api.md`. The `_overview.md` subsystem maturity table already lists fitness functions per subsystem. If the new fitness functions (structured-errors for Commands, mutation-through-state-machine for RPC Layer) should appear there, a task must explicitly say so. Currently, `_overview.md` shows no fitness functions for RPC Layer (just "candidate" for Context). The new INV-001 fitness function should be listed in the RPC Layer row and the new INV-007 fitness function should be listed in the Commands row.

Add an explicit task to Phase 4: "Update `_overview.md` subsystem maturity table to list `tests/fitness/structured-errors.test.ts` in the Commands row and `tests/fitness/mutation-through-state-machine.test.ts` in the RPC Layer row."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 helpers.test.ts task scope omits several exported functions

The plan lists functions to test in `helpers.ts` but omits: `getEpic`, `getProject`, `getSlice`, `getQuest`, `getTask`, `setEpicJson`, `setSliceJson`, `setQuestJson`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, `createEpicSubdirectories`, `updateOverviewStatus`, `updateSliceOverviewStatus`, `updateQuestOverviewStatus`, `updateTaskOverviewStatus`, `isEpicTerminal`, `isSliceTerminal`, `isQuestTerminal`, `isTaskTerminal`, `buildInitialQuestJson`, `buildInitialEpicJson`. Many of these are simple getters or wrappers, but the status setters (`setSliceStatus`, `setQuestStatus`, `setEpicStatus`) are explicitly called out in the plan -- the overview sync behavior they test is important. The other functions are reasonable to omit for prioritization, but this should be an explicit choice documented in the task description (e.g., "Focus on high-risk logic; simple getters and terminal checks are covered transitively by integration tests").

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 event count of 41 should be derived, not hardcoded

The plan says to change `toHaveLength(38)` to `toHaveLength(41)`. Both are hardcoded magic numbers that will drift again whenever events are added. This is the exact "stale test data" problem the phase is trying to fix. Consider noting that the implementer should also add a comment explaining how to derive the count (e.g., counting `type:` lines in `state-events.ts`), or better, making the test derive the count from the schema itself so it cannot go stale. This is a minor improvement opportunity rather than a blocking issue -- the current approach matches the existing test pattern.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 diagnosis guidance could be more precise about the binary staleness check

The plan says "run `bun run build` first, then re-run tests" but the test suite already has `global-setup.ts` that compiles the binary before tests run. If the binary is stale, it means `global-setup.ts` is recompiling from the current source every time. The more likely root cause (per the research file) is fixture schema drift or validation changes, not a stale binary. The plan should note that `global-setup.ts` already handles compilation and redirect the investigation toward checking if the 53 failures are fixture-related (missing `tasks/` directory in fixtures, which Phase 3 also fixes).

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases and good Expected Behavior sections. The test-only scope is appropriate and avoids production code risk. However, the INV-001 fitness function has an incorrect exception list that would undermine the invariant it guards, and the architecture doc update task is incomplete (misses `_overview.md`). These are substantive accuracy issues in an otherwise sound plan. Fixing the two IMPORTANT issues and tightening the task descriptions would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
