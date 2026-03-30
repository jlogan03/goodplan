# Decision: `--inline` Flag Replaces `--depth` for Context Bundling

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — context bundling design

## Decision

Drop the `--depth=summary|standard|full` flag. Replace with a single `--inline` flag. Without `--inline`, commands return metadata and file path references only (compact). With `--inline`, commands additionally inline content in priority order up to a size budget (~20-30KB, tunable), with remaining content as file path references. `--query` (jqjs filter) remains available on any JSON-producing command.

## Rationale

The RPC commands (`begin`, `context`, `complete`) already know which phase they're serving — they can return exactly the right context without the caller choosing a depth level. The `--depth` flag was solving a problem that the RPC design already solves better.

The `--inline` flag addresses the real consumer distinction: orchestrators want compact metadata (no `--inline`), sub-agents want working content (`--inline`). Budget-based inlining with priority ordering naturally handles the size concern — critical content is always included, less relevant content is available as references for the LLM to read with its file tools.

Alternatives considered:
- **`--depth=summary|standard|full`** — original design. Three levels to choose from, but the RPC command already knows the phase, making caller-side depth selection redundant.
- **Always inline everything** — no flag needed, but risks context blowup for phases with large content sets (full architecture + all learnings + all decisions)
- **References only, never inline** — saves context but adds tool calls for every piece of content the sub-agent needs

## Consequences

- Simpler CLI interface — one boolean flag instead of three enum values
- Orchestrator agents leave off `--inline` to stay compact
- Sub-agents always use `--inline` to get working context
- Budget is tunable — can adjust as we learn how much context is optimal
- `--query` post-processes any JSON output, complementing `--inline` for further narrowing
