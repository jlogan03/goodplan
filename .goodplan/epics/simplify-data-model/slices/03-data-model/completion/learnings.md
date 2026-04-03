# Learnings: 03-data-model

## Plan file estimates undercount by 2-3x when test fixtures have per-entity paths
_Source: 03-data-model_

The plan estimated ~36 files (14 source + 22 test). Actual was 102 files changed across 4 commits. The gap came primarily from test fixtures: 6 fixture directories each had 4 separate overview files (24 fixture files alone) that all needed consolidation, plus fixture-adjacent test updates. Future plans touching path-structured data should count fixture files separately and multiply by the number of fixture directories.

## Refinement reviewers catch critical RPC plumbing gaps that codebase research alone misses
_Source: 03-data-model_

Round 1 reviewers found 3 critical issues: wrong CLI command name (`gp upgrade` vs `gp migrate`), missing `CREATE_DECISION` state event update, and missing `BeginPayloadMap`/`begin.ts` plumbing. All three were in the codebase context research but weren't connected to plan tasks. The pattern: research identifies the locations, but plan authors skip intermediate layers (event schemas, RPC types) when reasoning about data flow. Three rounds of refinement brought scores from 5-6/10 to passing.

## Helper abstraction layers reduce overview consolidation blast radius
_Source: 03-data-model_

The 7 helper functions in `helpers.ts` (`updateOverviewStatus`, `addEpicToOverview`, etc.) encapsulated most overview path references. Updating those 7 functions transitively fixed most transition handlers. The exception was `task-lifecycle.ts` line 108, which bypassed helpers with a direct `getJson` call using a constructed path -- the holistic reviewer caught this in round 3. Lesson: when helpers exist, the plan should explicitly grep for direct path access that bypasses them.

## Conditional spread for exactOptionalPropertyTypes is mechanical but must be explicit in plans
_Source: 03-data-model_

The `...(value !== undefined ? { field: value } : {})` pattern was needed in every location that maps optional fields (decision transition handler, learning completion handler, RPC begin handler). The plan explicitly noted this pattern in Phase 1 and Phase 2 task notes. Without that note, implementers default to `field: value` which fails under `exactOptionalPropertyTypes: true`. This pattern should be a standing note in any plan that adds optional fields.

## HMAC recomputation is handled by commitState -- migration plans should not specify manual HMAC operations
_Source: 03-data-model_

Phase 4's initial plan specified manual HMAC add/remove operations. The holistic reviewer (round 3) clarified that `commitState()` recomputes the entire HMAC from the state tree, so stale entries are handled by absence. The real concern is sequencing: old files must be removed from the state tree before `commitState` runs. Future migration plans should reference `commitState` atomic semantics rather than per-path HMAC manipulation.

## entityPath validation belongs in the RPC layer, not the state machine
_Source: 03-data-model_

The decision `entityPath` field requires validation against actual entity paths in the project state. This validation was placed in `begin.ts` (RPC layer) using `getJson()` against the loaded `ProjectState` -- not in the transition handler (pure reducer, INV-003). This confirms the architectural boundary: the RPC layer handles validation that requires reading existing state, while the state machine handles pure state transitions. Plans should explicitly state which layer owns validation for new fields.

## processLearnings pass-through assumption held -- schema-only changes can work when handlers are opaque
_Source: 03-data-model_

Phase 2 (learning validity) required only 4 files changed: 2 schema files + 1 RPC mapping line + tests. The `processLearnings` helper passes `LearningEventEntry` objects through without field-by-field reconstruction, so adding `validUntil` to the schema was sufficient. The single RPC mapping line in `complete.ts` was the only non-schema code change. When handlers are opaque pass-through, new optional fields can be added with minimal code changes -- but the plan must verify this assumption holds by tracing the data flow.
