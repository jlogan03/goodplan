# TUI & CLI Review — Round 2

## Round 1 Resolution Assessment

Round 1 had 2 CRITICAL issues:

1. **CRITICAL-1 (command surface inconsistency)**: RESOLVED. commands-api.md now defines entity-namespaced commands (`epic:create`, `slice:plan`, etc.) with a clear mapping table from commands to `StateEvent` types. Sub-agent commands (`start-*`/`submit-*`) are documented in a dedicated section. flows.md uses the correct command syntax throughout. The entity-namespaced-commands decision supersedes the earlier command-surface-conventions decision and is referenced properly.

2. **CRITICAL-2 (`--inline-context` naming)**: RESOLVED. All files now consistently use `--inline`. The global flags table defines it as `boolean or number`, command signatures use `--inline[=<bytes>]`, and the RPC layer's `WorkflowOptions` uses `inlineContext?: boolean | number`. The parsing strategy is clear: `--inline` alone uses the default budget, `--inline=<bytes>` overrides it.

Round 1 IMPORTANT issues addressed:
- IMP-1 (sub-agent commands): Added as `start-*`/`submit-*` section in commands-api.md with clear separation from entity namespace commands.
- IMP-2 (`write-<field>`): Resolved — `submit-*` commands are the mechanism, documented explicitly ("This is the mechanism referenced in the overview as `write-<field>` commands").
- IMP-3 (context bundling boundary): Acknowledged in both _overview.md and rpc-layer-api.md as an internal module at `src/core/context/`.
- IMP-4 (`Phase` and `Target` types): Defined in rpc-layer-api.md with full type definitions.
- IMP-5 (Learning schema): Canonical `Learning` type defined in rpc-layer-api.md with transformation documentation.
- IMP-6 (CompleteInput alignment): `architectureDelta` now present in `CompleteInput`.
- IMP-7 (command-to-event mapping): Explicit mapping table added to commands-api.md.
- IMP-9 (guard return type): Fixed to `true | 'skip' | StateError`.
- IMP-10 (refinement tracking): Added to data-model.md with `refinement` field in slice.json.
- IMP-11 (architecture delta storage): `architecture-deltas.jsonl` added to data model.
- IMP-12 (goal storage): Decided — goals as string fields in entity JSON, documented in data-model.md.
- IMP-13 (atomicity): Write ordering documented in data-layer-api.md and flows.md. State cache written last.
- IMP-14 (stdin behavior): TTY detection, empty stdin, max size all documented in commands-api.md.
- IMP-15 (color behavior): Documented in conventions.md with `NO_COLOR`, TTY detection, `--json` interaction.
- IMP-16 (`--query` error behavior): Defined in commands-api.md with exit codes for each case.
- IMP-19 (`--verbose`): Added to global flags table.

## Issues

### IMPORTANT-1: `submit-*` commands accept stdin JSON but separation of concerns with entity commands is ambiguous for completion
**Severity:** IMPORTANT
**File:** `commands-api.md`

The architecture says: "`submit-*` commands do NOT trigger state transitions. The orchestrator calls the entity namespace command (e.g., `slice:plan`, `slice:complete`) to advance state after the sub-agent finishes."

This creates a two-step dance for every sub-agent action: (1) sub-agent calls `submit-plan`, (2) orchestrator calls `slice:plan` or some completion command. But `slice:plan` in the command-to-event table maps to `BEGIN_PLAN` — that's a state *start*, not a completion. What entity command does the orchestrator call *after* the sub-agent submits a plan? There's no `slice:plan-complete` or equivalent. The flow for "sub-agent wrote the plan, now advance state" is unclear.

Looking at the slice lifecycle: `slice:plan` triggers `BEGIN_PLAN`, and `slice:refine-plan` triggers `BEGIN_REFINEMENT`. The state machine events include `COMPLETE_PLAN` and `COMPLETE_REFINEMENT_ROUND`, but no commands map to these events. Either `submit-plan` should trigger `COMPLETE_PLAN` internally, or there need to be explicit commands for plan/refinement completion that the orchestrator calls.

