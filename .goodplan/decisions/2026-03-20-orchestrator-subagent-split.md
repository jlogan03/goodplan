# Decision: Orchestrator and Sub-Agent Context Split

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: explore for epics/goodplan-cli — brainstorming orchestrator patterns

## Decision

The CLI serves two distinct consumers with different commands:

- **Orchestrator** uses `begin`, `status`, `complete`, `abandon` — manages state transitions, gets compact structured data (no content), decides what to do next.
- **Sub-agents** use `context` and `start-*`/`submit-*` — get deep working content, do the actual work (writing plans, reviewing code, implementing), and write results directly to the CLI without passing them through the orchestrator.

The orchestrator never sees full plan content, architecture files, or implementation details. Sub-agents call `submit-*` to write their results directly to the CLI, and return only a brief summary to the orchestrator.

## Rationale

The orchestrator's context is precious — it persists across the entire build flow (plan → refine → implement → synthesize). If sub-agent output flows through the orchestrator, large content (plans, architecture, implementation) consumes context that the orchestrator needs for routing decisions later in the flow.

Sub-agents have disposable context — they exist for one phase and their context doesn't need to survive. They can safely load deep content via `goodplan <phase> context`.

Alternatives considered:
- **Everything through the orchestrator** — orchestrator relays context to sub-agents and receives full results back. Simpler but context-hungry; the orchestrator can't survive the full build flow.
- **Single `begin` command returns both routing info and deep content** — forces the orchestrator to receive content it doesn't need.

## Consequences

- `context` is a separate read-only command, not folded into `begin`.
- Sub-agents are responsible for calling `submit-*` to persist their work — the orchestrator trusts that this happened based on the sub-agent's summary.
- After sub-agents complete, the orchestrator calls `status` to get the updated state rather than parsing sub-agent results.
- Interactive phases (plan creation, synthesize-changes) happen at the orchestrator level since they need user interaction. The orchestrator calls `context` for these phases and accepts the context cost because it needs the content to interview the user.
- Natural context compaction between phases is fine — the orchestrator can re-orient via `goodplan status --json`.
