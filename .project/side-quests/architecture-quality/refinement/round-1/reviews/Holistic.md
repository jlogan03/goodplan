## Issues

**[IMPORTANT]** Phase 4 lacks specificity on reviewer reuse vs duplication
The plan says `/refine-architecture` will use "the reviewer infrastructure" and the same "iteration loop" as `/refine-plan`, but never specifies whether it imports shared code, copies files, or references them. The current codebase has two copies of `reviewers-cross-cutting.md` (one in refine-plan, one in implement-plan) with slight differences. Phase 4 should state explicitly whether refine-architecture gets its own copy of reviewer prompts, shares refine-plan's files, or uses a new shared location. Without this, the implementer will guess, likely creating a third copy and increasing maintenance burden.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 audit-architecture gap analysis relies on a single sub-agent for what could be a very large job
Step 2 of Phase 5 spawns one exploration sub-agent to compare every architecture file against the entire codebase. For a non-trivial codebase, this is a large surface area for a single agent context window. The plan should either (a) scope the agent to one architecture file at a time (spawning N agents in parallel), or (b) acknowledge the single-agent approach and describe how to handle context overflow. Phase 4 (refine-architecture) correctly spawns multiple reviewers in parallel — Phase 5 should follow the same pattern.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 and 3 have no verification that can be mechanically checked
Phases 2 and 3 change define-architecture's interactive flow. Their verification sections say "Read updated SKILL.md — confirm Steps 5 and 7 exist" and similar. This is purely visual inspection of a markdown file — it verifies the text was written, not that the flow works. Given that these are interactive skills (not code with tests), the plan should include a concrete dry-run verification: walk through the updated SKILL.md as if executing it on a test idea.md, confirming each step's inputs and outputs chain correctly. This is especially important because the two-pass design tree (broad then deep) with design-it-twice sandwiched between them creates a complex handoff sequence.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No task for updating the decisions-format.md Writer/Reader lists
Phase 4 creates `/refine-architecture` and Phase 5 creates `/audit-architecture`. Both load and potentially write decisions. The current `decisions-format.md` has explicit Writer and Reader lists (lines 78-80 of the file). The plan should include tasks to update these lists. Without this, the next person reading decisions-format.md gets an incomplete picture of which skills interact with decisions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 architecture editor sub-agent has no precedent to copy from
The plan says to create a sub-agent prompt for an "architecture editor" that "operates on architecture markdown." The existing plan-editor sub-agent prompt in `refine-plan/references/sub-agent-prompts.md` is tailored to plan documents (it references confirmed goals, severity-based prioritization, plan structure). The plan should specify how the architecture editor differs — what sections of architecture files it can modify, what it should preserve (e.g., subsystem API contracts that downstream plans depend on), and what guardrails prevent it from making changes that invalidate existing plans or decisions.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification uses grep patterns that assume exact criterion titles
The verification step uses `grep -c "Module depth\|Caller friction\|Test boundary alignment\|Deepening opportunities"` to confirm criteria exist. If the implementer adjusts the criterion titles even slightly (e.g., "Module Depth" with capitals, or "Test-boundary alignment"), the grep fails. This is fragile. Consider a verification that checks for the criterion numbers (8, 9, 10, 11) instead, or accept that the grep is approximate.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 sub-agent design constraints are hardcoded in the plan
Step 6.2 of Phase 3 lists specific design constraint prompts ("Minimize API surface", "Maximize flexibility", "Optimize for the most common case"). These are reasonable defaults but are embedded in the plan text rather than in the reference file. Since Phase 3 also creates `define-architecture/references/design-it-twice.md`, the plan should clarify that these constraints live in the reference file (the sub-agent prompt template), not in SKILL.md. SKILL.md should reference the file, not duplicate the content.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 missing integration point with slice-quality-and-health quest's system-profile.md
The plan's overview mentions "system-profile.md deferred to slice-quality-and-health side quest" and Phase 5's last task has a note about it. However, the note says to "Add this to the slice-quality-and-health goal.md" but doesn't include this as a concrete task with verification. Checking the downstream `slice-quality-and-health/goal.md`, it already mentions the integration (lines 73-75). So the note in Phase 5 may already be satisfied — but the plan should verify this rather than create a task that might duplicate existing content.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** No documentation update tasks
None of the 5 phases include tasks for updating project-level documentation. The `idea.md` skill inventory section should be updated to reflect the two new skills (`/refine-architecture`, `/audit-architecture`). The `workflow.md` file (referenced in CLAUDE.md) should be updated if it describes the architecture workflow. These are small tasks but prevent documentation drift.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 early exit thresholds copied from refine-plan without justification
Phase 4 says "Iterate until all scores >= 9 (max 12 iterations, early exit at 8+ after 5 iterations)" — the same thresholds as refine-plan. Architecture files are typically shorter and simpler than implementation plans. The plan should either justify using the same thresholds or consider lower maximums (e.g., max 8 iterations) to avoid over-polishing architecture prose.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a clear, logical structure and good phase ordering. Each phase builds on the previous one and is independently testable. The confirmed goal is well-served by the plan's scope. However, there are several important gaps: the reviewer infrastructure reuse strategy is unspecified (risking copy-paste proliferation), the gap analysis sub-agent approach doesn't scale, verification for the most complex phases (2, 3) is weak, and administrative tasks (decisions-format.md updates, documentation updates) are missing. Bringing this to 9+ requires addressing the 5 IMPORTANT issues — particularly clarifying how Phase 4 shares reviewer infrastructure with refine-plan, splitting the Phase 5 gap analysis into parallel agents, and adding mechanical verification for the design tree + design-it-twice flow.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
