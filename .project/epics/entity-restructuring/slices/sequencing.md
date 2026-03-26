# Slice Sequencing

## Rationale

Schema and state machine are tightly coupled (events reference handlers, handlers reference schemas) — doing them in one slice ensures each slice compiles independently. Slice 01 also includes schema registry (Data Layer, not RPC), epic overview helpers (`updateOverviewStatus`, `addEpicToOverview`, new `addSliceToOverview`), DeferredItem targetEpic field, activity log scope strings, and fitness test fixture updates — these all depend on the schema changes and would cause silent data loss if deferred. RPC and commands build on the state machine. Context and skills are lighter-touch changes that only depend on slice 01's types/paths. Tests and migration come last to validate everything and dogfood the migration on this repo.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | schema-and-state-machine | New epicOverviewSchema with embedded slices, Target type + event epic fields, all transition handler path updates, helper signature changes, schema registry patterns, epic overview helpers, DeferredItem targetEpic, activity log scope strings, fitness test fixtures | None | Foundation — everything depends on these types, helpers, and registry |
| 02 | rpc-and-commands | RPC layer (begin.ts, complete.ts, paths.ts), all slice commands, status command — consumes schema registry from slice 01 | 01 | Builds on state machine; gives us a working CLI |
| 03 | context-and-learnings | Context layer (priorities.ts, learnings.ts, resolveScope, entityDir()) — TS only | 01 | Only needs state machine types/paths; no RPC dependency |
| 04 | skills-update | Update all 16 skill files referencing .project/slices/ paths + /complete skill learnings.md removal | 01 | Content changes only; needs path convention from slice 01 |
| 05 | tests-and-migration | Update test fixtures/assertions, migration code in migrate.ts, /migrate skill, self-migrate this repo (with rollback procedure) | 01-04 | Validates everything; dogfood migration |

Note: Slices 02, 03, and 04 can proceed in parallel after slice 01 completes — they are independent of each other. Each slice updates architecture docs for the changes it introduces.
