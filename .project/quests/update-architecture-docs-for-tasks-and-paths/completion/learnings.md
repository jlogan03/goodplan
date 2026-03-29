## New entity features need a doc checklist across all architecture layers
_Source: update-architecture-docs-for-tasks-and-paths_

The Task entity was fully implemented across all 4 layers (commands, RPC, state machine, data) but had zero documentation in commands-api.md, state-machine-api.md, or rpc-layer-api.md. Future entity additions should include a documentation checklist: commands-api (namespace section + mapping table), state-machine-api (StateEvent union entries), rpc-layer-api (BeginPhase type), data-model (schema registry patterns + entity section). Consider adding this as a step in the create-slices or create-plan skills when a slice introduces a new entity type.

## Fitness function docs must be updated when tests are written
_Source: update-architecture-docs-for-tasks-and-paths_

All 9 fitness function tests existed in tests/fitness/ but per-API docs still said "candidate — not yet written." The _overview.md had correct paths, creating an inconsistency. Future fitness function work should update both the per-API doc and the _overview.md maturity table in the same commit. Consider adding this to the /complete skill's architecture review as an automated check.

## Schema registry examples in architecture docs are high-drift-risk
_Source: update-architecture-docs-for-tasks-and-paths_

The schema registry examples in data-layer-api.md and data-model.md used flat slice paths that were restructured to nested epic-scoped paths during the entity-restructuring epic. Code examples embedded in architecture docs are particularly prone to drift because they're not validated by any automated process. Consider a fitness function that compares documented schema registry patterns against the actual schema-registry.ts file.
