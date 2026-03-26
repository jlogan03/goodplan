# Holistic Review (Round 2) — Task Capture Plan

## Issues

**[IMPORTANT]** Phase 1 CONVERT_TASK handler creates quest/epic in `created` status but does not set `refinement: null`
The plan says CONVERT_TASK step 5 creates quest JSON via `setEntry()` with `{ name, goal: task.title + description, status: "created", created: ts }`. But looking at the actual quest schema (`src/schemas/entities/quest.ts`), a quest requires `refinement: refinementSchema.nullable()` and `updated: timestampSchema`. The plan's quest creation shape is missing both `refinement: null` and `updated: ts`. This will fail Zod validation on write (INV-005). The plan should specify the full quest shape: `{ name, goal, status: "created", refinement: null, created: ts, updated: ts }`. Same concern applies to epic creation — verify epic schema required fields.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `"drop"` and `"convert"` BeginPhase values are too generic — collision risk
The plan adds `"drop"` and `"convert"` as `BeginPhase` values. These are entity-agnostic names, unlike the existing task-specific `"create-task"` phase. If a future entity needs a drop or convert operation, these phase names will collide. The existing pattern uses entity-prefixed names for entity-specific operations (e.g., `"create-decision"` vs `"create"`). Consider `"drop-task"` and `"convert-task"` for consistency and to avoid future naming collisions. Alternatively, if `"drop"` and `"convert"` are intentionally generic (like `"abandon"`), the plan should document that these are reusable phases that dispatch by target type, and add the corresponding dispatch logic in `buildBeginEvent` (like `buildAbandonEvent` dispatches by target type).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `mapToBeginPhase()` and `resolveForBeginPhase()` in `paths.ts` have exhaustive switches that need updating
The plan mentions updating `mapToBeginPhase()` and `resolveForBeginPhase()` in Phase 1, but the task list only says "Add cases to `buildBeginEvent()`, `mapToBeginPhase()`, and `resolveForBeginPhase()`" as a parenthetical note after the BeginPhase task. These are in `src/core/rpc/paths.ts` (not `begin.ts`). Since both functions have exhaustive `never` defaults, missing cases will cause compile errors. The plan should have explicit, separate task items for adding `"create-task"`, `"drop"` (or `"drop-task"`), and `"convert"` (or `"convert-task"`) to both `mapToBeginPhase()` and `resolveForBeginPhase()` — they are lifecycle phases, so they should return `{}` for paths.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `task:convert` command description mixes flag and stdin input in an unusual way
The plan says `task:convert` uses `--task <name> --to quest|epic` flags for scalars AND reads optional stdin for `name`/`goal` overrides. No existing command uses this hybrid pattern — commands either use flags (e.g., `quest:abandon`) or stdin (e.g., `quest:create`). The `--to` flag is fine, but reading optional stdin alongside flags adds complexity. Consider: (a) make `name` and `goal` also flags (simpler, consistent with `quest:abandon` flag-only pattern), or (b) require all input via stdin (consistent with `quest:create` stdin-only pattern). The hybrid approach works but an implementer may struggle with the optional-stdin edge case (what happens when stdin is empty vs. not provided).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `task:create` expected behavior uses `echo '{"name":"...","title":"..."}' | goodplan task:create --json` but Phase 1 says `name` required in stdin schema
The expected behavior and the schema are consistent on `name` being required, which is good. However, the expected behavior output says `{ entity, newStatus: "open" }` which does not match the actual `BeginResult` shape: `{ entity, phase, previousStatus, newStatus, paths? }`. The expected output should include `phase` and `previousStatus` fields to be accurate and falsifiable.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 task for adding `title` to `overviewItemSchema` may break existing overview validation
The plan adds `title: z.string().optional()` to the shared `overviewItemSchema`. This is backward-compatible at the Zod level (optional fields don't break parsing of existing data). However, this change affects ALL overview files (epics, slices, quests) — not just tasks. The plan should note that existing overview entries will simply have no `title` field (which is fine with `.optional()`), but the implementer should verify that `commitState` round-trips existing overview files without adding `title: undefined` entries (due to `exactOptionalPropertyTypes`).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 skill verification items are still not fully falsifiable
Round 1 flagged that "Skill auto-captures context" and "Skill uses judgment" are not falsifiable. The revised plan improved by adding CLI-based end-to-end checks ("End-to-end: install skill, create task via CLI, verify task:list --json shows it"). However, the Phase 3 Expected Behavior section still contains "Skill auto-captures context from `goodplan status --json` and `git branch`" and "Skill uses judgment" as checklist items with no concrete pass/fail criteria. These should either be removed (since they describe skill prompt behavior, not testable behavior) or replaced with concrete checks (e.g., "Create a task via CLI with context fields populated — verify task:show includes context snapshot").
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:convert` returns `BeginResult` for the task transition but doesn't surface the created entity name
The plan says `task:convert` returns "standard BeginResult for the task transition (open -> converted)". The `BeginResult` type has `{ entity, phase, previousStatus, newStatus, paths? }` where `entity` would be the task name. But the user also needs to know the created quest/epic name. The human output handles this ("Created quest: <quest-name>") but the JSON output doesn't include the converted entity name. Consider extending the result or using `paths` to include the created entity's directory, so JSON consumers can programmatically discover what was created.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All 3 critical issues from round 1 are resolved: init handler update is present, CONVERT_TASK inlining is specified with clear steps, and transition table documentation is included. The plan is substantially improved — it now explicitly lists all exhaustive-switch touch points, specifies the `"create-task"` BeginPhase, uses flags for `task:drop`, and includes architecture doc updates. The remaining issues are mostly about precision (missing schema fields in CONVERT_TASK quest creation, generic phase names, expected behavior accuracy) rather than structural gaps.

To reach 9+: fix the CONVERT_TASK quest/epic creation shape to include all required schema fields, decide on phase naming convention for drop/convert, and ensure expected behavior outputs match actual return types.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
