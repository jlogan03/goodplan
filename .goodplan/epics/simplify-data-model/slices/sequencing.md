# Slice Sequencing

## Rationale
Test harness provides validation tooling for all subsequent work. Plan-slice is the simplest 2-phase pipeline and proves the orchestrator pattern (agent spawning, refinement loop, @ references) before committing to more complex pipelines. Data model changes are additive and independently verifiable mid-sequence. Create-epic is the most complex pipeline (6 phases) and produces remaining phase agents. Implement builds on all prior agent patterns. Remaining skills consolidate standalone skills and clean up. Quality validation runs the full system end-to-end with Opus before documentation captures the verified final state.

**Note:** Slices 04-06 all build skills that invoke CLI commands whose path expectations change in slice 03. They target the post-slice-03 CLI API surface.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | test-harness | LLM-simulated user responses, per-test model selection, phase verification, shared test utilities | None | Prerequisite tooling — enables rigorous validation of all subsequent skills |
| 02 | plan-slice-poc | Agent infrastructure (agents/ dir, build pipeline, shared references, reviewers) + plan-slice orchestrator | 01-test-harness | Core tracer bullet — validates the entire orchestrator pattern end-to-end with the simplest pipeline |
| 03 | data-model | Decision provenance (entityPath, reconsiderWhen), learning validity (validUntil), overview consolidation + upgrade migration | 01-test-harness | Additive schema changes, independently verifiable via CLI roundtrip tests |
| 04 | create-epic-pipeline | 6-phase create-epic orchestrator + explore-phase, architecture-phase, slices-phase agents | 02-plan-slice-poc, 03-data-model | Most complex pipeline — builds on proven orchestrator pattern; consumes `reconsiderWhen`/`validUntil` fields from slice 03 |
| 05 | implement-pipeline | implement orchestrator (implementation + slice completion) + complete-epic standalone skill | 02-plan-slice-poc, 04-create-epic-pipeline | Pattern validation — 04 proves multi-phase spawning works; introduces `review_context: "code-implementation"` |
| 06 | remaining-skills | create-side-quest pipeline, audit, init, task, upgrade, status + old skill deletion | 02-plan-slice-poc, 05-implement-pipeline | Consolidates remaining skills, deletes old ones — depends on all pipeline patterns being proven. Note: transitive dependency on slice 04's `explore-phase` agent (06→05→04) via `create-side-quest` spawning `explore-phase` |
| 07 | quality-validation | Full end-to-end workflow with Opus powering both test harness and skills/sub-agents | 01-06 (all prior) | Validates the complete consolidated system at production quality before documentation |
| 08 | documentation | Update README, CLAUDE.md, architecture docs, skill inventory to reflect the new 12-skill model | 07-quality-validation | Documents the verified final state — bugs found in slice 07 are fixed before docs are written |
