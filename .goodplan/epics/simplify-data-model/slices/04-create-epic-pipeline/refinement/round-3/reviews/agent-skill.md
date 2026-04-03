# Agent Skill Review — Create-Epic Pipeline Plan (Round 3)

## Issues

**[IMPORTANT]** Explore-phase agent definition lacks clear PARTIAL return contract for the user-controlled exit loop
Phase 1 task for `explore-phase.md` describes the PARTIAL return cycle: "returns PARTIAL after each cycle with a summary of findings. Orchestrator presents to user..." But the agent definition task doesn't specify what the PARTIAL return's `summary`, `questions`, or `continuationFile` fields should contain for this use case. The sub-agent-return-format.md defines `questions` as "Questions for the user (PARTIAL status only)" — but in the explore loop, the orchestrator is asking the user a fixed question ("Continue exploring? / That's enough"), not surfacing agent-generated questions. The agent should return PARTIAL with a `summary` of findings (for the orchestrator to present) and a `continuationFile` path (for re-spawn), but NOT `questions` — the orchestrator handles the user interaction. Then when re-spawned with "finalize", it returns SUCCESS. The plan should explicitly specify which PARTIAL fields the explore-phase agent populates and which it omits, so the implementer doesn't misuse the `questions` field.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 slice creation loop doesn't handle `slice:create` failure for individual slices
The plan says: "Create slices via CLI: `gp slice:create --epic <name> --json` for each slice with stdin `{\"name\":\"<name>\",\"goal\":\"<goal>\"}`." If slice creation fails mid-loop (e.g., duplicate name, validation error), the plan doesn't specify recovery behavior. Should the orchestrator stop and surface the error? Continue with remaining slices? Roll back already-created slices? Given the CLI manages state with HMAC integrity, partial creation leaves the epic in an inconsistent state (some slices exist, others don't). The plan should specify: on any `slice:create` failure, stop immediately and surface the error — partial slice creation is acceptable because the user can re-run the pipeline (re-entry will detect the existing slices).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Architecture-phase agent writes directly to CLI-managed directory but no guard against path mismatch
Phase 4 says: "Get architecture output path from `start-architecture` response: `response.paths.architecture`" and "Agent writes directly to this directory (not temp dir)." This is a sound approach — the agent writes to the CLI-designated path. However, the `start-architecture` command (`src/commands/subagent/start-architecture.ts`) returns a `ContextBundle`, and the plan assumes a `paths.architecture` field exists in the response. Let me verify — the `startContext` function returns `{ inline, references, decisions, learnings }`. There is no `paths` field in the ContextBundle type. The orchestrator would need to derive the architecture path from the epic's directory convention (`.goodplan/epics/<name>/architecture/`) or the CLI would need to return it. The plan should either: (a) use the convention-based path `$(gp epic:show --epic <name> --json | jq -r '.path')/architecture/`, or (b) note that `start-architecture` needs a `paths` extension (which would be a CLI change outside this slice's scope). Option (a) is the pragmatic choice.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 3 SKILL.md tasks list 15+ individual task bullets — risk of exceeding 500-line SKILL.md limit
The plan's Phase 3 is the orchestrator SKILL.md itself. The task list includes: version check, phase table, re-entry protocol, 6 phase implementations (each with multiple sub-steps), context discipline, PARTIAL handling, condition loading, temp cleanup, conventions update, and logging. Following the plan-slice SKILL.md as a template (which is ~395 lines for a 2-phase pipeline), a 6-phase pipeline with refinement loops in two phases could easily exceed 500 lines. The plan acknowledges "Single SKILL.md file — agents do the heavy lifting, orchestrator stays thin," which is the right approach. But the plan should note that if the SKILL.md exceeds ~500 lines during implementation, the implementer should extract the refinement loop protocol into a shared reference file (e.g., `skills/_shared/references/refinement-loop.md`) and `@`-reference it from both plan-slice and create-epic SKILL.md files — this would also reduce duplication between the two orchestrators.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 reviewer agents specify "Read-only tools" but reviewer-holistic pattern also uses model field
The plan says reviewer agents should have "Read-only tools (Read, Grep, Glob). Return review content inline — do not write files." This matches the existing `reviewer-holistic.md` pattern perfectly. However, the existing reviewer agents include `model: opus` in frontmatter. The plan's Phase 2 tasks don't explicitly mention the `model` field for reviewer agents (it's mentioned for phase agents in Phase 1 but not for reviewers in Phase 2). The implementer should follow the existing pattern and include `model: opus` — but the plan should be explicit to avoid ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test harness `reconsiderWhen` positive test assumes agent will detect condition match from goal text
Phase 5 says: "Positive: create fixture decision with `reconsiderWhen: [\"New subsystem added that affects auth\"]`, set epic goal to mention auth restructuring. Verify agent output includes `triggeredConditions`." This test assumes the explore-phase or architecture-phase agent will semantically match the reconsiderWhen condition against the epic goal. The condition evaluation is LLM-based (agents evaluate conditions contextually, not via string matching), so the test relies on the LLM making the connection between "auth restructuring" in the goal and "New subsystem added that affects auth" in the condition. With `--model claude-haiku-4-5`, this may be unreliable. The plan should note this test may be flaky with smaller models and suggest using a more explicit match (e.g., goal text: "Add a new auth subsystem", condition: "New subsystem added that affects auth") to maximize reliability.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong improvement from round 2 (7/10). All four previous IMPORTANT issues are resolved: `round` field removed from submit payloads, `response.advanced` used for loop exit with orchestrator-side CRITICAL/IMPORTANT as a pre-submit gate, `start-refine-architecture`/`start-refine-slices` added to refinement loops, and `submit-explore` fixture clarified (empty stdin, not JSON). The plan now follows the validated plan-slice pattern closely. The remaining issues are: the explore-phase PARTIAL return contract is underspecified (which fields to populate), slice creation has no error handling for mid-loop failures, and the `paths.architecture` field may not exist in the ContextBundle response. To reach 9+: specify the explore-phase PARTIAL field contract, add slice creation error handling, and verify or replace the `response.paths.architecture` assumption.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
