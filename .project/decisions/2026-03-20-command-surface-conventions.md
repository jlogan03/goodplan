# Decision: Command Surface Conventions for goodplan CLI

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: explore for epics/goodplan-cli — brainstorming command surface design

## Decision

The goodplan CLI uses the following conventions:

1. **Colon-namespaced commands**: `epic:`, `build:`, `resource:` group related commands. Global commands (`status`, `schema`, `init`, `abandon`, `delete`) have no namespace.
2. **Unflagged positional arguments are always commands/subcommands, never data.** All identifiers (slice names, epic names, reviewer types, phase numbers) are flags.
3. **Phase-level verbs** (orchestrator): `begin`, `status`, `context`, `complete`, `abandon`.
4. **Action-level verbs** (sub-agents): `start-<action>`, `submit-<action>`.
5. **stdin JSON for mutations** (`create`, `update`, `complete`, `submit-*`). Read-only commands use CLI args only. CLI merges args and stdin into `{ cli: {...}, stdin: {...} }` and validates with Zod.
6. **Target flags required on every call** — no implicit state from prior commands. Enables safe concurrent sessions.
7. **`--override` flag** on refinement `complete` to accept despite scores not meeting threshold.

## Rationale

The colon namespace groups commands by workflow area while keeping a flat command structure. Flags-only for identifiers prevents naming collisions between data values and subcommands. Separating `begin`/`status` (orchestrator) from `start-*`/`submit-*` (sub-agent) creates a clear contract between the two contexts. Requiring target flags on every call avoids hidden coupling and makes each command self-describing.

Alternatives considered:
- **Verb-first hierarchy** (`goodplan begin refinement`) — groups all `begin` commands together but splits related refinement commands apart. Domain-first is more natural.
- **Positional args for identifiers** (`goodplan refinement round 3`) — collision risk between data values and subcommands.
- **Implicit target from state** — fewer flags but hidden coupling and concurrency issues.

## Consequences

- Every command is self-contained and can be understood in isolation.
- `goodplan schema` returns a clean hierarchy grouped by namespace.
- The `resource:` namespace keeps CRUD operations out of the way since the LLM rarely uses them directly.
- CLI framework (citty) needs to support colon in command names or treat namespace:command as a single routing token.
