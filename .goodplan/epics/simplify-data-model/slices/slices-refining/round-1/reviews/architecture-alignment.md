# Architecture Alignment Review

## Issues

**[IMPORTANT]** `goal-refining.md [03-data-model]`: Slice touches 4 subsystems (Data Layer, State Machine, Commands, RPC Layer) without acknowledging that scope breadth

The data model slice modifies schemas (Data Layer), transition handlers that read/write overview paths (State Machine transitions in `src/core/state/transitions/`), commands (`quest:list`, `task:list`, `quest:create`, `task:create`, `decision:create`, `decision:show`), and the RPC layer (`assembleState`/`commitState`). The architecture's overview consolidation alone touches `src/core/state/transitions/task-create.ts`, `task-lifecycle.ts`, `quest-create.ts`, `helpers.ts`, `init.ts`, `epic-create.ts`, `slice-create.ts`, `slice-plan.ts` plus 4+ command files, `context/priorities.ts`, and `rpc/migrate.ts`. This is a wide-reaching change across subsystem boundaries. The slice goal should explicitly call out the subsystem surface area so the implementer understands the cross-cutting nature of the work. The "~30 files affected" note in the architecture doc captures this but the slice goal itself only says "~10-15 test files" — the source file count is underrepresented.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [03-data-model]`: Missing Maturity Note for State Machine and Commands subsystems

The maturity table shows State Machine as "Developing (modified)" and Commands as "Developing (modified)". Slice 03 modifies both: it changes the decision schema (State Machine territory) and adds new fields to `decision:create` (Commands). Per the evaluation criteria, slices touching subsystems at modified maturity levels should include a Maturity Note section naming the affected subsystems and levels so that `/create-plan` can incorporate fitness function and migration awareness.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [05-implement-pipeline]`: Missing Maturity Note for State Machine subsystem

The implement pipeline creates `completion-phase` agent that evaluates `reconsiderWhen` and `validUntil` conditions, which are data model concepts from slice 03. The slice also adds code review loops with `review_context: "code-implementation"` and interacts with slice status transitions (`implementing` -> `implementation-complete` -> `completed`). These status transitions are State Machine territory at "Developing (modified)" maturity. No Maturity Note is present.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [04-create-epic-pipeline]`: Missing Maturity Note for State Machine subsystem

Create-epic drives the epic through 6 status transitions (`created` -> `exploring` -> `explored` -> `defining-architecture` -> `architecture-defined` -> `defining-slices` -> `slices-defined`). These are State Machine transitions at "Developing (modified)" maturity. The slice also has phase agents evaluating `reconsiderWhen` and `validUntil` conditions. No Maturity Note is present.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [06-remaining-skills]`: Missing Maturity Note for Commands subsystem

This slice renames multiple commands (`capture` -> `task`, `migrate` -> `upgrade`, `project-status` -> `status`) and deletes 15 skill directories. The Commands subsystem is at "Developing (modified)" maturity. The rename operations affect the CLI surface that skills depend on. No Maturity Note is present.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [02-plan-slice-poc]`: Slice scope includes both agent infrastructure AND the plan-slice orchestrator

Slice 02 builds the `agents/` directory structure, build pipeline changes (`build-plugin.sh`, `plugin.json`), shared reference files, AND the plan-slice orchestrator with its refinement loop. These are two logical concerns: (1) agent infrastructure that all subsequent slices depend on, and (2) the plan-slice skill itself. The architecture does justify this coupling (tracer bullet pattern — build and validate together), and the slice goal makes the rationale clear. This is acceptable but worth noting: if the slice becomes too large during implementation, the agent infrastructure could be split out.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [03-data-model]`: Three independent changes bundled in one slice

Decision provenance (`entityPath` + `reconsiderWhen`), learning validity (`validUntil`), and overview consolidation are three independent data model changes. They don't depend on each other — `entityPath` could ship without overview consolidation and vice versa. The architecture doc acknowledges they're "additive" and "independently verifiable." Bundling them is pragmatic (they're all small schema changes), but if the overview consolidation proves more complex than expected (16+ source files touched), it could delay the decision provenance work that slice 04 depends on (phase agents evaluate `reconsiderWhen`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `sequencing-refining.md`: Dependency from slice 05 to slice 04 may be overstated

The sequencing table lists slice 05 (implement-pipeline) as depending on both 02 (plan-slice-poc) and 04 (create-epic-pipeline). The stated rationale is "Shares completion-phase agent with complete-epic, builds on phase agent patterns." However, the completion-phase agent is defined in slice 05 itself, and the implement pipeline's core mechanism (spawning implement-phase per plan phase with review loops) was proven in slice 02. The dependency on slice 04 appears to be based on wanting the full agent roster, but implement could be built with just the agents from slice 02. This is a soft dependency at most.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [02-plan-slice-poc]`: `build-plugin.sh` and `plugin.json` referenced but don't exist yet

The slice goal references updating `build-plugin.sh` and `plugin.json` to support the `agents/` directory, but neither file currently exists in the repo. The architecture overview mentions them, and the `plugin-distribution` epic may be intended to create them. The slice goal should clarify whether these files need to be created from scratch or if they're expected to exist by the time this slice is implemented.

Resolution: CODEBASE_EXPLORATION

## Score: 7/10

The slices map well to the architecture's subsystem boundaries overall. The sequencing follows the architecture's recommended order (test harness -> pattern validation -> expansion). The dependency graph is consistent with the architecture's data flow. However, 5 slices are missing required Maturity Notes for subsystems at "Developing (modified)" maturity, and slice 03's cross-subsystem scope is underrepresented in its goal description. To reach 9+: add Maturity Notes to slices 03-06, expand slice 03's scope description to acknowledge the full subsystem surface (~20 source files, not just ~10-15 test files), and clarify the `build-plugin.sh`/`plugin.json` status in slice 02.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
