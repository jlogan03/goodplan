# Plan: Slice Lifecycle — Full Entity CRUD + Workflow + Completion

Status: COMPLETE
Completed: 2026-03-22

## Overview

Implement the complete slice entity lifecycle through the same load→reduce→commit pattern proven in slice 03. This is the core development workflow entity with the richest completion logic: deferred work routing, learnings-at-completion with rollupTo targeting, architecture delta recording, and implicit epicComplete detection.

Approach: bottom-up (matching slices 02-03). Types first, then state machine transitions, then RPC wiring, then CLI commands, then end-to-end verification. Each phase is independently testable. The slice/quest submit handlers (COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION) already exist from slice 03 — this slice adds the remaining slice event types and their handlers.

Key decisions:
- All events carry `ts: string` (universal convention established in slice 03)
- Sequential enforcement: BEGIN_PLAN checks previous sibling slice status via slices/overview.json
- COMPLETE_SLICE is the most complex handler: deferred routing modifies other slices' deferred arrays, learnings append to both slice-level and rolled-up destinations, architectureDelta records subsystem changes, epicComplete flag when all siblings are done
- `slice:complete` stdin carries the richest payload: verificationPassed, deferred[], learnings[], architectureDelta[]
- The `complete()` RPC function is extended with full CompleteInput fields (deferred, learnings, architectureDelta were stub-only in slice 03)
- Guard helpers from slice 03 (guardEpicStatus, evaluateRefinement, appendActivityLog, updateOverviewStatus) are reused; new `guardSliceStatus` follows the same pattern

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | StateEvent Types | Add 6 new slice event types (3 submit events already exist from slice 03) + Learning/ArchitectureDelta input Zod schemas for CompleteInput |
| 02 | Slice State Machine | All slice transition handlers: CREATE_SLICE, BEGIN_PLAN (sequential), COMPLETE_SLICE (deferred + learnings + epicComplete), ABANDON_SLICE |
| 03 | RPC Layer Wiring | Wire remaining slice BeginPhase values + extend complete() with full CompleteInput |
| 04 | Slice CLI Commands | All 8 slice:* commands with stdin, output modes, command registration |
| 05 | End-to-End Integration | Full lifecycle walkthrough, sequential enforcement, circuit breaker, deferred routing, epicComplete, binary regression |
