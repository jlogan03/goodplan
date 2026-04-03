# Agent Skill Review — Plan-Slice PoC (Round 2)

## Issues

**[IMPORTANT] Plan-slice SKILL.md description may under-trigger for the replacement use case**
The plan (line 119) lists trigger phrases: "create plan, plan slice, refine plan, improve plan, review plan". However, the existing `/gp:create-plan` and `/gp:refine-plan` skills will still be installed during the transition period (the plan explicitly keeps backward compatibility). Users invoking "create a plan" or "refine plan" will match the existing skills, not the new `plan-slice`. The description needs to either (a) include stronger differentiating trigger language (e.g., "plan and refine a slice in one step", "end-to-end plan creation and refinement") or (b) the plan needs a task to update the existing `create-plan` and `refine-plan` descriptions to defer to `plan-slice` when the new skill is available. Without this, the new skill will effectively never trigger organically.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Architecture _overview.md stale `skills:` paragraph (line 69) fix scope is understated**
Phase 1 task says "remove stale `skills:` frontmatter paragraph (~line 69) and replace with the `@` reference mechanism." But the stale content isn't just one paragraph — lines 69 and 135 both reference `skills:` frontmatter. Line 135 says "Agent definitions solve the plugin file permission issue: shared references are injected via `skills:` frontmatter, not Read tool calls." This directly contradicts the `@` reference mechanism. The plan task should explicitly enumerate both locations to avoid a partial fix.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Reviewer agent return format inconsistency with synthesis agent expectations**
Phase 1 defines reviewer agents returning "structured JSON with score, issues, summary" (line 51) and the synthesis agent "merges multiple reviewer outputs" (line 54). But reviewer agents are sub-agents that return text (the Agent tool returns a string result, not structured data). The plan needs to clarify: do reviewers write JSON to a file in the temp directory (and synthesis reads those files), or do reviewers return JSON as their final text output (and the orchestrator parses it and passes paths/content to synthesis)? The current plan has the orchestrator spawning synthesis "with: all reviewer output paths" (line 134) suggesting file-based handoff, but nowhere do the reviewer agent tasks specify writing their output to files. Add a task clarifying the reviewer output mechanism: each reviewer writes its review to `<tmpdir>/reviews/<domain>.json` and the orchestrator passes those paths to synthesis.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Re-entry re-refine flow has an invalid status transition**
Line 113 says re-refinement transitions `plan-refined` -> `planning` before re-refinement. But `plan-refined` -> `planning` is not a standard state machine transition. The conventions.md status table (lines 119-141) shows `planning` follows `created`. Re-entering a completed planning phase would need either a dedicated CLI command or the plan must specify which existing command supports this backward transition. This is a state machine concern — the plan should either add a task to verify this transition exists or propose a different approach (e.g., use `submit-refinement --override` to re-enter refinement without going back to `planning`).
Resolution: CODEBASE_EXPLORATION

**[MINOR] Agent model field defaults to `opus` but test harness defaults to `haiku`**
Phase 1 (line 35) says each agent has `model: opus` in frontmatter with "runtime respects it; test harness `--model` flag overrides via per-invocation parameter." Phase 4 (line 191) says "default: `claude-haiku-4-5` for structural tier." This is consistent but worth noting: the `model:` frontmatter value is the production default, while the test `--model` flag overrides it. The plan should add a brief note in Phase 4 verification confirming that the `--model` override actually takes precedence over the agent's frontmatter `model:` field — if it doesn't, all test runs will use opus and be expensive.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `verifyOrchestratorDiscipline` scope limited to Read calls but plan also mentions context discipline for content**
Phase 4 (lines 175-179) defines `verifyOrchestratorDiscipline()` as checking Read calls. But the context discipline rule (conventions.md line 9-16) also prohibits the orchestrator from making content-level decisions. The verification utility only catches one class of violations (Read calls). This is acceptable for a PoC but worth noting as a known limitation — the function name implies broader verification than it delivers. Consider renaming to `verifyNoArtifactReads()` for clarity, or add a doc comment noting the scope.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Temp directory cleanup timing could leave stale dirs on partial success**
Line 16 says temp directory is "preserved on failure for debugging, cleaned up on successful submission." But the refinement loop may succeed on plan submission (`submit-plan`) but then fail during a refinement round. The plan doesn't specify whether the temp dir is cleaned up after `submit-plan` or only after the final `submit-refinement`. If cleanup happens at `submit-plan`, refinement artifacts are lost. If at final submission only, partial refinement failure leaves the temp dir permanently. Add a sentence clarifying: temp dir is cleaned up only after the orchestrator exits successfully (all rounds complete or early-stop), preserved on any error.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 is a significant improvement over round 1. CLI commands now match the actual command surface. The severity/resolution tagging is consistent. The agent definition structure (frontmatter, `@` references, shared references) follows established patterns well and aligns with the epic architecture. The refinement loop exit conditions are well-specified. The main remaining issues are: (1) the trigger/description problem that will prevent the skill from being discovered during the transition period, (2) incomplete specification of reviewer output handoff mechanism, (3) a potentially invalid state transition for re-refinement, and (4) incomplete cleanup of stale `skills:` references in the architecture overview. Addressing these four issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
