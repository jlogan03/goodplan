# Decision: Four-Layer Unidirectional Architecture

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — subsystem decomposition

## Decision

The CLI uses a four-layer architecture with strict unidirectional dependencies: Commands → RPC Layer → State Machine + Data Layer → Filesystem. Resource commands (CRUD) bypass the RPC layer and go directly from Commands to the Data Layer. The State Machine has no dependency on the Data Layer — it is a pure rules engine with no I/O.

## Rationale

Unidirectional dependencies make each layer independently testable. The State Machine is pure functions (no filesystem mocking needed). The Data Layer is mechanical I/O with validation (test against temp directories). The RPC Layer coordinates between them and can be tested by injecting dependencies. The Commands layer is thin parsing/formatting.

Alternatives considered:
- **Fewer layers (Commands + Core + Data)** — merges RPC and State Machine, losing the testability benefit of a pure state machine
- **More layers (separate Context Bundler subsystem)** — context bundling is always invoked through RPC commands, so a separate subsystem creates an artificial boundary

## Consequences

- RPC Layer has the most responsibility — it coordinates state reads, transition validation, state writes, activity logging, and context bundling
- State Machine can be thoroughly tested with pure function tests — no I/O setup required
- Adding new workflow operations means adding to the RPC layer, not spreading logic across layers
- Each layer has a clear, narrow interface to the layers below it
