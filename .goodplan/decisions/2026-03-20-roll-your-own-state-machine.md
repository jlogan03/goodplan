# Decision: Roll-Your-Own State Machine (Reducer + Transition Table)

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — researched TypeScript state machine libraries

## Decision

Build the state machine as a typed transition table with a generic reducer function (~50-80 lines of infrastructure). No external state machine library. The state machine is pure: `(state, event) → new state | error`. The event is a discriminated union carrying its full payload — no separate context argument.

## Rationale

The CLI's state machines are simple linear progressions with conditional branches — not complex statecharts with parallel regions or hierarchical states. More importantly, state is file-based (hydrated from `.project/` directory structure), and every library assumes in-memory state management, requiring an adapter layer that fights the library's design.

Alternatives considered:
- **XState v5** — best TypeScript support, but overkill (actor model, 17 KB, designed for UI orchestration). Would use ~20% of capabilities.
- **Robot3** — lightweight (1.2 KB) but weak TypeScript support, no compile-time transition validation
- **Newer libraries (ts-state-machines, fiume, etc.)** — none provide type-safe transitions + guards + context together
- **Reducer-only pattern** — considered, but a declarative transition table combined with a generic reducer gives the best of both: readable rules and event-driven semantics

## Consequences

- ~50-80 lines of state machine infrastructure to maintain, but it's straightforward code
- Transition tables are declarative and easy to read — serve as documentation of valid state flows
- XState v5 is the upgrade path if complexity grows (e.g., need parallel states)
- State machine is pure and trivially testable: `expect(reduce(table, 'refining', 'ROUND_COMPLETE', lowScoreCtx)).toEqual(...)`
- File-based state hydration is handled by the RPC layer, keeping the state machine pure
