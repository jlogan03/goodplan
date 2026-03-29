# Decision: Every CLI Command Maps to Exactly One State Machine Transition

**Status**: active
**Date**: 2026-03-29
**Domain**: architecture
**Context**: Plugin distribution epic — designing `nextCommands` feature that derives available commands from the transition table

## Decision
Every CLI command triggers exactly one state machine transition. Additional mutations (entity creation, activity log appends, directory creation) are RPC-layer side effects, not state machine events.

## Rationale
The `nextCommands` feature derives available commands directly from the transition table by inverting the mapping: current state → valid events → CLI commands. This only works reliably if each command corresponds to exactly one transition. Multi-transition commands would require special-case logic that undermines the derivation.

The existing `task:convert` command (which creates a quest/epic as a side effect of converting a task) is reframed: the state machine sees one event (`CONVERT_TASK` on the task entity), and the quest/epic creation is an RPC-layer side effect — not a second transition.

Alternatives considered:
- Allowing multi-transition commands with a parallel registry mapping commands to transitions. Rejected because it creates a maintenance burden and divergence risk between the registry and the actual command behavior.
- Keeping `nextCommands` as a static lookup table independent of the transition table. Rejected because it duplicates the state machine's knowledge and can drift out of sync.

## Consequences
- `nextCommands` can be derived from the transition table alone — no parallel registry needed
- Future CLI commands must follow the 1:1 constraint or the `nextCommands` derivation breaks
- `task:convert` must be refactored to treat target entity creation as an RPC-layer side effect, not a state machine event
- This constraint should be added to `.project/architecture/invariants.md` as a system-wide invariant
