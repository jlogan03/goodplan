# Software Architecture Review — Implement Pipeline Plan (Round 2)

## Issues

**[IMPORTANT]** `implementationPhase` data model change lacks specification for the state machine and CLI surface

Phase 2 introduces an `implementationPhase` field on the slice schema for re-entry tracking. The plan says "define `implementationPhase` field in the slice schema" and "Update `implementationPhase` via CLI to track progress" (Step 5, sub-step 6). However, the plan does not specify:

1. **Schema change**: What does the field look like? The current `sliceSchema` in `src/schemas/entities/slice.ts` has no such field. It needs to be added as an optional number (e.g., `implementationPhase: z.number().int().min(0).nullable()`) — but this is a data model change that affects INV-001 (all mutations through state machine) and INV-005 (schema validation on every read/write). The field must be added to the Zod schema, and existing slice.json files without it must remain valid (nullable/optional).

2. **State machine event**: There is no existing state event to update `implementationPhase`. The plan says "Update `implementationPhase` via CLI" but no such CLI command exists. This requires either: (a) a new state event (e.g., `UPDATE_IMPLEMENTATION_PHASE`) with a corresponding CLI command, or (b) piggyback on an existing event. Option (a) is the correct approach per INV-001. The plan must specify the new event, transition handler, and CLI command surface.

3. **Data Layer impact**: The schema registry at `src/core/data/schema-registry.ts` already handles `sliceSchema` via pattern matching. Adding an optional field to the schema is backward-compatible, but this should be explicitly stated.

Without this specification, the implementer will have to make ad-hoc architecture decisions about how to wire the state machine, which risks violating invariants.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 references `refinement-coordinator` for code review but does not specify how the coordinator adapts for `review_context: "code-implementation"`

The plan correctly identifies this as the first usage of `review_context: "code-implementation"` and adds a task to "Verify/adapt `refinement-coordinator` agent for `review_context: "code-implementation"`." However, the coordinator agent (`agents/refinement-coordinator.md`) currently selects reviewers based on artifact content. For code implementation review, the input is a list of changed file paths (from `git diff --name-only`), not a single document to read. This is a fundamentally different input shape.

The plan should specify:
- What the coordinator receives: the list of changed files (paths), the git diff stat, and the `review_context` string
- How the coordinator selects reviewers: by inspecting file extensions and paths (e.g., `.ts` files trigger TypeScript reviewer, `skills/` paths trigger agent-skill reviewer) rather than reading a single document
- Whether the coordinator needs a new section or branching logic for `code-implementation` vs other contexts

This is architecturally significant because the coordinator is a shared module used by all review loops. A change to support code review must not break plan/architecture review.

Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 5 complete-epic skill Step 4 gathers slice learnings via `ls` instead of CLI

Step 4 says "gathered via `ls` on `<epic>/slices/*/completion/learnings.md`". This is a filesystem operation that bypasses the CLI. While the orchestrator is allowed to pass file paths to sub-agents, using `ls` with a glob to discover files is fragile (depends on directory structure assumptions). The orchestrator should use `$GP slice:list --json` to get slice names, then construct paths deterministically from the known directory structure. This is more robust and consistent with the CLI-first approach.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 re-entry test fixture setup specifies setting `implementationPhase` "via CLI" but no such CLI command is defined

The test fixture setup step (e) says "set `implementationPhase` to 1 via CLI." As noted in the first issue, no CLI command currently supports this. The test harness script will need to use whatever command is introduced. The plan should reference the same CLI command specified in Phase 2 rather than assuming it exists.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 Step 7 calls `slice:complete` but the plan does not specify the required input payload

The transition table shows `COMPLETE_SLICE` requires `verificationPassed == true`, `deferredRouted`, `architecturePaths`, and `learningsRolledUp` in its input. The plan says "call `$GP slice:complete --slice <name> --json` with learnings payload from completion-slice return" but does not specify the full input shape. The existing `complete` skill (which this replaces) handles this via a multi-step flow (verify goal, deferred work, arch delta, learnings). The plan should specify what JSON payload the orchestrator pipes to `slice:complete`.

Resolution: CODEBASE_EXPLORATION

## Score: 8/10

The round 2 plan addresses all critical issues from round 1 well. State transitions are now explicit (C1 fixed), the phase split into 2/3/4 is sound (I2 fixed), RED/GREEN boundary is clear (C3 fixed), and re-entry uses CLI state tracking instead of git log (I7 fixed). The completion agents are correctly split into `completion-slice.md` and `completion-epic.md` (I1 fixed). The remaining issues are specification gaps rather than structural problems: the `implementationPhase` data model change needs full specification (new event, CLI command, schema change), and the coordinator's code-review input shape needs clarification. To reach 9+: specify the `implementationPhase` state machine event and CLI command, and clarify the coordinator input shape for code-implementation context.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