### IMPORTANT-2: `context` command phase argument is positional, breaking the "no positional data" convention
**Severity:** IMPORTANT
**File:** `commands-api.md`

The global command shows: `goodplan context <phase> --slice <name>|--quest <name>|--epic <name> [--inline[=<bytes>]]`

The `<phase>` argument is positional data — it identifies which context bundle to assemble (plan, refinement, implementation, etc.). The brainstorm document and the entity-namespaced-commands decision both establish the convention that "unflagged positional arguments are always commands/subcommands, never data." Phase is data here, not a subcommand.

Should be: `goodplan context --phase plan --slice 01-auth` or route through entity namespaces like `start-plan` already does. The `start-*` commands are described as equivalent to `context` for sub-agents, so `context` may be redundant anyway.

### IMPORTANT-3: Windows target platform listed but no architectural acknowledgment of limitations
**Severity:** IMPORTANT
**File:** `_overview.md`

Round 1 flagged this (IMP-17, tagged RESEARCH_NEEDED). The architecture still lists `windows-x64` as a target platform in the deployment model without any caveat. Known concerns: Bun's Windows support has historically lagged behind macOS/Linux, `fs.rename` atomicity behaves differently on Windows (rename fails if target exists), `process.stdin.isTTY` behavior may differ, and path separator handling in the unified state object (keys use forward slashes like `slices/01-data-layer/slice.json`).

If Windows is a real target, add a "Known Platform Gaps" note. If it's aspirational, mark it as such. Shipping a binary that subtly fails on Windows is worse than not shipping one.

### MINOR-1: `schema` command accepts positional `[<command-path>]` — same positional data concern
**Severity:** MINOR
**File:** `commands-api.md`

`goodplan schema [--json] [--query <jq>] [<command-path>]` uses a positional argument for the command path. Consistent with the `context` issue above — if the convention is "no positional data," this should be `--command <path>` or similar.

### MINOR-2: `resource:` namespace has inconsistent entity targeting
**Severity:** MINOR
**File:** `commands-api.md`

Resource commands use: `resource:slice list [--epic <name>]` (optional filter) and `resource:slice show --slice <name>` (required target). But `resource:epic list` has no filter flags shown, and `resource:activity list [--scope <scope>]` uses `--scope` instead of entity-specific flags. The pattern is not fully regular. For LLM consumers, regularity reduces the need to consult `schema` for each command.

### MINOR-3: `--override` flag only appears in epic phase commands, not in the global flags table or as a pattern
**Severity:** MINOR
**File:** `commands-api.md`

`epic:refine-architecture --epic <name> [--override]` and `epic:refine-slices --epic <name> [--override]` and `slice:refine-plan --slice <name> [--override]` use `--override` to bypass score thresholds. This is a cross-cutting pattern for all refinement commands but isn't documented as such. It should be called out as a refinement convention — "all refinement `complete` operations support `--override` to bypass the circuit breaker" — so implementers apply it consistently.

### MINOR-4: No help text strategy documented
**Severity:** MINOR
**File:** `commands-api.md`

citty generates `--help` output automatically, but the architecture doesn't mention help text quality as a concern. For an LLM-first CLI, the `--help` output is a fallback discovery mechanism when `schema` feels heavyweight. Noting that citty's generated help should include the command description and all flags with types/defaults would be sufficient.

## Score: 8/10

Major improvement from round 1. The command surface is now internally consistent and well-documented. The entity-namespace pattern with explicit command-to-event mapping is clean. Sub-agent commands are properly specified. stdin behavior, color handling, `--query` errors, and `--verbose` are all addressed. The architecture reads as a coherent, implementable design.

The remaining gaps are narrower: the submit-to-completion state flow has an event mapping hole (IMPORTANT-1), the positional `<phase>` argument contradicts the stated convention (IMPORTANT-2), and Windows needs a reality check (IMPORTANT-3). None are architectural — they're specification completeness issues that are straightforward to fix.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
