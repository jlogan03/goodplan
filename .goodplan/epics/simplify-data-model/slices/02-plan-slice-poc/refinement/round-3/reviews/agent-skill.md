# Agent Skill Review — Plan-Slice PoC (Round 3)

## Issues

**[IMPORTANT] Agent definitions lack explicit sub-agent tool restrictions**
Phase 1 creates 7 agent `.md` files with frontmatter (`name:`, `description:`, `model:`), but none specify which tools the sub-agent is allowed to use. The architecture overview (line 130) states "Sub-agents cannot use AskUserQuestion" and "Sub-agents cannot spawn sub-agents (flat hierarchy)." These constraints must be enforced at spawn time via the Agent tool's configuration, not just documented in prose. The plan-slice SKILL.md (Phase 3) should include explicit tool restriction lists when spawning each agent type — e.g., reviewer agents need `["Read", "Grep", "Glob", "Write"]`, and the orchestrator must not pass `AskUserQuestion` or `Agent` to sub-agents. Without explicit restrictions, a sub-agent could violate the flat hierarchy constraint or trigger user interaction during autonomous phases. Add a task to Phase 3 specifying the `allowedTools` (or equivalent Agent tool parameter) for each agent category (reviewers, editor, synthesis, coordinator, plan-phase).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `gp start-plan` return shape not specified — plan-phase agent dependency on it is implicit**
Phase 3, line 129 says the orchestrator uses `gp start-plan --slice <name> --json` to assemble context for the plan-phase agent, noting it's "more robust than manually constructing paths from `gp status --json`." However, the plan never specifies what `start-plan` returns or which fields the plan-phase agent needs from it. The actual command (`src/commands/subagent/start-plan.ts`) returns a `ContextBundle` JSON — the plan should name the expected fields (e.g., `architectureFiles`, `goal`, `conventions`) so the plan-phase agent's task prompt can be validated against the actual CLI output. Without this, the implementer must reverse-engineer the return shape, risking a mismatch.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT] Synthesis agent input is file paths but scoring is from return JSON — dual channel ambiguity**
Phase 3, line 133 says the orchestrator spawns synthesis "with: reviewer output file paths." Line 134 says synthesis "Returns aggregate score, merged issues, severity counts." But line 132 says reviewers both "write to the specified output path AND return JSON with score + issues." This creates two channels: the synthesis agent reads reviewer files (full review content) AND the orchestrator parses reviewer return JSON (scores). The plan doesn't clarify which source the orchestrator uses for exit condition evaluation (line 134-139). If the orchestrator uses synthesis return values (aggregate score), it should ignore individual reviewer return JSON. If it uses reviewer returns directly, synthesis is redundant for scoring. Clarify: the orchestrator should use ONLY the synthesis agent's return for exit decisions, treating individual reviewer returns as pass-through (logged but not parsed for exit logic).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Agent body size guidance (500 lines) may conflict with `@` reference injection**
Phase 1 verification (line 61) says "Check that no agent body exceeds ~500 lines." But agent bodies use `@${CLAUDE_PLUGIN_ROOT}/...` references that expand at load time. The review-preamble.md alone (based on the existing `shared-preamble.md` at ~90 lines) plus a domain review file (~50-100 lines) plus the agent's own instructions could easily push an expanded agent body beyond 500 lines while the source `.md` stays compact. Clarify whether the 500-line check applies to the source file (pre-expansion) or the expanded body. Source-file check is more practical and aligns with the progressive disclosure principle — the `@` mechanism IS progressive disclosure.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No error handling specified for `@` reference resolution failures**
Phase 2 adds `@` reference path validation in the build pipeline (line 85), which catches missing references at build time. But at runtime, if a reference file exists but contains invalid content (empty, malformed markdown, wrong format), the agent will receive corrupted instructions silently. The plan could add a brief note to the agent definition tasks (Phase 1) specifying that each `@` reference should include a self-identifying header (e.g., `# Review Preamble`) so implementers can spot-check that injection worked correctly in test logs.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] PARTIAL status handling (line 146) is underspecified for the PoC scope**
Phase 3 includes a task for PARTIAL status handling (continuation files, research agent spawning, re-spawning with resolved inputs). This is a significant feature that adds complexity to the orchestrator. The plan doesn't indicate whether PARTIAL handling is required for the PoC to be considered complete, or whether it's a stretch goal. Given this is a proof-of-concept slice, consider marking PARTIAL handling as optional/deferred with a note that plan-phase and reviewer agents should return COMPLETE or ERROR only in the PoC — PARTIAL support can be added in a subsequent slice when the pattern is proven.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 2 issues have been thoroughly addressed. The plan is well-structured with clear phase boundaries, concrete Expected Behavior sections, and appropriate verification steps. Trigger phrase differentiation, reviewer output file handoff, dual-format return schemas, re-entry guardrails, and temp directory lifecycle are all now well-specified. The remaining issues are: (1) missing explicit tool restrictions on sub-agents (important for enforcing the flat hierarchy and AskUserQuestion constraints), (2) implicit dependency on `gp start-plan` return shape, and (3) ambiguity in which score channel drives exit decisions. Addressing items 1 and 3 would solidify the score at 9+. Item 2 is a codebase exploration task that would prevent implementation surprises.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
