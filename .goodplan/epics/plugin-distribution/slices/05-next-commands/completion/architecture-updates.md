# Architecture Updates — 05-next-commands

## Changes Made

1. **rpc-layer-api.md**: Added `nextCommands: NextCommands` to `BeginResult`, `SubmitResult`, `CompleteResult` type definitions. Added new `### Next Commands` section documenting the `NextCommands` and `CommandEntry` types, the derived registry pattern, and the module-init derivation approach.

2. **commands-api.md**: Updated `--json` output description to note that all mutation commands include `nextCommands` in their JSON output. Read-only commands do not.

## Alignment with Epic Target Architecture

The implementation aligns with the plugin-distribution epic's target architecture (`_overview.md`):
- Registry derives from existing state machine data structures (transition tables)
- Entity/other command sections match the target design
- Read-only commands excluded
- nextCommands documented as an approximation (guards may prevent listed commands)

## Changes Declined

None.

## Flagged as Tech Debt

None.
