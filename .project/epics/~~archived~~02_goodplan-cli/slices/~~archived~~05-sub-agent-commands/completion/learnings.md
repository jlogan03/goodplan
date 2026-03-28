# Learnings: 05-sub-agent-commands

## Greenfield modules accumulate more review issues than pattern-following code

Phase 4 (context bundling, no codebase precedent) had 8 issues across 3 reviewers vs Phase 2 (quest state machine, following established slice handler patterns) with 0 issues and two 10/10 scores. When a phase introduces novel code, budget extra review iterations during planning.

## Command families that differ only by a parameter need a factory pattern

8 start-* commands share ~400 lines of identical logic, differing only by phase string and target flag. The "one file per command" convention works for structurally different commands but creates maintenance burden for parameterized families. Use a factory function that returns a command definition, keeping individual files as thin wrappers.

## Overview `completed` timestamps are never set by status-changing handlers

`updateQuestOverviewStatus` and `updateSliceOverviewStatus` only update the `status` field. The `completed` field in overview items stays permanently `null` for all entities. Future work should set `completed` when transitioning to a terminal state (completed/abandoned).

## Peer modules that need each other's types should use a shared types file

The context module needed `Target` and `SubmitPhase` from RPC, while RPC needed `ContextBundle` from context. Bidirectional `import type` works at compile time but violates the independent-modules principle documented in the architecture. Extract shared types to a common location (e.g., `src/core/types.ts`) rather than creating circular imports between peer modules.

## Priority table content should be exhaustively verified against architecture specs

The explore phase was missing completed epics/quests sources defined in transition-tables.md. Automated tests checked priority table structure (all phases present, correct types) but not spec completeness. A spec-driven test that enumerates expected source keys per phase from the architecture would catch this class of omission.
