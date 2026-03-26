# Slice Sequencing

## Rationale

Schema and state machine are tightly coupled (events reference handlers, handlers reference schemas) — doing them in one slice ensures each slice compiles independently. RPC and commands build on the state machine. Context and learnings are lighter-touch changes. Skills are content updates. Tests and migration come last to validate everything and dogfood the migration on this repo.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | schema-and-state-machine | New epicOverviewSchema with embedded slices, Target type + event epic fields, all transition handler path updates, helper signature changes | None | Foundation — everything depends on these types and handlers |
| 02 | rpc-and-commands | RPC layer (begin.ts, complete.ts, paths.ts), all slice commands, status command, schema registry | 01 | Builds on state machine; gives us a working CLI |
| 03 | context-and-learnings | Context layer (priorities.ts, learnings.ts, resolveScope), remove learnings.md direct writes from /complete skill | 02 | Light touch; skill change is isolated |
| 04 | skills-update | Update all 11 skill files referencing .project/slices/ paths | 01-03 | Content changes only; depends on correct CLI behavior |
| 05 | tests-and-migration | Update test fixtures/assertions, migration code in migrate.ts, /migrate skill, self-migrate this repo | 01-04 | Validates everything; dogfood migration |
