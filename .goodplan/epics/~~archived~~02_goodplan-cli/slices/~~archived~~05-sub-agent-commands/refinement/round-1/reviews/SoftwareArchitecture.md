# Software Architecture Review: Sub-Agent Commands & Quest Lifecycle

## Issues

**[IMPORTANT] Phase 4 priorities table missing `complete` phase**
The rpc-layer-api.md and transition-tables.md both define a `complete` phase in the per-phase content priority table (for both slice and quest). Phase 4's `priorities.ts` task lists 8 phases (`plan`, `refinement`, `implementation`, `explore`, `architecture`, `slices`, `refine-architecture`, `refine-slices`) but omits `complete`. The architecture spec says `complete` has: "Entity goal, remaining slice overview, implementation results, current architecture, target architecture, learnings at all levels." This phase is used when the orchestrator calls `quest:complete` or `slice:complete` and wants inline context. Without it, `startContext(state, 'complete', target, options)` would fail or produce incorrect results.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `startContext()` signature diverges from rpc-layer-api.md**
The architecture spec defines `startContext(phase: SubmitPhase, target: Target, options: WorkflowOptions): ContextBundle`. Phase 4 proposes `startContext(state, phase, target, options)` where `state` is passed in by the caller. This means `start-*` commands in Phase 5 call `loadState()` themselves and pass the state tree. The divergence is actually reasonable (read-only commands should not be coupled to RPC's loadState pattern), but it means the rpc-layer-api.md signature is incorrect. The plan should note this as a deliberate deviation and include a task to update the architecture doc. Additionally, `SubmitPhase` doesn't include `complete` -- if `startContext` is called for `complete` phases, the type may need to be broadened or a separate `ContextPhase` type introduced.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `CompleteInput` quest variant missing `learnings` and `architectureDelta` fields**
Phase 1 task 2 says to "extend the `CompleteInput` quest variant" to add `learnings?: LearningInput[]` and `architectureDelta?: ArchitectureDeltaInput[]`. The current code at `src/core/rpc/types.ts:131` shows `{ type: "quest"; verificationPassed: boolean }` with no optional fields. Phase 2's `quest-complete.ts` handler needs `event.learnings` and `event.architectureDelta` from the `COMPLETE_QUEST` event. Phase 1 correctly identifies this gap. However, the COMPLETE_QUEST event definition (Phase 1, task 1) carries `learnings` and `architectureDelta` directly on the event, while the `CompleteInput` changes are on the RPC input type. The coercion logic in Phase 3 (`complete.ts` extension) must mirror the slice pattern: `input.learnings ?? []` and `input.architectureDelta ?? []`. This is stated in Phase 3 task 2 but only as "coerce undefined arrays to `[]`" -- the plan should be explicit that this requires the conditional spread pattern for `exactOptionalPropertyTypes` compliance, same as Phase 3 task 11 (`quest:complete` command). Currently, the plan's description is consistent but terse -- confirm the coercion pattern matches the slice precedent in `buildCompleteEvent`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Context bundling module placement vs. architectural layering**
The plan places context bundling at `src/core/context/` and describes it as "a distinct module within the RPC layer." The architecture overview confirms this placement. However, Phase 4 says `startContext()` takes a `ProjectState` parameter and is "read-only -- no state mutations, no reduce() call." Phase 5's `start-*` commands call `loadState()` directly (Data Layer) then `startContext()` (context module). This means `start-*` commands bypass the RPC layer entirely: Commands -> Data Layer + Context Module. This is actually cleaner than routing through the RPC layer for a read-only operation, but it means the context module is not truly "within the RPC layer" -- it's a peer module consumed by both the RPC layer (when `--inline` is set on mutations) and Commands (for `start-*`). The architecture docs should reflect this: `src/core/context/` depends on tree types and Data Layer reads, but not on the RPC layer or State Machine. This clarification matters for dependency direction correctness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Quest handler file organization diverges from codebase research prediction**
The codebase research file predicts `quest-lifecycle.ts` as one of the expected new files. The plan instead uses `quest-complete.ts` and `quest-abandon.ts` as separate files (matching the slice pattern: `slice-complete.ts`, `slice-abandon.ts`). This is actually more consistent with existing conventions. The research file's prediction was slightly off, but the plan's choice is correct. No action needed -- noting for completeness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 quest-plan.ts sets `activeQuest` but doesn't guard existing `activeQuest`**
The transition table says BEGIN_QUEST_PLAN sets `project.json` `activeQuest`. Phase 2 describes "No sequential enforcement guard" for quests (correct -- quests are independent). However, should there be a guard against setting `activeQuest` when another quest is already active? The transition table doesn't specify this guard (unlike ACTIVATE_EPIC which guards `activeEpic == null`). If the intent is that multiple quests can be "active" in the sense that only the most-recently-started is tracked, that's fine -- but it's worth confirming this is deliberate, since the existing epic pattern guards against concurrent activation. If concurrent quest work is intended, `activeQuest` should perhaps track the latest or be an array.
Resolution: USER_INPUT

**[MINOR] `quests/overview.json` creation not explicitly addressed in Phase 2 quest-create handler**
Phase 2 task 1 says CREATE_QUEST "Updates `quests/overview.json` (adds item)." But it doesn't address the case where `quests/overview.json` doesn't exist yet (first quest creation). The epic-create and slice-create handlers handle this by creating the overview if absent. The plan should explicitly state whether CREATE_QUEST creates `quests/overview.json` if it doesn't exist, or assumes it's pre-created by INIT_PROJECT. Looking at the data model, INIT_PROJECT creates `epics/overview.json` but there's no mention of `quests/overview.json`. The handler needs to handle the "first quest" case.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured, follows proven patterns from slice 04, and correctly identifies all the gaps in the current codebase. The bottom-up phasing (types -> state machine -> RPC/CLI -> context -> e2e) is sound. However, there are two architectural concerns that need resolution: (1) the `complete` phase is missing from the context bundling priority tables, which is a functional gap, and (2) the `startContext()` function signature and module placement need to be reconciled with the architecture docs. The quest lifecycle portions are clean and closely mirror the established slice patterns. Addressing the IMPORTANT issues above (priority table completeness, type signature alignment, architecture doc updates, overview.json initialization) would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
