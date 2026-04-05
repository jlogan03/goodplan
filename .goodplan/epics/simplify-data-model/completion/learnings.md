# Learnings — Epic: simplify-data-model

## CLI-owned state + skill-owned UX is the correct separation
_Recurring across: 01, 02, 05, 07, 08_

The most impactful architectural decision was making the CLI own all state transitions and the skills own only user interaction and judgment. Every slice that tried to blur this boundary (direct file writes, manual activity-log appends, directory renames) created bugs. The start-epic rewrite (340→115 lines) proved the pattern: three CLI calls replaced hundreds of lines of filesystem manipulation. Future skills should start from "what CLI commands do I need?" not "what files do I need to read/write?"

## Orchestrator pattern scales but requires strict context discipline
_Recurring across: 02, 04, 05, 06_

The orchestrator pattern (interactive phases in-context, autonomous phases delegated to agents) scaled from the 2-phase plan-slice PoC to the 6-phase create-epic pipeline. The key constraint that made it work: orchestrators never read full artifact content — they pass file paths and consume compact summaries. Violations are model-dependent (opus respects the constraint more reliably than sonnet), so enforcement must be structural (fitness functions, harness metrics), not just prompt-based.

## Agent definitions via @ references solve the plugin permission problem
_Recurring across: 02, 04, 06_

Plugin skills can't Read files outside their directory, but agent definitions (`agents/*.md`) with `@${CLAUDE_PLUGIN_ROOT}/path` references are resolved at load time by Claude Code. This solved the shared-content distribution problem. 34 agents now share review preambles, output formats, and conventions without Read permission issues. The compose-via-@-reference pattern is the right default for any shared content in plugin context.

## Test harness isolation requires explicit three-world enforcement
_Recurring across: 01, 06, 07_

The repo source, installed plugin, and test harness are three separate worlds that must never be confused. Every test run that leaked user config, touched the plugin cache, or used installed binaries instead of local builds produced unreliable results. The harness now uses `settingSources: []`, `plugins: [{ type: "local" }]`, filtered PATH, and a dedicated CLAUDE.md with isolation principles.

## Plan file estimates undercount 2-3x for per-entity path changes
_Recurring across: 03, 05_

When a data model or schema change touches per-entity paths (e.g., adding a field to every entity type's schema, command, and RPC handler), the actual file count is 2-3x the initial estimate. Plans for cross-entity changes should enumerate all affected layers explicitly rather than estimating.

## E2E validation metrics must test pipeline correctness, not LLM output quality
_Recurring across: 07, 08_

Character counts, heading counts, and severity-level requirements are model-dependent proxies that fail when the LLM produces correct but terse output. Metrics should verify structural pipeline outcomes: files exist, CLI status is correct, CLI-injected fields are present, cross-scope rollup happened. This principle is now codified in `tools/dogfood/CLAUDE.md`.

## Forward-compatibility gates prevent brittle skill breakage
_Recurring across: 02, 05_

Adding field-presence checks for future CLI fields (like `reconsiderWhen`, `validUntil`) lets skills gracefully handle CLI upgrades without breaking. The pattern: check if the field exists in the CLI response before using it, with a sensible default when absent. This is cheaper than coordinating skill and CLI releases.
