# Slice 12: Migration + Dogfood

## Goal

Implement the full `gp migrate` command (v1 -> v2 state migration) and run the capstone end-to-end dogfood test against real project state. By this point, each preceding slice has its own tier-appropriate integration tests (CLI binary tests for 05-07b, Agent SDK harness tests for 08-11). This slice validates the full system works together against real `.goodplan/` state, and that migration from v1 produces a valid v2 event log.

## In Scope

- `gp migrate` full implementation -- convert `.state-cache.json` and v1 artifacts to v2 event log
- Migration path: detect v1 state, read existing artifacts, emit equivalent v2 events, verify integrity
- Test harness updates in `tools/dogfood/` for v2 validation
- Real epic dogfood -- run the full workflow against this repo's `.goodplan/` state
- Rollback strategy: git checkout as escape hatch

## Out of Scope

- All prior slices (01-11) -- must be complete before this slice starts

## Dependencies

- Slices 01-11 (all prior slices) -- migration exercises the entire system

## Verification

1. `gp migrate` detects v1 projects and converts state to v2 event log
2. Migrated state passes `gp verify` integrity checks
3. `gp status --json` produces correct output from migrated state
4. Dogfood test harness exercises full v2 pipeline (create epic -> plan slice -> implement -> land)
5. Migration is idempotent (running twice produces same result)
6. Git checkout rollback works as escape hatch

## Estimated Sessions

2-3
