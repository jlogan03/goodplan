# Plan: Decisions, Learnings & Full Status

## Overview

Implement the cross-cutting features that span entity types: decision management (create/update with status lifecycle), manual learnings rollup, full status command, universal `--query` on all commands, and schema command for stdin introspection. Also fix O(n²) learnings rollup in existing COMPLETE_SLICE and COMPLETE_QUEST handlers.

Approach: state machine first (3 new event types + O(n²) fix), then CLI commands, then status replacement, then cross-cutting `--query` and schema. Phases 1-2 follow proven entity patterns; Phases 3-4 are independent features.

Key decisions:
- Decision events use the existing `DecisionEntry` schema from `src/schemas/records/`
- ROLLUP_LEARNINGS is a reducer-level operation (filter + batch append), invisible to RPC
- O(n²) fix: collect all project-rollup entries in COMPLETE_SLICE/COMPLETE_QUEST, single `setEntry`
- `--query` lifted to shared `output()` via `globalArgs` — every command gets it
- Schema command introspects citty definitions + stdin schema registry (INV-006)

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Decision & Rollup State Machine | 3 new events (CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS), handlers, O(n²) learnings rollup fix |
| 02 | Decision & Learnings CLI | RPC wiring, 7 new commands (4 decision + 3 learning) |
| 03 | Full Status Command | Replace stub with real artifact counts, active entities, recommendations |
| 04 | Universal --query & Schema | Lift --query to shared output(), schema command (INV-006), E2E |
