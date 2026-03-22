# Slice Sequencing

## Rationale

Feature-vertical cuts: each slice adds observable CLI commands, validated end-to-end. Slice 02 proves the hardest architectural question (does the recursive tree model work?) with the simplest feature (init refactored through full stack). Subsequent slices add entity lifecycles (epic, then slice, then quest/sub-agent) in order of complexity. Cross-cutting features (decisions, learnings, full status) land after the entity lifecycles they depend on. Skills migration is independent. Integration tests come last as a quality baseline.

The tracer bullet (slice 01) already proved: Bun compilation, citty routing, jqjs in binary, Zod schemas, basic init/status. Remaining slices build on that foundation.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | tracer-bullet | ~~archived~~ — Bun project, minimal schemas, citty, init + status, compiled binary | None | Proved tech stack end-to-end |
| 02 | project-init | Refactor init through full stack: recursive tree ProjectState types, assembleState (with zero state), commitState (recursive diff + materialization), loadState with cache, INIT_PROJECT state machine event. All core entity schemas. | 01 | Validates tree model + state machine + data layer working together. Simplest possible feature (init) through the hardest architectural path. |
| 03 | epic-lifecycle | Epic entity: create, list, show, activate, abandon. Epic status transitions (created through activated/abandoned). One-active-epic guard, verification criteria gate. Explore/architecture/slicing phase transitions. | 02 | First full entity lifecycle. Proves CRUD + guards + multi-status transitions through the stack. |
| 04 | slice-lifecycle | Slice entity: create, plan, refine-plan, implement, complete, list, show, abandon. Sequential enforcement, refinement circuit breaker, deferred work routing, learnings append at completion. | 03 | The core development workflow. Depends on epic (slices belong to epics). Most complex lifecycle. |
| 05 | sub-agent-commands | start-*/submit-* commands, context bundling with --inline budget, quest lifecycle (create through complete). | 04 | Sub-agent integration requires slice lifecycle to be in place. Quest mirrors slice but without sequential enforcement. |
| 06 | decisions-learnings | decision:create/update, learning:rollup, full status command (replaces tracer bullet stub), full --query (replaces minimal --query). Cross-cutting features that span entity types. | 04 | Depends on entity lifecycles being in place for learnings rollup and comprehensive status. |
| 07 | skills-migrate | Copy existing skills to skills/, build scripts/install-skills.sh, set up bun run install:skills. | None (soft dep on 06) | Independent of CLI code. Completing after 06 avoids rework from command surface changes. |
| 08 | integration-test | End-to-end integration tests (spawn binary, full workflows), fitness functions (state machine purity, data layer determinism, transition completeness), main runner tests. | 06 | Validates complete system. Fitness functions establish quality baseline. |
