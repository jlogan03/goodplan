# Shared References

Reference files consumed by multiple skills. Each skill reads these via relative paths (e.g., `../_shared/references/<file>` from a SKILL.md).

## Adding a New Shared Reference

Consolidation criterion: only move a file here if it is expected to stay unified long-term across all consuming skills. If skills are likely to diverge (e.g., reviewer prompts with different placeholder sets), keep separate copies.

## Files

| File | Purpose |
|---|---|
| `audit-conventions.md` | Conventions for audit agents: severity levels, finding format, scoring |
| `cli-interaction.md` | CLI detection, invocation patterns, error handling, state orientation |
| `codebase-context-discovery.md` | Gather project-level context (docs, conventions, recent changes) before first review or implementation iteration |
| `decisions-format.md` | Shared format for recording durable project decisions |
| `epic-conventions.md` | Epic directory structure, state machine, transitions, two-layer architecture model, consumer guide |
| `expertise-tracking.md` | Two-layer system for tracking user domain expertise and calibrating explanation depth |
| `iteration-loop.md` | Shared orchestration skeleton for iterative review-and-edit skills (plan-slice refinement, create-epic architecture/slice refinement, etc.) |
| `maturity-conventions.md` | Conventions for maturity levels, invariants, and fitness functions in architecture files |
| `output-templates.md` | Rigid templates for structured user-facing output: iteration summaries, context load, completion, and done summaries |
| `plan-format.md` | Canonical plan structure: phases, expected behavior, verification, tasks |
| `review-preamble.md` | Shared preamble for all 20 reviewer agents: diff access, codebase exploration, output format |
| `review-*.md` (20 files) | Per-domain review criteria for each reviewer agent |
| `state-and-activity-formats.md` | Canonical formats for `state.md` and `activity-log.jsonl` entries |
| `sub-agent-return-format.md` | Standard JSON return format for pipeline sub-agents |

## Troubleshooting

If a skill fails with a Read error pointing to a `_shared/references/` path, this directory or its files may be missing. Re-create the directory and restore the files from the skill repository.
