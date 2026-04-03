# Software Architecture Review — Implement Pipeline Plan

## Issues

**[CRITICAL]** Plan conflates two distinct CLI state transitions in the implement orchestrator flow

The plan's Phase 2 Step 6 says "spawn `completion-phase` agent with `mode: slice`" and Step 7 says "`$GP slice:complete --slice <name> --json`". However, the transition tables show two distinct transitions between implementing and completed:

1. `implementing` -> `implementation-complete` via `submit-implementation` (COMPLETE_IMPLEMENTATION event)
2. `implementation-complete` -> `completed` via `slice:complete` (COMPLETE_SLICE event)

The plan never calls `submit-implementation` (or its alias). The orchestrator must call `submit-implementation` after all plan phases are done (to move from `implementing` to `implementation-complete`), and then `slice:complete` (to move from `implementation-complete` to `completed`). The existing `implement-plan` skill does call `submit-implementation` in its Step 4.2. The new skill must preserve this two-step transition.

Without this fix, `slice:complete` will fail with `STATE_INVALID_TRANSITION` because the slice is still in `implementing` status.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Plan omits `slice:implement` CLI call to begin implementation

The transition tables show that a slice must transition from `plan-refined` to `implementing` via `slice:implement` (BEGIN_IMPLEMENTATION event). The plan's Step 2 mentions: "If status is `plan-refined`, start fresh via `$GP slice:implement --slice <name>`". However, this is only in the re-entry detection path. The normal flow (Step 5 implementation loop) assumes the slice is already in `implementing` status without showing where the transition happens. The orchestrator must call `$GP slice:implement --slice <name>` before entering the implementation loop when the slice is in `plan-refined` status.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `completion-phase` agent dual-mode design creates a shallow module with unclear boundaries

The plan proposes a single `completion-phase.md` agent with two explicit mode sections (`## Slice Mode` and `## Epic Mode`). The agent definition conventions say agents should stay under ~500 lines. The two modes have fundamentally different inputs, outputs, and responsibilities:

- Slice mode: reads one slice's artifacts, produces learnings + architecture delta for that slice
- Epic mode: reads all slices' learnings, produces consolidated cross-slice learnings + architecture reconciliation + artifact promotion list

These are different workflows sharing a file. The mode dispatch (`{ mode: "slice" | "epic" }`) is a code smell that suggests two agents would be more appropriate. Consider:
- The implement orchestrator only uses slice mode
- The complete-epic skill only uses epic mode
- No caller uses both modes in the same session
- The orchestrator pattern (from architecture conventions) says sub-agents cannot spawn sub-agents, so there's no "reuse from within an agent" benefit

Splitting into `completion-slice.md` and `completion-epic.md` would produce deeper modules with clearer boundaries and smaller context footprint per agent spawn.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Implement orchestrator reads plan content in Step 3 (violates context discipline)

Step 3 says "Orchestrator spawns a sub-agent to parse the plan and return the phase list (phase names, file paths)." This is good. However, Step 5 sub-step 1 passes "phase content path" to the implement-phase agent, and the orchestrator itself needs to "Parse Expected Behavior" sections (from the existing `implement-plan` Step 3.0). The plan doesn't clarify who runs the RED/GREEN checks.

The plan says "Agent runs red-green checks" as a key design decision, but the orchestrator's Step 5 describes the full review loop (sub-steps 3-7) including parsing `redGreenResults` from the agent return. This is consistent. However, Steps 5.8 mentions "run GREEN checks via one more implement-phase spawn if needed" — this implies the orchestrator decides when GREEN checks need re-running, which would require reading the Expected Behavior section.

The plan should clarify: the implement-phase agent handles all RED/GREEN logic autonomously. The orchestrator only sees pass/fail status in the agent's return. Remove any implication that the orchestrator reads or interprets Expected Behavior content.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 is too large — combines orchestrator logic, reference porting, and reviewer infrastructure into a single phase

