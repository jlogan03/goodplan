# Holistic Review — Slice 05 Implement Pipeline (Round 3)

## Issues

**[IMPORTANT]** Phase 2: `implementationPhase` data model change — new CLI command name needs specification
Round 2 expanded the data model task into 4 sub-tasks (schema, state machine event, CLI command, CLI surface), which is a significant improvement. However, sub-task 3 says "Add a new command or flag (e.g., `slice:update --implementation-phase N`)" — this is still hedging with "e.g." and "or." The test harness in Phase 6 depends on this exact command to set up re-entry fixtures (step c: "set `implementationPhase` to 1 via the CLI command added in Phase 2"). The implementer needs a concrete decision: is it `slice:update --implementation-phase N` or something else? The `slice:update` command does not exist in the current codebase (no match in `src/commands/`). The plan should commit to a specific command name and document whether it's a new top-level command (`slice:update`) or a new flag on an existing command. This matters because adding a new command requires a new file in `src/commands/slice/`, registration in `src/commands/main.ts`, and schema entries — all of which should be explicit sub-tasks.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: `skill-model-api.md` update task references `completion-phase.md` but the table has only one entry to split
The task says "replace the single `completion-phase.md` entry with `completion-slice.md` and `completion-epic.md`." This is correct — `skill-model-api.md` line 119 has the single entry. However, the task also says to update `conventions.md` `reconsiderWhen` ownership list "similarly." The plan should confirm the exact location in conventions.md to update — if the section doesn't mention `completion-phase` by name, the implementer will waste time searching.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: Completion-slice agent spawning lacks input specificity
Step 6 says "spawn `completion-slice` agent with slice path, plan path, changed files from all phases." But "changed files from all phases" needs accumulation — the orchestrator commits per-phase in Step 5, so it needs to aggregate `filesChanged` across all phase iterations. The plan doesn't mention how this aggregation happens (e.g., accumulating into a list variable, or running `git diff --name-only` against the pre-implementation commit). Minor because an implementer can infer this, but specifying the mechanism would prevent ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: `decision:list --json` and `learning:list --json` referenced but not verified
Step 4 says "Include `reconsiderWhen`/`validUntil` conditions from `$GP decision:list --json` and `$GP learning:list --json`." These CLI commands should be verified to exist and return the expected fields. The plan already verifies other CLI commands — this pair should get the same treatment.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 7: Before-checks reference non-existent implementation
The Expected Behavior "Before" section says `bun tools/dogfood/test-implement.ts` exits non-zero because "assertions fail on missing implementation." But the test script itself is created in Phase 6 — so this before-check can only run after Phase 6. This is a sequencing issue: the before-check for Phase 7 effectively tests "Phase 6 artifacts exist but the system under test (skills/agents) is not yet integrated." This is technically correct but could confuse an implementer. Clarify that this before-check validates the test scripts detect incomplete integration, not that the scripts don't exist.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 3 shows strong improvement. All round 2 IMPORTANT issues have been addressed: the `implementationPhase` data model change is now properly scoped across 4 sub-tasks spanning schema/state-machine/CLI/surface layers; the Loop Parameters section is fully defined with all 11 slots; the coordinator adaptation for `review_context: "code-implementation"` now specifies the input format (changed file paths written to summary file), confirms no structural changes needed, and adds a verification step; the architecture spec update for the completion agent split is included; `verifyNoArtifactReads` is correctly named; the `slice:complete` payload is fully specified with `verificationPassed`, `learnings`, `architectureDelta`, and `deferred`; and trigger phrases are correctly placed in description fields. The remaining IMPORTANT issue (CLI command name for `implementationPhase`) is a specificity gap, not a structural problem. The plan is clear, well-phased, follows established patterns, and would be implementable as-is with minor clarifications.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
