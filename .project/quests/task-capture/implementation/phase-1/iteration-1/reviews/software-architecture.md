# Software Architecture Review: Phase 1 — Task Entity & Schema

## Issues

**[IMPORTANT]** CONVERT_TASK inlines quest/epic creation without reusing existing handler logic
The `handleConvertTask` function in `task-lifecycle.ts` duplicates the quest and epic JSON shapes from `quest-create.ts` and `epic-create.ts` respectively. The plan explicitly calls for this ("CONVERT_TASK must inline quest/epic creation using tree helpers ... Do NOT call reduce() recursively"), so the inlining approach is architecturally correct. However, the duplicated JSON shapes (quest.json fields at line 136-143, epic.json fields at lines 148-159, epic subdirectories at lines 163-178) create a maintenance risk: if `questSchema` or `epicSchema` gains a required field in the future, `handleConvertTask` must be updated in lockstep or it will produce invalid entities. Consider extracting the entity JSON construction into shared builder functions in `helpers.ts` (e.g., `buildInitialQuestJson(name, goal, ts)` and `buildInitialEpicJson(name, goal, ts)`) that both the create handlers and CONVERT_TASK can call. This keeps the no-recursive-reduce constraint while centralizing the shape.
File: src/core/state/transitions/task-lifecycle.ts:133
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `addEpicToOverview` silently returns unchanged state if overview is missing
The new `addEpicToOverview` helper (helpers.ts line 404-415) silently returns `state` when `epics/overview.json` is undefined. By contrast, `handleCreateEpic` (epic-create.ts line 67-72) returns a `STATE_INVALID_TRANSITION` error when the overview is missing. The `handleConvertTask` handler separately guards for the overview's existence (task-lifecycle.ts line 103-110) before calling `addEpicToOverview`, so the silent fallback is never reached in practice. But the inconsistency is a trap for future callers who might use `addEpicToOverview` without a preceding guard. Return an error or throw, matching the `handleCreateEpic` pattern, or at minimum add a doc comment stating the caller must guard overview existence.
File: src/core/state/transitions/helpers.ts:404
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `updateTaskOverviewStatus` does not set `completed` timestamp on terminal transitions
When a task transitions to `dropped` or `converted`, `updateTaskOverviewStatus` updates the `status` field but does not set the `completed` timestamp. Existing entity patterns (quest, epic, slice) set `completed` on terminal transitions for accurate lifecycle tracking and reporting. The overview `completed` field stays `null` for dropped/converted tasks, which makes `task:list --filter=all` unable to show when tasks were resolved.
File: src/core/state/transitions/helpers.ts:438
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Transition tables in architecture docs not updated with task transitions
The transition tables doc (`architecture/transition-tables.md`) is the declared source of truth for the state machine, but no task section has been added. This is likely deferred to a later phase or doc update, but it creates a gap between the code and the documented spec.
File: .project/architecture/transition-tables.md:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong implementation that follows established codebase patterns closely. The task entity, state events, schema registry, RPC types, and test coverage all mirror existing quest/epic patterns with appropriate adaptations. The CONVERT_TASK handler is well-structured with correct guards. The duplicated entity construction shapes and the missing `completed` timestamp are the main gaps preventing a 9+; extracting shared builder functions and setting `completed` on terminal transitions would bring this to 9/10.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
