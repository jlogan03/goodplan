# Decision: Entity-Namespaced Commands Replace Orchestrator Verbs

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — command surface evolved during architecture definition

## Decision

CLI commands are organized by entity namespace, not by orchestrator verb. Each entity type owns its full command set — both read-only queries (`epic:list`, `slice:show`) and workflow mutations (`epic:create`, `slice:plan`, `slice:complete`, `quest:abandon`). Global commands (`status`, `init`, `schema`) have no namespace.

Sub-agent commands (`start-*`/`submit-*`) remain as defined in the orchestrator-subagent-split decision — they are invoked by sub-agents, not users, and follow a different pattern by design.

## Rationale

Entity-namespaced commands group operations by *what you're working on* (an epic, a slice) rather than *what operation you're doing* (begin, complete). This is more natural for both humans (`goodplan slice:plan --slice 01-auth`) and LLMs (the entity type provides immediate context). Read-only commands (`list`, `show`) are distinguished by verb, not by a separate namespace — they live alongside mutations in each entity namespace and route directly to the Data Layer.

The original orchestrator verb pattern (`goodplan begin plan --slice`) mixed workflow phases with entity targeting in a way that made the command surface harder to learn — you had to know both the verb and the phase name.

Alternatives considered:
- **Orchestrator verbs** (begin/complete/status/context) — original design. Groups by operation type, splits related entity commands apart. Less intuitive.
- **Flat commands** (no namespaces) — collision risk between entity verbs and workflow verbs.

## Consequences

- Supersedes the command pattern portion of `2026-03-20-command-surface-conventions.md` (the other conventions in that decision — stdin JSON, target flags, `--override` — remain active)
- Each entity namespace maps to a set of `StateEvent` types in the state machine
- The RPC layer's generic `begin(phase, target)` / `complete(phase, target)` interface remains internally — commands-api.md maps entity verbs to RPC calls
- `goodplan schema` reflects the entity-namespace structure
