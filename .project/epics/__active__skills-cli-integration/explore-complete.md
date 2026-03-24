# Explore Complete

## Scope
epics/skills-cli-integration

## What Was Explored
- Audited state access patterns across all 14 goodplan workflow skills (reads, writes, activity log, state.md, file-existence checks)
- Analyzed CLI command coverage against skill operations, identifying 3 gaps and 4 design decisions
- Brainstormed integration design: data ownership model (from conventions.md), CLI gap resolutions, skill interaction patterns, convention-doc-first approach

## Key Conclusions
- The CLI's data ownership model (conventions.md § Data Ownership) is the authoritative spec: JSON/JSONL through CLI, markdown written by LLM into CLI-created directories
- `state.md` is eliminated — CLI's `project.json` active entity fields replace it entirely
- Activity-log appending moves from skills to CLI (automatic on mutations)
- File-existence state machine in skills replaced by enriched `show --json` commands
- 3 CLI gaps need addressing: implement `activity:list`, enrich `show` commands with artifact data, enrich `status --json` with file path arrays
- RPC mutation responses already return `paths` (directories for LLM content) and `context` (bundled content) — skills should use these rather than querying separately
- Convention doc (`_shared/references/cli-interaction.md`) should be written first, validated on 2-3 core skills, then rolled out mechanically
- If the CLI can't handle a workflow encoded in a skill, the CLI changes — not the workflow

## Artifacts
- `research/skill-state-access-audit.md` — full audit of 14 skills' `.project/` interactions
- `research/cli-coverage-gap-analysis.md` — CLI command coverage matrix, gaps, recommendations
- `brainstorm/cli-integration-design.md` — design decisions, interaction patterns, convention approach
