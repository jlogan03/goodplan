# Decision: Promote all 4 CLI subsystems from Experimental to Developing

**Status**: active
**Date**: 2026-03-23
**Domain**: architecture
**Context**: complete for epics/goodplan-cli

## Decision

Promote Commands, RPC Layer, State Machine, and Data Layer from Experimental to Developing maturity.

## Rationale

All 4 subsystems have been stable across 8 consecutive slices without public interface changes (since slice 03 for core subsystems). State Machine has 2 fitness functions, Data Layer has 5, Commands has 2 — all with real assertions. RPC Layer has no direct fitness functions but is tested indirectly via 30 integration tests.

Alternatives considered:
- Keep at Experimental: rejected — 8 slices of stability with fitness functions exceeds Experimental criteria
- Promote only State Machine and Data Layer: rejected — all 4 showed equal stability, and RPC Layer's indirect testing is sufficient for Developing

## Consequences

Changes need to be deliberate (not free as in Experimental). Future work should consider impact on dependents when modifying these subsystems. RPC Layer should get direct fitness functions before promotion to Maturing.
