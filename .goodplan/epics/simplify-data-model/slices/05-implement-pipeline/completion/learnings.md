# Learnings: 05-implement-pipeline

## Completion-phase split into slice + epic agents was the right call
_Source: 05-implement-pipeline_

Refinement round 1 flagged the originally-planned dual-mode `completion-phase.md` as IMPORTANT (I1) and recommended splitting into `completion-slice.md` and `completion-epic.md`. The split held up through implementation with zero issues — the agents have completely different inputs (slice artifacts vs cross-slice synthesis), different outputs (local recommendations vs architecture reconciliation), and no shared callers. Future plans should default to separate agents when I/O shapes differ, even if the "logical phase" is the same. The `<phase>-<variant>.md` naming convention was added to architecture conventions as a result.

## CLI-based re-entry via implementationPhase field is cleaner than git-log parsing
_Source: 05-implement-pipeline_

The original plan used `git log --oneline | grep "[slug] Phase N:"` for re-entry detection. Refinement round 1 (I7) escalated this to USER_INPUT, and the decision was to add an `implementationPhase` field to the slice entity tracked via CLI state. This required a full data model change (schema, state event, transition handler, CLI command flag, transition table row) but produced a robust re-entry mechanism consistent with all other re-entry patterns in the system. Future slices that need in-progress tracking should always extend the data model rather than parsing git history.

## Data model changes require explicit enumeration of all affected layers
_Source: 05-implement-pipeline_

The `implementationPhase` field touched 7 files across 4 layers: schema (`slice.ts`), state events (`state-events.ts`), transition handler (`slice-implement.ts`), reducer (`reduce.ts`), RPC function (`update-implementation-phase.ts`), CLI command (`submit-implementation.ts`), and command schema (`submit.ts`). Refinement rounds 3 and 4 caught missing pieces (MINOR-1: `submitImplementationInputSchema` not updated, MINOR-2: `StateEvent` union not extended). Plans for data model changes must enumerate every layer explicitly with file paths — "add a field" is insufficient specification.

## Refinement caught the critical architecture gaps that would have blocked implementation
_Source: 05-implement-pipeline_

Four rounds of refinement were required. Round 1 found 3 CRITICAL issues (missing state transitions, inline review loop violating orchestrator pattern, ambiguous RED/GREEN boundary) and 8 IMPORTANT issues. Without refinement: (1) the skill would have failed on `slice:complete` due to missing intermediate state transitions, (2) the SKILL.md would have exceeded 500 lines by inlining the review loop, (3) the implement-phase agent boundary would have been unclear. The most impactful refinement finding was C1 (missing `slice:implement` and `submit-implementation` transitions) — this would have been a runtime failure.

## Phase 2 was correctly split from 1 mega-phase into 3 sub-phases
_Source: 05-implement-pipeline_

Refinement round 1 (I2) flagged Phase 2 as too large — it combined orchestrator skeleton, review loop, and completion into one phase. Splitting into Phases 2 (skeleton), 3 (review loop), and 4 (completion) made each phase independently verifiable and kept the resulting commits focused. The skeleton-first approach was especially valuable: Phase 2 proved the re-entry mechanism and single-pass loop worked before Phase 3 added review complexity. Future plans for complex orchestrators should follow this pattern: skeleton with single-pass first, then layer on review loops, then completion.

## Test harness fixture creation requires exact CLI command knowledge
_Source: 05-implement-pipeline_

Phase 7 required two commits because the test fixtures used incorrect CLI commands (`submit-refine-plan` instead of `submit-refinement`, invalid `--epic` flags, missing `plan.md` alongside `plan-refined.md` for lifecycle advancement, wrong learnings payload format). The fixture setup depends on the exact CLI API surface, which the test author must know precisely. Future test harness work should include a "fixture CLI cheat sheet" in the test file comments listing every command with its exact flags, or use a shared fixture-builder utility that encapsulates CLI knowledge.

## Orchestrator discipline violations are model-dependent
_Source: 05-implement-pipeline_

Phase 7 commit message notes "orchestrator discipline violations (haiku model reads artifacts directly) deferred to quality validation slice." The `verifyNoArtifactReads()` fitness function detected that the haiku model used for structural testing does not reliably follow the "orchestrator must not Read artifact files" rule. This is expected — haiku optimizes for speed over instruction adherence. Orchestrator discipline should be validated only with opus-tier models. The structural test tier validates pipeline mechanics (state transitions, agent spawning, commit format); the quality tier validates behavioral invariants (context discipline, review quality).

## The implement orchestrator is the most complex skill and benefits from shared reference injection
_Source: 05-implement-pipeline_

The implement SKILL.md manages: scope resolution, state transitions, plan loading, per-phase implementation loops, review loops (coordinator + reviewers + synthesis + feedback), iteration safeguards (max 12, early exit at 5+, stall detection), RED/GREEN check delegation, git commits per phase, completion-slice agent spawning, and two sequential state transitions to reach `completed`. Delegating the review loop to `iteration-loop.md` via reference injection was critical — without it, the SKILL.md would have blown past the 500-line target. Future pipeline skills should aggressively extract reusable patterns into shared references.

## Architecture divergence: complete-epic classified as standalone, not pipeline
_Source: 05-implement-pipeline_

The epic architecture (`skill-model-api.md`) correctly classifies `complete-epic` as a standalone skill despite spawning the `completion-epic` agent, because it has no interactive phases and no multi-phase status orchestration. This classification held — the skill runs a single logical step (spawn agent, surface recommendations, CLI submit). The pipeline vs standalone distinction is about multi-phase status tracking, not about whether sub-agents are involved.

## Forward-compat gates for CLI fields prevent brittle skill breakage
_Source: 05-implement-pipeline_

The `complete-epic` skill includes a forward-compat gate for `reconsiderWhen`/`validUntil` fields on decisions and learnings: run `--json`, inspect the output schema, skip condition evaluation if fields are absent. This pattern (established by `plan-slice`) prevents the skill from failing when the CLI hasn't been upgraded yet. Every skill that reads optional CLI fields should include this gate.