Phase 2 builds the entire implement orchestrator in one phase. This is the most complex orchestrator in the system (more complex than `create-epic`'s 6-phase pipeline, because implementation involves: per-phase loops, review cycles within each phase, RED/GREEN checks, stall detection, iteration caps, research handling, and completion). The existing `implement-plan` is ~260 lines, and the new version must also absorb slice completion.

This phase should be split to reduce review cycle risk:
- Phase 2a: Core orchestrator skeleton (scope resolution, re-entry, plan loading, implementation loop with single-iteration pass-through, git commit)
- Phase 2b: Review loop integration (spawn refinement-coordinator, reviewers, synthesis, feedback loop, iteration safeguards)
- Phase 2c: Slice completion integration (completion-phase spawn, recommendations surfacing, CLI submit)

Each sub-phase is independently verifiable, and the review loop for each is focused.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Re-entry via git log is fragile and diverges from established CLI-based re-entry pattern

The plan says "Re-entry via git log: Orchestrator checks git log for `[slug] Phase N:` commits to find the last completed phase." The architecture conventions explicitly state: "Phase detection uses the CLI exclusively — no filesystem artifact checks." While git log is not strictly a filesystem artifact check, it violates the spirit of CLI-based re-entry by introducing a dependency on commit message format.

If someone amends a commit message, or the commit format changes, re-entry breaks silently. The established pattern in `plan-slice` and `create-epic` is to query CLI status and map to pipeline phase.

For implementation, the CLI's `slice:show` returns the current status (`implementing`), but doesn't track which plan phase is in progress. Two alternatives:
1. Store the current phase index in the CLI state (requires a data model change — `implementationPhase` field on slice)
2. Accept that re-entry restarts from phase 1 and relies on the RED/GREEN cycle to skip already-implemented phases (UNEXPECTED-PASS detection)

Option 2 is simpler and aligns with the existing implement-plan's resume detection approach. Option 1 is more robust but requires coordination with CLI changes.

Resolution: USER_INPUT

**[MINOR]** Test harness Phase 4 re-entry test fixture setup is underspecified

The test for re-entry says "Create a fixture with phase 1 commits already present." This needs to specify how those commits are created — the harness must either run the skill once and stop after phase 1, or manually create commits with the expected format. The latter is more reliable for testing but couples to the commit message format.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan doesn't specify how the implement orchestrator loads maturity context

Step 4 says "Load maturity context via `$GP` CLI" but doesn't specify which command. The existing `implement-plan` reads `.goodplan/architecture/_overview.md` directly (which violates context discipline). The orchestrator should either use a sub-agent to extract maturity data, or use a CLI command. Currently no CLI command returns maturity data directly — `gp status --json` doesn't include it.

Resolution: CODEBASE_EXPLORATION

**[MINOR]** Missing `user-invocable: true` in Phase 2 frontmatter

The plan specifies frontmatter for the implement skill as `name: implement`, `description`, `requires: gp >= 1.0.0` but omits `user-invocable: true`. Both existing pipeline skills (`plan-slice`, `create-epic`) include this field. Same issue in Phase 3 for `complete-epic`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 integration test lacks specificity on what "fix any issues found" means

Phase 5 tasks include "Run `bun tools/dogfood/test-implement.ts` — fix any issues found" but doesn't specify iteration bounds or exit criteria. The existing plan pattern (from plan-slice, create-epic slices) uses "iterate until all checks pass" which is more actionable.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan captures the right high-level structure and follows established orchestrator patterns. However, two critical issues (missing state transitions) would cause runtime failures, and the phase granularity issue (Phase 2 combining too much) creates high review-loop risk. The dual-mode agent and re-entry approach also need resolution. To reach 9+: fix both critical state transition gaps, split Phase 2, clarify context discipline for RED/GREEN checks, and resolve the re-entry strategy.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
