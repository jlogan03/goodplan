# Plan: Epic Lifecycle — Full Entity CRUD + Data Layer Upgrades

## Overview

Implement the complete epic entity lifecycle through the full-stack load→reduce→commit pattern. This is the most complex entity lifecycle (~20 transition rows, 12+ statuses) and proves the transition pattern for all subsequent entities. Also adds the deferred data layer upgrades from slice 02: `loadState()` with `.state-cache.json` cache and concurrent modification detection in `commitState()`.

Approach: bottom-up (matching slice 02). Types first, then data layer upgrades (independent from epic logic), then state machine transitions, then RPC layer generics, then CLI commands, then submit commands + end-to-end verification. Each phase is independently testable.

Key decisions:
- Every StateEvent carries `ts: string` (RPC-injected, per slice 02 convention)
- `reduce()` uses a handler Map (not switch) for scalability across ~25+ event types
- Refinement circuit breaker logic is shared across COMPLETE_REFINE_ARCHITECTURE, COMPLETE_REFINE_SLICES, and COMPLETE_REFINEMENT_ROUND
- The generic RPC API (`begin`/`complete`/`submit`) replaces the one-off `rpcInit()` pattern
- Activity log entries are produced by the state machine (part of the new state tree), not the RPC layer
- `loadState()` re-reads newly detected files fully (not stubs) when `readdirSync` finds LLM-written files
- Concurrent modification detection compares on-disk content against oldState before writing

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | StateEvent Types & Status Enums | Extend StateEvent union with ~20 epic events + slice submit events. Add all error codes. |
| 02 | Data Layer Upgrades | loadState() with cache, concurrent modification detection in commitState() |
| 03 | Epic State Machine Transitions | All ~20 epic transition handlers + slice submit handlers. Pure functions. |
| 04 | RPC Layer: begin/complete/submit | Generic RPC API replacing one-off rpcInit pattern |
| 05 | Epic CLI Commands | All epic:* commands with stdin, output modes, command registration |
| 06 | Submit Commands + Integration | submit-plan/refinement/implementation/refine-slices + end-to-end verification |
