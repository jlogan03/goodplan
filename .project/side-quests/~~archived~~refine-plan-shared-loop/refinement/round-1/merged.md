### CRITICAL Issues

None.

### IMPORTANT Issues

**I1. Hybrid inline/reference pattern diverges from both existing exemplars without justification**
Sources: Software Architecture (primary), Agent Skill (supporting)
The plan proposes keeping some sub-steps inline while removing others to "see iteration-loop.md" — a hybrid approach. Refine-architecture keeps all sub-steps inline but briefer; refine-slices replaces nearly everything with a short summary + numbered list. The plan should explicitly pick one of these existing patterns (or justify a third). The hybrid risks forcing the reader to constantly switch between two documents.
Resolution: DIRECTLY_ACTIONABLE — pick a pattern and state why.

**I2. Loop Parameters table values lack precision compared to refine-architecture's example**
Sources: Agent Skill (primary), Software Architecture (supporting)
"Scope constraints" value is vague ("`-refining` working copy of the plan") vs refine-architecture's concrete ".project/architecture/ files only." "Working directory" has the same issue. The plan should specify concrete parameter values matching the precision of the existing exemplar.
Resolution: DIRECTLY_ACTIONABLE — tighten parameter value wording.

**I3. Shared loop reference placement within Step 3 is ambiguous**
Sources: Agent Skill, Software Architecture (both flag this independently)
The plan says "at the top of Step 3, before the run directory setup." Software Architecture notes refine-architecture reads the shared loop in Step 0, not the loop step itself. Agent Skill notes refine-architecture places it after the heading, before sub-steps. The plan needs to specify exact placement and whether it belongs in Step 0 or Step 3.
Resolution: DIRECTLY_ACTIONABLE — specify exact placement, matching whichever exemplar pattern is chosen per I1.

**I4. Model selection policy table overlap with iteration-loop.md not resolved**
Sources: Agent Skill, Software Architecture (both flag this)
The plan says "keep the model selection policy table" but iteration-loop.md already covers reviewer and editor model downgrade guidance. Only the "Plan editor" row (Agent Skill) or "Synthesis" row (Software Architecture) is truly refine-plan-specific. The plan should state explicitly: keep the full table, or keep only the unique rows?
Resolution: DIRECTLY_ACTIONABLE — make an explicit choice about which rows survive.

**I5. Removal list insufficient precision about which specific sentences survive**
Sources: Software Architecture (primary), Holistic (supporting — "kept-inline steps weren't accidentally modified")
Step 3c has refine-plan-specific guardrails (e.g., "do NOT read the reviewer prompt files yourself") not covered by iteration-loop.md. The plan says "remove 3c, keep the note about re-evaluating specialist relevance" but doesn't enumerate which other sentences must survive. Sentence-level precision needed.
Resolution: DIRECTLY_ACTIONABLE — enumerate surviving sentences for each removed sub-step.

**I6. Verification of iteration-loop.md completeness is underspecified**
Sources: Holistic (primary)
The task "Verify iteration-loop.md completeness" gives no concrete check method. Should: read each skill's loop section, confirm every sub-step either references iteration-loop.md or is documented inline, and that no sub-step references a renamed/restructured section.
Resolution: DIRECTLY_ACTIONABLE — add concrete verification checklist.

**I7. No atomicity/rollback guidance for the edit sequence**
Sources: Holistic
If refactoring is interrupted mid-edit, SKILL.md could be inconsistent. Plan should note: make all changes in a single atomic commit, or work on a copy and replace at the end.
Resolution: DIRECTLY_ACTIONABLE — add one sentence about atomic commit or copy-and-replace.

### MINOR Issues

**M1. Verification lacks concrete behavioral equivalence check method**
Sources: Agent Skill, Software Architecture (both independently)
Plan says "confirm the refactored version produces the same agent behavior" without method. Both reviewers suggest: create a mapping table of each original sub-step (3a-3m) to its new location (inline at line X, or iteration-loop.md section Y).
Resolution: DIRECTLY_ACTIONABLE — add mapping table to plan.

**M2. Line reduction target is imprecise and likely optimistic**
Sources: Holistic, Agent Skill, Software Architecture (all three flag this)
Target of "~50-80 lines removed" is probably closer to 30-50 given retained content. Reframe as "verify meaningful reduction" rather than a specific target. If reduction is under 20 lines, investigate.
Resolution: DIRECTLY_ACTIONABLE — soften to a sanity-check range.

**M3. No task for updating SKILL.md References section**
Sources: Holistic
The References section at the bottom of SKILL.md should list iteration-loop.md after refactoring, matching the pattern in refine-architecture and refine-slices.
Resolution: DIRECTLY_ACTIONABLE — add task.

**M4. Task ordering: verify iteration-loop.md completeness should happen before removing inline content**
Sources: Holistic
If a gap is found in iteration-loop.md, the removal scope changes. Reorder or note the dependency.
Resolution: DIRECTLY_ACTIONABLE — reorder or add dependency note.

**M5. Reviewer Roles section overlap not explicitly addressed**
Sources: Agent Skill
The Reviewer Roles section (lines 29-38) partially overlaps with iteration-loop.md's "Reviewer Spawn Pattern." Plan should explicitly note this section is untouched (consistent with refine-architecture).
Resolution: DIRECTLY_ACTIONABLE — add one sentence confirming Reviewer Roles section is unchanged.

**M6. shared-preamble.md ownership asymmetry is a future cleanup opportunity**
Sources: Software Architecture
After this refactoring, iteration-loop.md lives in `_shared/` but shared-preamble.md lives in `refine-plan/`. Out of scope but should be noted.
Resolution: DIRECTLY_ACTIONABLE — add a "future work" note.

### DIRECTLY_ACTIONABLE (for loop exit)

All 13 issues (7 IMPORTANT + 6 MINOR) are DIRECTLY_ACTIONABLE. No blockers requiring user input or external research.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **Where does the shared loop reference go — Step 0 or Step 3?**
Software Architecture says refine-architecture reads it in Step 0; Agent Skill says refine-architecture places the reference text at the top of Step 2 (the loop step). Resolution: trusting Software Architecture (domain specialist) — the plan should examine refine-architecture's actual structure and match it. Both reviewers agree the plan must be explicit about placement; the disagreement is only about what refine-architecture does, which the implementer can verify.

2. **Which model selection policy rows are refine-plan-specific?**
Agent Skill says "Plan editor" row is specific. Software Architecture says "Synthesis" row is specific. Resolution: both are likely correct about different rows — the plan should audit each row against iteration-loop.md and keep only rows not covered there.

3. **Line reduction estimate.**
Holistic: 50-80 removed. Agent Skill: probably 40-50 removable, net ~25-35. Software Architecture: net ~30-40. Resolution: the domain specialists' lower estimates are more credible. Merged recommendation: soften to "verify meaningful reduction (expect net 25-40 lines)."

### Unresolved (USER_INPUT required)

None. All issues are directly actionable by the implementer.
