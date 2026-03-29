# Architecture Updates: 02-project-init

## Changes Made

1. **_overview.md — State Machine dependencies**: Updated from "Dependencies: None (pure functions)" to include shared tree types at `src/core/tree.ts`. The state machine depends on pure tree types/helpers (no I/O) extracted to a shared module during integration review.

2. **state-machine-api.md — Timestamp convention**: Added `ts: string` field to `INIT_PROJECT` event and documented the convention that events producing timestamped entities include `ts`, injected by the RPC layer to preserve reducer purity (INV-003).

## No Changes Needed

- Data layer API (`data-layer-api.md`) — still accurate. `assembleState`/`commitState` match documented contracts.
- Commands API (`commands-api.md`) — `--query` implies `--json` was already documented correctly.
- Invariants (`invariants.md`) — all invariants held. INV-003 (reducer purity) was initially violated by `new Date()` but caught and fixed during review.

## Flagged as Tech Debt

None.
