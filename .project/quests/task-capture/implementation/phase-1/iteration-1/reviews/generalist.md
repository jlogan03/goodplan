# Generalist Review: Phase 1 — Task Entity & Schema

**Score: 9/10**

## Summary

Phase 1 implementation is thorough, well-structured, and closely follows the plan. All task items are complete. The new task entity integrates cleanly into the existing state machine, schema registry, RPC layer, and test infrastructure. Code reuse is excellent — shared helpers follow established patterns (epic/quest/slice), and the conditional spread pattern for `exactOptionalPropertyTypes` is applied consistently.

## Findings

### Critical: 0

None.

### Important: 1

1. **Lazy overview test doesn't actually test the lazy path** (`tests/unit/state/task.test.ts:118-134`)
   The test "lazily creates tasks/overview.json for existing projects without it" calls `initProject()` which now creates `tasks/overview.json` via INIT_PROJECT. The test then verifies it exists and creates a task on it — but never exercises the code path in `task-create.ts:33-39` where `overview === undefined`. To test the lazy creation, the test would need to construct a state that has `project.json` but lacks `tasks/overview.json` (simulating a pre-task-feature project). The current test is a no-op for the lazy path — it passes but doesn't validate the feature it claims to test.

### Minor: 2

1. **Schema registry ordering inconsistency** (`src/core/data/schema-registry.ts:31-32`)
   The tasks entries are placed after the "Entity JSON" comment block but are not grouped with the overview entries above. The `tasks/overview.json` pattern sits under the "Entity JSON" comment alongside `tasks/[^/]+/task.json`, while all other overview patterns are grouped together under the "Overview JSON" comment (lines 23-25). This works correctly (first-match wins, and the patterns are unambiguous) but breaks the visual grouping convention.

2. **`as const` assertions on string literals** (`src/core/state/transitions/task-create.ts:48`, `task-lifecycle.ts:55,124`)
   The `"open" as const`, `"dropped" as const`, `"converted" as const` assertions are unnecessary since these are literal string values in object literals already typed by the schema. Other transition handlers in the codebase (e.g., `epic-create.ts`) don't use `as const` for status strings. Harmless but inconsistent.

## Checklist

| Criterion | Pass | Notes |
|---|---|---|
| Plan adherence | Yes | All plan tasks completed, event shapes match spec exactly |
| Cross-file integration | Yes | All 7 exhaustive switches updated, schema registry, reduce handler record, init handler — no orphan references |
| Code reuse | Yes | New helpers (`getTask`, `isTaskTerminal`, `updateTaskOverviewStatus`, `addEpicToOverview`) follow existing patterns; CONVERT_TASK correctly inlines entity creation per INV-003 |
| Completeness | Yes | 3 events, 2 transition files, schema + command schema, RPC types/begin/paths, fitness test entries, comprehensive unit tests |
| Type safety | Yes | Conditional spreads for optional fields, `satisfies` exhaustiveness on handler record, `never` defaults on all switches |
| Test coverage | Good | 18 unit tests covering happy paths, guards, terminal state rejection, duplicate rejection, activity log entries, overview sync. Missing: lazy overview edge case (see Important #1) |
| Build/lint/test | Yes | tsc clean, lint clean, 1021/1022 pass (pre-existing failure) |
