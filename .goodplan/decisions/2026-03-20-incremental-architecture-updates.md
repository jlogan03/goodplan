# Decision: Project-Level Architecture Updated on Every Slice/Quest Completion

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — two-layer architecture model

## Decision

Project-level architecture (`.project/architecture/`) is updated incrementally on every slice and quest completion to reflect the current reality of the system. Updates are not deferred to epic completion. The LLM identifies architectural changes during the completion flow, and the project-level architecture is updated immediately.

## Rationale

Side quests can run while an epic is executing. A side quest needs accurate current architecture for planning — both the project-level (current reality) and the epic-level (target state). If project-level architecture only updates at epic completion, a side quest mid-epic would plan against stale architecture.

Additionally, slice planning benefits from knowing both current architecture (where we are) and epic target architecture (where we're going) so the plan fits both.

Alternatives considered:
- **Update only at epic completion** — original workflow design. Creates staleness during long epics with many slices or side quests.
- **Side quests read both project-level and epic-level architecture without updating** — addresses the read problem but not the staleness problem. Later slices within the same epic would also see stale project-level architecture.

## Consequences

- Project-level architecture is always an accurate representation of the system's current state
- The completion flow adds a step: "identify architecture delta, update project-level architecture"
- This step happens after verification passes but before the slice/quest is fully marked complete
- Epic completion still reconciles the two layers, but the gap between them is smaller since project-level has been incrementally updated
