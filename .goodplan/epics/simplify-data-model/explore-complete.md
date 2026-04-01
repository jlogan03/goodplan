# Explore Complete

## Scope
epics/simplify-data-model

## What Was Explored

### Research (6 topics)
- **Skill usage patterns** — audited all 19 skills for overlap, identified merge candidates, proposed minimum viable set
- **Goal file usage** — traced how idea.md and goal.md are consumed across skills and CLI, assessed migration impact
- **Decision storage mechanics** — compared current global decisions with learnings rollup pattern, evaluated scoping approaches
- **Overview file consolidation** — mapped current overview.json structure, assessed assembleState/commitState impact, counted affected files
- **Orchestrator context patterns** — validated context budget for multi-phase pipeline skills, researched prior art on thin orchestrator patterns
- **Sub-agent tool access & scale** — confirmed 30-50 sub-agent spawns feasible, validated file handoff patterns, identified constraints

### Brainstorm (3 topics)
- **Skill consolidation model** — converged on 12 skills (down from 19), three pipeline skills using orchestrator pattern with sub-agent delegation
- **Re-entry UX** — continue/go-back/explore-anytime model; standalone /explore skill for ad-hoc investigation
- **Epic completion separation** — /implement completes slices, /complete-epic is a separate user-initiated skill

## Key Conclusions

1. **12 skills is the target**: create-epic (pipeline), start-epic, explore, plan-slice (pipeline), create-side-quest (pipeline), implement (pipeline), complete-epic, audit, capture, migrate, onboard, status

2. **Pipeline skills use orchestrator pattern**: main skill is a lightweight state machine that spawns sub-agents for each phase. Orchestrator never reads files — only passes paths. Sub-agents write results to disk for the next sub-agent to read.

3. **Re-entry is first-class**: invoking a pipeline skill on an in-progress entity shows completed phases and offers continue/go-back. Standalone /explore can add research to any active epic or quest at any time.

4. **Goals stay as markdown for now**: research showed most consumers need the full structured goal.md (50-200 lines), not just a one-liner. The JSON goal field already exists for summaries. Full migration deferred — the simplification win is smaller than expected.

5. **Decisions get lightweight provenance**: add optional entityPath field to existing root-scoped records rather than full entity-scoped storage with rollup. Decisions are architecturally project-wide.

6. **Overview consolidation is ~50 files but mechanically straightforward**: assembleState/commitState are schema-registry-driven. The existing epic-embedded-slices pattern sets precedent.

7. **Context budget is not a concern**: 6-phase orchestrator uses ~96K tokens (~10% of 1M window). Critical discipline: orchestrator never reads files.

## Open Questions

- Migration path for existing .goodplan/ state with 19-skill artifacts → 12-skill format
- Whether overview files should consolidate further (embed quests/tasks) or be eliminated entirely (compute on demand)

## Artifacts

- `research/skill-usage-patterns.md`
- `research/goal-file-usage.md`
- `research/decision-storage-mechanics.md`
- `research/overview-file-consolidation.md`
- `research/orchestrator-context-patterns.md`
- `research/sub-agent-tool-access.md`
