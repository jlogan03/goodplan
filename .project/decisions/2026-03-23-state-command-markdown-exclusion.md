# Decision: State command excludes markdown content by default

**Status**: active
**Date**: 2026-03-23
**Domain**: architecture
**Context**: create-plan for slice 01-state-command-convention-doc-tracer

## Decision

`goodplan state --json` serializes markdown entries as `true` (existence marker only). The `--inline` flag includes full markdown content as strings. The default protects agents from accidental context flooding.

## Rationale

LLM agents have limited context windows. Accidentally dumping all architecture docs, plans, and research into a state response wastes context. Existence-only serialization forces intentional reads via the Read tool, which is better for context management. The `--inline` flag provides an explicit opt-in when cross-file analysis requires markdown content through the state tree.

Alternative considered: always include markdown content (matching `assembleState()` behavior). Rejected because the primary consumers (LLM agents) would frequently receive unwanted content, and the `--query` flag doesn't prevent internal jq processing of the full tree.

Alternative considered: budget-based `--inline[=<bytes>]` limiting total markdown bytes. Deferred — boolean toggle is sufficient for now; budget can be added later if needed.

## Consequences

- Architecture jq examples showing markdown content reads (e.g., `.architecture["flows.md"]`) return `true` by default, content only with `--inline`
- Skills must use the Read tool for markdown content in normal workflows
- Discovery queries (`.architecture | keys`, `| has("plan.md")`) work unchanged
- The serialization function must handle the `--inline` toggle when transforming the state tree
