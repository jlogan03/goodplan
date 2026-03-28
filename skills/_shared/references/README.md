# Shared References

Reference files consumed by multiple skills. Each skill reads these via relative paths (e.g., `../_shared/references/<file>` from a SKILL.md).

## Adding a New Shared Reference

Consolidation criterion: only move a file here if it is expected to stay unified long-term across all consuming skills. If skills are likely to diverge (e.g., reviewer prompts with different placeholder sets), keep separate copies.

## Files

| File | Purpose |
|---|---|
| `codebase-context-discovery.md` | Gather project-level context (docs, conventions, recent changes) before first review or implementation iteration |
| `decisions-format.md` | Shared format for recording durable project decisions |
| `dependency-research.md` | Research external dependencies referenced in a plan so reviewers and agents have current docs |
| `epic-conventions.md` | Epic directory structure, state machine, transitions, two-layer architecture model, consumer guide |
| `expertise-tracking.md` | Two-layer system for tracking user domain expertise and calibrating explanation depth |
| `iteration-loop.md` | Shared orchestration skeleton for iterative review-and-edit skills (refine-plan, refine-architecture, etc.) |
| `output-templates.md` | Rigid templates for structured user-facing output: iteration summaries, context load, completion, and done summaries |
| `maturity-conventions.md` | Conventions for maturity levels, invariants, and fitness functions in architecture files |
| `project-health-format.md` | Canonical structure for `.project/project-health.md`, a living document of system-level observations |
| `reviewers-cross-cutting.md` | Cross-cutting reviewer prompts spanning multiple domains, with fillable placeholders |
| `state-and-activity-formats.md` | Canonical formats for `state.md` and `activity-log.jsonl` entries |
| `team-defaults.md` | Default team preferences applied based on codebase context |

## Troubleshooting

If a skill fails with a Read error pointing to a `_shared/references/` path, this directory or its files may be missing. Re-create the directory and restore the files from the skill repository.
