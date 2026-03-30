# Decision: Skill Prompts Contain Concrete CLI Commands

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: explore for epics/goodplan-cli — brainstorming skill-CLI integration

## Decision

Skill files contain the concrete `goodplan` CLI commands that the LLM should execute at each workflow step. The `goodplan schema` command serves as an escape hatch for edge cases where the LLM encounters unexpected errors or format mismatches. In the future distribution epic, the CLI will generate and install skill files, eliminating drift by construction.

## Rationale

LLMs follow system-level instructions (skill prompts) faithfully but are trained to be skeptical of instructions from tool outputs (prompt injection concern). Putting exact CLI commands in the skill prompt means the LLM knows what to call without discovery overhead. Having the CLI generate behavioral instructions at runtime would risk the LLM treating them as data rather than directives.

Alternatives considered:
- **Schema-driven discovery** — skill says "check the schema, then call the appropriate command." Adds tool calls and risks misinterpretation.
- **CLI generates skill prompt fragments** (`--format=skill-prompt`) — clever but runs into prompt injection skepticism. Tool output is data, not instructions.
- **Hybrid with schema as primary** — extra tool calls on every invocation for information that's static between CLI versions.

## Consequences

- Skill prompts must be updated when CLI commands change. This is acceptable because the CLI and skills are versioned together, and the future distribution epic will have the CLI generate skills automatically.
- `goodplan schema` is still valuable for: human users learning the CLI, LLM self-recovery from errors, and as the source of truth for skill generation.
- Skill prompts include the key stdin JSON fields inline. The complete schema shape is available via `goodplan schema` if needed.
