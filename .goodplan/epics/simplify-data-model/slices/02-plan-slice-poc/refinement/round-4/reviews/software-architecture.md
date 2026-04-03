# Software Architecture Review -- Plan-Slice PoC (Round 4)

## Issues

**[MINOR]** Phase 3 tool restrictions specify both `allowedTools` and `disallowedTools: ["Agent"]` redundantly

Phase 3 (lines 122-128) defines per-agent tool restrictions with both an `allowedTools` allowlist AND a blanket `disallowedTools: ["Agent"]` for all agents. When `allowedTools` is specified, only the listed tools are available -- any tool not on the list is already excluded. The `disallowedTools: ["Agent"]` is therefore redundant for every agent that has an `allowedTools` list. Per the research doc (`claude-code-capability-verification.md` line 113): "If both are set, disallowedTools is applied first, then tools is resolved against the remaining pool." This works correctly but adds unnecessary complexity.

Two options: (a) keep `disallowedTools: ["Agent"]` as defense-in-depth documentation (explicitly signals intent even though mechanically redundant), or (b) remove it for agents that already have `allowedTools` and only use it for agents that need the full tool set minus Agent. Option (a) is fine for a PoC -- just add a brief inline note explaining the redundancy is intentional for clarity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `verifyNoArtifactReads` naming was not changed per round 3 feedback but the scope clarification is adequate

Round 3 IMPORTANT issue recommended renaming to `verifyOrchestratorDiscipline()` to align with the concept and resolve naming inconsistency with the codebase research doc. The current plan retains `verifyNoArtifactReads` but adds a thorough description of the relationship to `checkViolation()` (line 192: "Together they form the two halves of orchestrator discipline: state write integrity + context read discipline"). The naming inconsistency with the research doc (which says `verifyOrchestratorDiscipline`) remains, but the function's purpose and relationship to `checkViolation` are now clearly documented. The descriptive name `verifyNoArtifactReads` is arguably more self-explanatory than the abstract `verifyOrchestratorDiscipline`. Acceptable as-is -- the implementer will not be confused.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 exit condition logic mixes synthesis return and individual reviewer returns in the description

Phase 3 (line 142) says the orchestrator should evaluate exit conditions "using ONLY the synthesis agent's return value" -- good. But line 143 says "All scores >= 9 AND no CRITICAL or IMPORTANT issues remain -> exit loop, submit plan." The phrase "all scores" is ambiguous: does it mean the synthesis aggregate score must be >= 9, or that every individual reviewer score (as reported within the synthesis return) must be >= 9? The synthesis agent returns an aggregate score plus merged issues. The orchestrator should check the aggregate score, not parse individual reviewer scores from the synthesis return. Clarify "all scores >= 9" to "aggregate score >= 9" or specify that the synthesis return includes per-reviewer scores that must all be >= 9 (and if so, define that in the synthesis return schema).

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 4 successfully addressed both IMPORTANT issues from round 3. The `slice:refine-plan` rationale is now clearly documented with the STATE_INVALID_TRANSITION explanation (line 150). The `verifyNoArtifactReads` / `checkViolation` relationship is explicitly described as two complementary halves of orchestrator discipline (line 192). The three round 3 MINOR issues were all resolved: sub-agent return format sync mechanism is specified (line 152), the architecture update task correctly targets only line 135 (line 42), and the `@` reference extraction regex is included (line 85). The remaining issues are all MINOR: a redundant tool restriction pattern, a naming preference that is now moot given the added documentation, and a small ambiguity in exit condition phrasing. The plan is architecturally sound and ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
