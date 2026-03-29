# Architecture Updates: 04-slice-lifecycle

## Updates Made During Implementation

1. **rpc-layer-api.md**: Simplified `deferredRouted` type from `{ item: DeferredItem; target: string }[]` to `DeferredItem[]` (DeferredItem already contains targetSlice). Added `deferredSkipped: number` field to CompleteResult.

2. **state-machine-api.md**: Added `goal: string` to CREATE_SLICE event payload (was missing but required by slice.json schema).

## Architecture Alignment

No divergences from the epic's target architecture. All invariants hold:
- INV-001: All mutations go through state machine (verified)
- INV-003: State machine purity maintained (grep confirms no fs imports)
- INV-004: All commands use explicit target flags (--slice, --epic)
- INV-005: Schema validation on read and write (Zod safeParse throughout)
- INV-007: Structured errors with correct exit codes (exit 3 for state machine errors)

## Declined / Tech Debt

None.
