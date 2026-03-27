## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT] Shared legend inlining contradicts single-source-of-truth goal** *(Agent Skill)*

The plan creates `maturity-legend.md` as a canonical reference but then instructs Phase 1 tasks to "inline the content" into both `shared-preamble.md` and `sub-agent-prompts.md`. If content is literally copy-pasted into two locations, a future editor updating `maturity-legend.md` must also update those two spots — exactly the drift the shared file was supposed to prevent.

The plan must clarify the mechanism: either (a) the orchestrator reads `maturity-legend.md` at runtime and interpolates it via a `{maturity_legend}` placeholder (strongly preferred — both implement-plan and refine-plan already have placeholder-filling machinery), or (b) explicitly state that inline text must be kept in sync manually and the verification step catches drift. This affects Phase 1 tasks 3 and 4, Phase 2 task 3, and the Phase 3 preamble inheritance assumption.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR] Phase 2 Step 0b insertion point is ambiguous** *(Agent Skill)*

Phase 2 says to add maturity extraction "In Step 0b (Load Plan and Prepare Working Copy), after loading the plan." Step 0b has seven sub-steps and "after loading the plan" is ambiguous. The create-plan pattern places maturity extraction right after architecture loading; since refine-plan's Step 2b already loads architecture, maturity extraction should go in Step 2b (after architecture is loaded), not Step 0b (plan mechanics). This would also mirror the implement-plan Phase 1 pattern more closely.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 SKILL.md line reference is fragile** *(Agent Skill)*

The plan gives "line 86" of implement-plan's SKILL.md as the insertion point. Line numbers shift as the file is edited. Downgrade the line number to a secondary hint and make the surrounding text anchor primary (e.g., "after the line: 'Also load `.project/conventions.md` if it exists'").

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Consumer Guide update deferred to Phase 3 but applies to all phases** *(Software Architecture + Holistic, deduplicated)*

Phase 3 task 5 batches all three Consumer Guide additions (`/implement-plan`, `/refine-plan`, `/refine-slices`) into one step. This means the guide is stale while Phases 1 and 2 are implemented and verified. Either update the Consumer Guide incrementally within each phase (Phase 1 adds `/implement-plan`, Phase 2 adds `/refine-plan`, Phase 3 adds `/refine-slices`), or add a note stating the batch update is intentional. Additionally, Phase 3's verification section does not currently verify the Consumer Guide update — add a verification bullet: "Read the 'Loaded by' column for the Maturity table row in `skills/_shared/references/maturity-conventions.md` and confirm it includes all three skill names."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 before-checks should note why reviewer files are excluded** *(Holistic)*

The Phase 2 before-check `grep -c "maturity" skills/refine-plan/SKILL.md` asserts 0 matches. The `refine-plan/references/reviewers-always.md` file already contains "maturity" in reviewer criteria, but the before-check scopes only to `SKILL.md` and `shared-preamble.md`. This is correct, but without explanation it may confuse the implementing agent. Add a brief note stating that reviewer files are excluded from before-checks because they already reference maturity in existing review criteria (not as context-loading).

Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

Count: 5

1. Clarify legend inlining mechanism — introduce `{maturity_legend}` placeholder or explicitly document manual-sync requirement (IMPORTANT)
2. Move Phase 2 maturity extraction to Step 2b (after architecture loading) instead of Step 0b
3. Downgrade line 86 to secondary hint; make surrounding text anchor primary for insertion point
4. Address Consumer Guide staleness: either split update across phases or add an explicit note; add verification bullet to Phase 3
5. Add note to Phase 2 before-checks explaining why reviewer files are excluded from the grep scope

## RESEARCH_NEEDED

Count: 0

## Contradictions Resolved

**Legend "sourced from" vs "inlined from":** Software Architecture and Agent Skill both raised the same tension around whether `maturity-legend.md` content is truly a single source or copy-pasted. Agent Skill raised it as IMPORTANT (structural gap), Software Architecture as MINOR (mechanically ambiguous but workable). Resolved in favor of Agent Skill (domain specialist): treating this as IMPORTANT because it directly affects the single-source-of-truth goal stated in the plan.

**Consumer Guide timing:** Holistic flagged missing verification; Software Architecture flagged staleness during incremental implementation. Both are valid and non-contradictory — merged into a single MINOR issue covering both concerns.

## Unresolved (USER_INPUT required)

None.
