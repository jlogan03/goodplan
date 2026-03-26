# TypeScript Reviewer — Phase 1: Task Entity & Schema (Iteration 1)

## Issues

**[IMPORTANT]** `context` field is required on `taskSchema` but the event type makes it optional

In `src/schemas/entities/task.ts:32`, `context: taskContextSchema` is a required field (not `.optional()`). However, in `src/schemas/state-events.ts:108`, `CREATE_TASK` defines `context?: TaskContext` as optional. The handler in `task-create.ts:50` bridges this with `context: event.context ?? {}`, which works correctly at runtime (empty object satisfies all-optional `taskContextSchema`). This is a deliberate design choice, not a bug -- but it means reading a task always returns a `context` object (never absent), while the command input and event both allow omission. This asymmetry is intentional and consistent (input-side optional, stored-side always present). No fix needed, but documenting for completeness.

**Severity downgrade: MINOR** -- the bridging logic is correct and the type checker validates it.

File: src/schemas/entities/task.ts:32
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `title` field on `overviewItemSchema` uses `z.string().optional()` without `.min(1)`

In `src/schemas/entities/overview.ts:8`, the new `title` field is `z.string().optional()`. Other string fields in the same schema use `.min(1)` (e.g., `name`, `status`, `epic`). For consistency, `title` should be `z.string().min(1).optional()` to reject empty-string titles. An empty string would pass validation but be meaningless for display.

File: src/schemas/entities/overview.ts:8
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `addEpicToOverview` helper in `helpers.ts` accepts `status: string` instead of typed `EpicStatus`

The new `addEpicToOverview` helper at `src/core/state/transitions/helpers.ts:406` accepts `status: string`. Other analogous helpers like `addQuestToOverview` also accept `status: string` (line 367), so this is consistent with existing patterns. However, using the specific status enum types (`EpicStatus`, `QuestStatus`, `TaskStatus`) in these helpers would provide tighter compile-time safety. This is a pre-existing pattern issue, not introduced by this phase.

File: src/core/state/transitions/helpers.ts:406
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `updateTaskOverviewStatus` accepts `newStatus: string` instead of `TaskStatus`

Same as above -- `updateTaskOverviewStatus` at `src/core/state/transitions/helpers.ts:431` uses `string` for the status parameter. Using `TaskStatus` would be more type-safe, catching typos at compile time.

File: src/core/state/transitions/helpers.ts:431
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. All types compile cleanly with strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). The `exactOptionalPropertyTypes` concern is handled correctly via conditional spread pattern. Zod schemas correctly infer TypeScript types (`z.infer<typeof ...>`). Discriminated unions for events and targets are properly extended with exhaustive checking. Test coverage is thorough (22 tests covering happy paths, guards, edge cases). The MINOR issues are consistency nits, not correctness problems. The one thing preventing a perfect 10 is the `string` vs enum type looseness in helpers, which is a pre-existing pattern.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
