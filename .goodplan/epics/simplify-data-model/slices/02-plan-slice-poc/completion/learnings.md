# Learnings: 02-plan-slice-poc

## Agent SDK Skill tool doesn't discover new plugin skills dynamically
_Source: 02-plan-slice-poc_

The Agent SDK `query()` Skill tool only discovers skills that were in the installed plugin cache at session start. Copying a new skill directory to the cache before `query()` doesn't help — skill discovery happens at process initialization. For test harness scripts, inject SKILL.md content into the system prompt instead of using the Skill tool. The `/` prefix prompt syntax triggers a synchronous Skill tool lookup that fails before the LLM processes the message.

## Plugin skills appear with plugin name prefix, not SKILL.md name prefix
_Source: 02-plan-slice-poc_

Build-plugin.sh adds `gp:` prefix to skill names in dist SKILL.md files (e.g., `name: gp:plan-slice`). But Claude Code uses the plugin manifest name (`goodplan`) as the namespace: skills appear as `goodplan:plan-slice`, not `gp:plan-slice`. The `gp:` prefix in the name field is replaced by the plugin namespace, not prepended. Test prompts must use `goodplan:` prefix or natural language invocation.

## Reviewer agents must be read-only — orchestrator writes their output
_Source: 02-plan-slice-poc_

Initial implementation gave reviewer agents Write access and instructed them to write review files. This contradicts the architecture's context discipline — reviewer agents should return their review content inline as JSON, and the orchestrator writes it to temp files. The mismatch was caught by all 4 code reviewers in Phase 1. Agent definitions must align with the tool restrictions specified in the orchestrator's spawn instructions.

## CLI status transitions require explicit intermediate commands
_Source: 02-plan-slice-poc_

The transition path `created → planning → plan-created → refining → plan-refined` requires 4 separate CLI commands: `slice:plan`, `submit-plan`, `slice:refine-plan`, and `submit-refinement`. You can't skip `slice:refine-plan` — calling `submit-refinement` directly from `plan-created` works for the pass case (scores meet threshold on first round) but fails on the non-pass case with `STATE_INVALID_TRANSITION`. Always include the intermediate `BEGIN_REFINEMENT` step.

## createMinimalFixture must activate the epic for slice operations
_Source: 02-plan-slice-poc_

`gp slice:show --slice <name>` requires an active epic — it won't resolve the slice without one. The epic must be fast-tracked through the full lifecycle (explore → architecture → slices → refine → activate) before any slice CLI commands work. This takes ~8 CLI calls with minimal artifacts (explore-complete.md, _overview.md, verification criterion).

## Haiku-tier testing validates pipeline mechanics but not context discipline
_Source: 02-plan-slice-poc_

The end-to-end test at haiku tier ($0.60) successfully proved all pipeline mechanics: Q&A phase, agent spawning, parallel reviewers, synthesis, CLI transitions, and temp dir cleanup. However, haiku doesn't reliably follow the "never read artifact files directly" instruction — it made 10 orchestrator-level Read calls on `.goodplan/` files. Context discipline testing requires opus tier. Use haiku for structural/pipeline tests and opus for quality/discipline tests.

## `reconsiderWhen` and `validUntil` are forward-looking references
_Source: 02-plan-slice-poc_

The plan-slice orchestrator references `reconsiderWhen` (decisions) and `validUntil` (learnings) fields that don't exist in the current CLI data model (slice 03 adds them). Skills that reference future schema fields must gate access behind field-presence checks and skip gracefully when fields are absent. This pattern will recur as the epic's slices target a future data model.

## Sub-agent return format needs a shared reference file
_Source: 02-plan-slice-poc_

Each agent definition inlines its own return format specification. The plan called for a shared `sub-agent-return-format.md` reference and a TypeScript Zod schema — both were created as follow-up but should have been in the initial implementation. When multiple agents share a data contract, extract it to a shared reference from the start to prevent drift.
