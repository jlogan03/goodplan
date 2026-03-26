# Epic Approved

## Decision
Approved for activation.

## Rationale
Architecture proposal defines a clean four-layer CLI architecture (Commands → RPC → State Machine + Data Layer) with a unified state object pattern, pure state machine, and comprehensive invariants. The proposal was developed through extensive interactive design including two-pass design tree exploration covering subsystem boundaries, communication patterns, state management, and data ownership. 13 architectural decisions recorded.

## Architecture Proposal Files
- `architecture-proposal/_overview.md` — system summary, subsystems, maturity table
- `architecture-proposal/conventions.md` — architectural patterns, module boundaries
- `architecture-proposal/data-model.md` — entities, JSONL records, unified state object, cache
- `architecture-proposal/flows.md` — key workflows and state transition patterns
- `architecture-proposal/state-machine-api.md` — pure reducer API, events, transition tables
- `architecture-proposal/data-layer-api.md` — filesystem I/O, state assembly, concurrent modification
- `architecture-proposal/rpc-layer-api.md` — workflow orchestration, context bundling
- `architecture-proposal/commands-api.md` — CLI command surface
- `architecture-proposal/invariants.md` — 6 system-wide invariants

## Notes
- Top-level `.project/architecture/` is NOT updated at this point — it reflects current reality
- Epic architecture is the target state; top-level is updated incrementally by `/complete` as slices land
