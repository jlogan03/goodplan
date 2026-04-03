# Architecture Updates: 04-create-epic-pipeline

## Alignment with Epic Target Architecture

This slice created agents and a pipeline skill (Skills subsystem, Experimental maturity). The implementation aligns with the epic target architecture:

### Confirmed patterns (no changes needed)

- **Orchestrator pattern**: The 6-phase create-epic orchestrator follows the pattern specified in `_overview.md` -- interactive phases run in orchestrator context (AskUserQuestion), autonomous phases delegate to named agents. Context discipline (no Read on full artifacts) is enforced.
- **Agent composition via `@` references**: All 13 agents use `@${CLAUDE_PLUGIN_ROOT}/...` for shared content injection, confirming the `skills:` frontmatter workaround documented in `_overview.md` (issue #25834).
- **Reviewer extraction**: 3 new domain reviewers (typescript, tui-cli, repo-tooling) follow the pattern from `skill-model-api.md` -- each composes `review-preamble.md` + domain-specific reference. The monolithic `reviewers-cross-cutting.md` remains untouched; new standalone reference files are canonical for agent-based pipelines.
- **Phase-status mapping**: The 12-status epic lifecycle (created through slices-refined, including refinement statuses) matches `conventions.md` transition tables. Conventions.md was updated to include refinement statuses in the phase detection table.
- **Explore-phase PARTIAL protocol**: User-controlled exit via PARTIAL returns with `summary` + `continuationFile` (not `questions`) matches the epic architecture's description of explore-phase behavior.

### Minor deviations (acceptable, no architecture update needed)

- **Sequential research in explore-phase**: The agent runs research sequentially (no sub-agent spawning), whereas `_overview.md` describes explore as potentially parallel. This is documented as a known trade-off with a future improvement path (orchestrator-managed parallelism). The architecture already notes explore-phase is "spawned by create-epic" without specifying internal parallelism requirements.
- **Architecture path derivation**: The orchestrator derives the architecture output directory from epic name convention rather than a CLI response `paths` field. The `start-architecture` ContextBundle has no `paths` field. This works but is convention-coupled. Not an architecture issue -- it's a CLI API gap that could be addressed later.

### No top-level architecture changes

This slice operates entirely within the Skills subsystem at Experimental maturity. No changes to:
- Four-layer CLI stack (Commands, RPC, State Machine, Data Layer)
- Data model entities or JSONL formats
- Invariants (INV-001 through INV-007)
- Test harness API (existing `test-harness-api.md` patterns are followed, not extended)
- State machine transition tables (all status transitions used were already defined)

The only file outside the skills/agents directories that was modified is `conventions.md` (phase detection table update with refinement statuses) -- this is a documentation completion, not an architectural change.
