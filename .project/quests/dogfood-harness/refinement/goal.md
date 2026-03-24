# Confirmed Goal

Build a test harness using `@anthropic-ai/claude-agent-sdk` that programmatically runs goodplan's CLI-integrated skills against the `nondet-eval` sample repo, exercising the full workflow lifecycle (explore → architecture → slices → plan → implement → complete) to validate that skills and CLI work together correctly. Uses Haiku for cost efficiency. The `canUseTool` callback intercepts `AskUserQuestion` for fully autonomous execution.

**Done**: The harness can run `bun tools/dogfood/harness.ts all` end-to-end (reset → Phase 2 → Phase 3 → Phase 4), driving nondet-eval through two completed epics and at least one completed quest, with a friction log capturing all issues discovered during execution.
