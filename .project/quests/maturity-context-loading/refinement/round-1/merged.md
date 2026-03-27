# Merged Feedback — Round 1

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Phase 3 misunderstands preamble ownership — refine-slices reuses refine-plan's shared-preamble**
Phase 3 task 2 hedges: "If refine-slices uses a shared preamble..." Codebase confirms refine-slices uses `../refine-plan/references/shared-preamble.md` (SKILL.md line 195). Phase 2's preamble edit automatically flows to refine-slices. Phase 3 task 2 should be rewritten to: "Verify that refine-slices inherits the maturity section from Phase 2's shared-preamble.md edit. Ensure the `{maturity_summary}` placeholder is filled when spawning reviewers." Without this fix, an implementer might create a duplicate preamble for refine-slices.
*(Flagged by: Holistic, Software Architecture, Agent Skill)*
Resolution: DIRECTLY_ACTIONABLE

**I2. Legend text duplicated across 4 locations with no single source of truth**
The same 3-line legend is added to implement-plan's shared-preamble.md, implement-plan's sub-agent-prompts.md, and refine-plan's shared-preamble.md (which also covers refine-slices). That's 3-4 copies of identical text. If legend wording needs updating, all locations must be found and edited — violating DRY. Fix: extract the legend to a shared reference file under `skills/_shared/references/` (e.g., `maturity-legend.md`) that all skills reference. This matches the existing `_shared/references/` pattern for cross-skill content.
*(Flagged by: Software Architecture, Agent Skill)*
Resolution: DIRECTLY_ACTIONABLE

**I3. Legend text diverges from maturity-conventions.md**
The plan's legend for Maturing includes "fitness function updates" — but maturity-conventions.md attributes fitness function updates to Foundational, not Maturing. The legend also omits the Experimental level entirely. Fix: (1) Match the canonical source exactly for each level's description. (2) Either include Experimental ("Changes are free") or add an explicit note: "Experimental omitted because it imposes no constraints on changes."
*(Flagged by: Software Architecture, Agent Skill, Holistic)*
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 2 Expected Behavior is incomplete — shared preamble not tested**
Phase 2 before/after checks only test `skills/refine-plan/SKILL.md` for maturity references. But Phase 2 also modifies `skills/refine-plan/references/shared-preamble.md` (task "Shared preamble alignment"). The before-check should include `grep -c "maturity" skills/refine-plan/references/shared-preamble.md` returning 0 before and >= 1 after.
*(Flagged by: Holistic)*
Resolution: DIRECTLY_ACTIONABLE

**I5. Phase 1 Expected Behavior grep checks are fragile — not section-scoped**
The before-check `grep -c "maturity" skills/implement-plan/references/sub-agent-prompts.md` searches the entire file, not the "Implementation Sub-Agent Prompt" section. If any other section mentions "maturity" in the future, the before-check breaks. Either use a section-scoped check or acknowledge the whole-file scope as fragile. The same grep-only weakness applies to all three phases — the checks verify keyword presence but not correctness (placeholder wiring, conditional logic, etc.).
*(Flagged by: Holistic, Agent Skill)*
Resolution: DIRECTLY_ACTIONABLE

**I6. Phase 3 reviewer criterion has implicit dependency on preamble data**
Phase 3 task 3 adds a "Maturity Note completeness" criterion to the Architecture Alignment reviewer in `reviewers-slices.md`. This criterion references "the maturity table" which only exists if `{maturity_summary}` is populated in the preamble (task 2). The dependency is implicit. Fix: make it explicit — task 3 should note the dependency and the criterion text should include a conditional: "If no maturity table is available in the preamble, skip this criterion."
*(Flagged by: Software Architecture)*
Resolution: DIRECTLY_ACTIONABLE

**I7. Phase 3 reviewer criterion may need reviewer registry update**
Adding "Maturity Note completeness" to the Architecture Alignment reviewer expands its scope. If `skills/refine-slices/references/reviewer-registry.md` describes the reviewer's scope, it should be updated to reflect the new criterion.
*(Flagged by: Agent Skill)*
Resolution: CODEBASE_EXPLORATION

## MINOR Issues

**M1. Consumer Guide table in maturity-conventions.md needs updating**
The "Loaded by" column in `skills/_shared/references/maturity-conventions.md` (lines 200-205) currently lists `/create-plan`, `/create-slices`, `/complete`. After this quest, `/implement-plan`, `/refine-plan`, and `/refine-slices` should also be listed. Add a task to update this table.
*(Flagged by: Holistic)*
Resolution: DIRECTLY_ACTIONABLE

**M2. refine-slices SKILL.md placeholder filling location not specified**
Phase 3 task 1 adds maturity extraction but doesn't specify where in refine-slices' SKILL.md the `{maturity_summary}` placeholder gets filled before spawning reviewers. Should be in Step 0 (Load Context), carried to Step 3 when spawning reviewers.
*(Flagged by: Software Architecture)*
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 1 user presentation step missing**
Phase 2 (task 4) and Phase 3 (task 4) both present maturity context to the user. Phase 1 (implement-plan) has no equivalent. For consistency, implement-plan should present maturity context during plan loading (Step 1).
*(Flagged by: Software Architecture)*
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 1 task references wrong insertion point in SKILL.md**
Plan says "In Step 1 (Load and Parse the Plan), after loading conventions.md..." but conventions.md loading is at line 86 ("Also load `.project/conventions.md` if it exists"), not at the start of Step 1. Clarify the insertion point.
*(Flagged by: Agent Skill)*
Resolution: DIRECTLY_ACTIONABLE

## Resolution Categories

### DIRECTLY_ACTIONABLE
- I1: Rewrite Phase 3 task 2 to acknowledge preamble sharing
- I2: Extract legend to `skills/_shared/references/maturity-legend.md`
- I3: Correct legend text to match maturity-conventions.md exactly; note Experimental omission
- I4: Add shared-preamble grep check to Phase 2 Expected Behavior
- I5: Use section-scoped grep or acknowledge fragility in Phase 1
- I6: Add conditional guard to Phase 3 reviewer criterion
- M1: Add implement-plan, refine-plan, refine-slices to Consumer Guide "Loaded by"
- M2: Specify placeholder filling location in refine-slices SKILL.md
- M3: Add user-facing maturity presentation to Phase 1
- M4: Clarify SKILL.md insertion point for maturity extraction

### RESEARCH_NEEDED
None.

### CODEBASE_EXPLORATION
- I7: Check `skills/refine-slices/references/reviewer-registry.md` for scope descriptions needing update

## Contradictions Resolved

1. **Legend text accuracy**: Agent Skill says Maturing's legend incorrectly includes "fitness function updates" (should be Foundational only). Software Architecture says "the Developing description should match the canonical source exactly." Holistic says the Experimental omission should be noted. These are complementary, not contradictory. Merged as I3 with the most specific version (Agent Skill's, which identifies the exact factual error).

2. **Grep check weakness**: Holistic flags Phase 1's grep as not section-scoped. Agent Skill flags all three phases' grep checks as too weak for skill verification (should test actual behavior). Software Architecture concurs. These are the same fundamental issue at different severities. Merged as I5, keeping the broader framing (all phases, not just Phase 1) with the specific Phase 1 example.

## Unresolved

None.
