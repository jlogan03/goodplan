# Holistic Review — Slice 05 Implement Pipeline (Round 2)

## Issues

**[IMPORTANT]** Phase 2: `implementationPhase` data model change is underspecified for scope
The plan includes a single bullet: "Add data model task: define `implementationPhase` field in the slice schema to track current phase index for re-entry." However, adding a field to the slice schema is not a single task — it touches `src/schemas/entities/slice.ts` (Zod schema), potentially the state machine transitions (a new event type to update the field, or piggybacking on an existing event), `assembleState`/`commitState` in the data layer, and the `slice:show` command output. Per INV-001 (every state mutation goes through the state machine) and INV-005 (schema validation on every read and write), this field cannot simply be tacked onto the JSON — it must be added to the Zod schema and have a defined update path through the state machine. The plan should either: (a) expand Phase 2 with explicit sub-tasks for the schema change, state event, and CLI surface, or (b) split this into its own phase (Phase 1.5) before the orchestrator skeleton that depends on it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3: Review loop reference to `iteration-loop.md` is correct but Loop Parameters are not defined
Phase 3 says "Follow the same mechanical review loop pattern as plan-slice — reference `skills/_shared/references/iteration-loop.md` for the loop structure." The `iteration-loop.md` file exists and requires a `Loop Parameters` section in the consuming skill's SKILL.md (reviewer list, exit criteria, early exit, max iterations, editor prompt path, score thresholds, scope constraints, working directory, run directory, backup directory, review_context). The plan does not include a task to define this Loop Parameters section. Without it, the implementer won't know what values to fill in for the implement skill's specific review loop configuration.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3: The plan says to "Verify/adapt `refinement-coordinator` agent for `review_context: "code-implementation"`" but doesn't specify what adaptation is needed
The existing `refinement-coordinator` agent reads an artifact and selects reviewers. For code-implementation context, the "artifact" is a set of changed files (from `git diff --name-only`), not a single document. The plan should specify: (a) whether the coordinator receives the list of changed file paths or the diff content, (b) how the coordinator maps changed files to domain reviewers (e.g., `.ts` files -> typescript reviewer, `SKILL.md` -> agent-skill reviewer), and (c) whether `reviewer-registry.md` needs entries for code-implementation context. Round 1 raised a similar issue and the fix added a verification step, but the actual adaptation logic is still missing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Step 3: Plan loading via sub-agent may violate context discipline
Step 3 says "Orchestrator spawns a sub-agent to parse the plan and return the phase list (phase names, file paths)." This is a good pattern for keeping plan content out of the orchestrator. However, the plan doesn't specify which agent to spawn — there's no `plan-parser` agent in the existing 14 agents, and the plan doesn't include a task to create one. Is this a new agent (needs to be created in Phase 1) or should the orchestrator parse the plan file itself (which would be acceptable since it's reading structure, not content)?
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 Step 7: `slice:complete` requires `verificationPassed` per transition table
The transition table shows: `implementation-complete | COMPLETE_SLICE | completed | verificationPassed == true`. The plan says "call `$GP slice:complete --slice <name> --json` with learnings payload from completion-slice return" but doesn't mention the `verificationPassed` parameter. Without it, the guard will fail per the transition tables. The plan should specify where the verification result comes from — presumably from the completion-slice agent evaluating the overall implementation quality.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 Step 2: Guardrail check uses `slice:list` but should use `epic:show` or check slice statuses
Step 2 says "Verify all slices are completed/abandoned via `$GP slice:list --json`." The `slice:list` command lists slices — but verifying "all slices are completed/abandoned" requires checking each slice's status. The plan should specify: filter the JSON output for non-terminal statuses. Also, per the transition table, `COMPLETE_EPIC` requires `all verificationResults have passed: true` — the plan's Step 7 calls `$GP epic:complete --epic <name> --json` but doesn't mention verification results. The complete-epic skill should gather verification results before calling the CLI command.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6: `verifyOrchestratorDiscipline()` is referenced but doesn't exist yet
The test harness task says "Run `verifyOrchestratorDiscipline()` on the transcript" but this function does not exist in the codebase — it appears only in plan files and research docs. The plan should either include a task to implement this function (likely in `tools/dogfood/test-utils.ts`) or reference the existing pattern it follows. The plan-slice and create-epic test harnesses also reference it, so this may already be planned elsewhere — if so, note the dependency.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 7: "documentation updates... are out of scope" but no capture mechanism
Phase 7 correctly notes documentation updates are out of scope. However, the plan says "capture as a follow-up task if needed" without specifying the mechanism. Per the established workflow, this should be `$GP task:create` (or `/gp:capture`) with a concrete description. Worth specifying the exact task text to avoid it being forgotten.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 shows significant improvement over Round 1. The major structural issues (split completion agents, iteration loop reference, state transitions, $GP variable, trigger phrases) have all been addressed well. The plan is clear, well-phased, and follows established patterns. The remaining issues are: (1) the `implementationPhase` data model change is underscoped — it touches 4+ files across 3 layers per the invariants, (2) the review loop's Loop Parameters section is referenced but not defined, and (3) the coordinator adaptation for code-implementation context still lacks specifics. Addressing these three IMPORTANT items and the MINOR gaps would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
