# Architecture Updates — update-architecture-docs-for-tasks-and-paths

This quest improved architecture doc accuracy — no new divergences introduced. Changes made:

- **commands-api.md**: Added Task namespace (5 commands), task commands in mapping table
- **state-machine-api.md**: Added 3 task events, fixed CREATE_QUEST goal field, fixed COMPLETE event type names, updated 3 fitness functions to actual test paths
- **rpc-layer-api.md**: Added 3 task BeginPhase values and event mappings
- **data-layer-api.md**: Fixed schema registry to nested paths, added task patterns, fixed epicOverviewSchema, updated 5 fitness functions
- **data-model.md**: Fixed schema registry to nested paths, added task patterns, fixed epicOverviewSchema
- **conventions.md**: Removed stale dirs, added task entries, added 3 missing skills
- **docs/primer.md**: Rewrote directory structure to match current reality
- **flows.md**: Removed stale tracer bullet note

No architecture changes declined or flagged as tech debt.
