# Plan: Epic Lifecycle — Full Entity CRUD + Data Layer Upgrades

Status: COMPLETE
Completed: 2026-03-22

## Overview

Implement the complete epic entity lifecycle through the full-stack load→reduce→commit pattern. This is the most complex entity lifecycle (~20 transition rows, 12+ statuses) and proves the transition pattern for all subsequent entities. Also adds the deferred data layer upgrades from slice 02: `loadState()` with `.state-cache.json` cache and concurrent modification detection in `commitState()`.

Approach: bottom-up (matching slice 02). Types first, then data layer upgrades (independent from epic logic), then state machine transitions, then RPC layer generics, then CLI commands, then submit commands + end-to-end verification. Each phase is independently testable.

Key decisions:
- `ts: string` is NOT universal — per state-machine-api.md convention, only events that produce timestamped entities carry `ts`. The canonical union currently has `ts` on INIT_PROJECT only. CREATE_EPIC (sets `created`, `updated`) and ACTIVATE_EPIC (sets `activated`) also need `ts` — Phase 1 includes a task to amend state-machine-api.md's canonical union to add `ts` to these two events. All other epic events do not set timestamp fields and do not carry `ts`. The `updated` field is set at creation (CREATE_EPIC) and only refreshed by ACTIVATE_EPIC — all other transition handlers must leave it unchanged (retaining whatever value was set at creation or last activation). This means a `getJson<Epic>(state, path)` after a non-create/non-activate transition will still have a valid `updated` timestamp from the most recent create/activate.
- `reduce()` uses a handler Map with typed handler signatures (`Extract<StateEvent, { type: T }>`) and explicit imports (not side-effect registration) for scalability across ~25+ event types
- Refinement circuit breaker logic is shared across COMPLETE_REFINE_ARCHITECTURE, COMPLETE_REFINE_SLICES, and COMPLETE_REFINEMENT_ROUND
- The generic RPC API (`begin`/`complete`/`submit`) replaces the one-off `rpcInit()` pattern
- Activity log entries are produced by the state machine (part of the new state tree), not the RPC layer
- `loadState()` uses directory mtime comparison for cache validation, incrementally reads newly detected files when mtimes change
- Concurrent modification detection compares on-disk content against oldState before writing

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | StateEvent Types & Status Enums | Extend StateEvent union with 16 in-scope epic events + 6 submit events (pulled forward from slices 04-05). Add epicSchema refinement field. Add all error codes. |
| 02 | Data Layer Upgrades | loadState() with cache, concurrent modification detection in commitState() |
| 03 | Epic State Machine Transitions | All ~20 epic transition handlers + slice submit handlers. Pure functions. |
| 04 | RPC Layer: begin/complete/submit | Generic RPC API replacing one-off rpcInit pattern |
| 05 | Epic CLI Commands | All epic:* commands with stdin, output modes, command registration |
| 06 | Submit Commands + Integration | All 8 submit-* commands (plan/refinement/implementation/explore/architecture/slices/refine-architecture/refine-slices) + end-to-end verification |
