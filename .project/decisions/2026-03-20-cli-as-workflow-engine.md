# Decision: CLI Owns Deterministic Workflow Mechanics

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: explore for epics/goodplan-cli — brainstorming orchestrator patterns

## Decision

If it doesn't need the LLM, it belongs in the CLI. The `goodplan` CLI is a workflow engine, not just a state store. It owns all deterministic workflow mechanics: refinement loop tracking (round numbers, score history, trend detection), circuit breakers, implementation phase/iteration counting, escalation rules, mode enforcement, and transition validation.

## Rationale

It's far easier to add complexity to the CLI and write tests for it than to add complexity to skill prompts, which are fundamentally non-deterministic and much harder to test. The CLI can enforce invariants that the LLM might forget or misinterpret (e.g., "stop after 10 rounds," "don't allow implementation if user chose plan-only mode").

Alternatives considered:
- **Skill prompts encode all workflow logic** — current approach, but the LLM must correctly count rounds, track scores, and enforce rules every time. Error-prone and untestable.
- **Split mechanics between CLI and skill** — considered, but any mechanic that doesn't need the LLM is strictly better in the CLI.

## Consequences

- The CLI's RPC layer is richer than a typical state management tool — `begin`/`status`/`complete` responses include loop tracking data, valid next actions, and enforcement decisions.
- The orchestrator skill prompt becomes simpler — it calls `begin`, does the LLM work, calls `complete`, and acts on the CLI's response.
- Three responsibility buckets: CLI (deterministic mechanics), LLM orchestrator (routing decisions that benefit from judgment, user interaction), LLM sub-agents (the actual work).
- The CLI becomes more tightly coupled to the workflow, but this is acceptable because the CLI and skills are versioned together.
