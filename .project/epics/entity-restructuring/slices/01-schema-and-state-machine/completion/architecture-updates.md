# Architecture Updates — 01-schema-and-state-machine

## Status

Architecture doc updates deferred to epic completion. The state machine and schemas now use nested paths, but RPC/commands (slice 02) and context (slice 03) still use flat paths. Top-level architecture docs should reflect a consistent state — updating now would describe a partial migration.

## Changes Made to Code (Not Yet in Docs)

- `epicOverviewSchema` replaces `overviewSchema` for `epics/overview.json`
- Schema registry uses nested path patterns
- `Target` slice variant has `epic: string`
- All 9 slice events carry `epic`
- `sliceSequence` removed from epicSchema
- All transition handlers use `epics/${epic}/slices/${name}` paths

## Deferred Doc Updates

- `data-model.md`: slice paths, overview schema, state tree example
- `state-machine-api.md`: helper signatures, event fields, guard paths
- `rpc-layer-api.md`: Target type (slice 02)
- `commands-api.md`: slice command signatures (slice 02)
