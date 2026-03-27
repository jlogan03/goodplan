# Architecture Updates: 02-rpc-and-commands

## Changes Made

1. **`commands-api.md`**: Updated `slice:list` to show `--all` flag, `slice:show` to show `--epic` flag.
2. **`rpc-layer-api.md`**: Already updated during implementation (Target type includes `epic`).

## Declined / Not Needed

- No divergences between implementation and epic target architecture for RPC, commands, or context layers.
- The epic target calls for eliminating `slices/overview.json` and top-level `slices/` directory — this is a migration concern for slice 05, not a doc issue.

## Tech Debt

None flagged.
