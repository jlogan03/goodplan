# Round 3 Merged Feedback

## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT] Phase 2 Expected Behavior "Before" grep count mismatch** *(holistic)*
The Phase 2 "Before implementation" check says the grep should return "expected: ~34" hits. The actual count for that exact grep pattern is 21. The ~34 count is only correct when `__active__` is included in the pattern. Either add `__active__` to the Before grep (matching Phase 1's pattern), or correct the expected count to ~21.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 create-plan/references/guidance.md task: lines 99-103 have no literal `__active__` to replace** *(holistic)*
The plan says lines 99-103 should have `__active__` replaced. Lines 99-101 reference "active epic" as a concept but contain no literal `__active__` strings. Only line 95 contains a literal `epics/__active__<name>/architecture/` path. The task should be scoped: line 95 is a path replacement; lines 99-103 need an instruction to detect active epic via `goodplan status --json` (not `__active__` string replacement).
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR] Phase 2 Expected Behavior missing `__active__` grep in Before section** *(holistic)*
Phase 1's Expected Behavior includes a separate After check for `__active__` (`grep -rn 'ls -d.*__active__' ...`). Phase 2 has this in its After section but omits `__active__` from the Before grep. For symmetry, either include `__active__` in the main Before grep pattern (which makes the ~34 count correct) or add a separate Before check.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] guidance.md line 13 over-cautionary note misleads implementer** *(software-architecture)*
The plan warns line 13 is "dense with multiple path references — ensure all `__active__` occurrences within it are caught." In practice, line 13 contains exactly one `__active__` occurrence (in the sequencing.md path). Simplify to: "Replace `__active__` in the sequencing.md path reference."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] create-plan quest scope: implicit reasoning around begin-phase command** *(software-architecture)*
The plan specifies `submit-plan --quest <name> --json` for quest scope but does not explicitly state why `quest:plan` (the begin-phase command) is not invoked by create-plan. The reasoning is correct — create-plan is invoked after the orchestrator has already begun the phase — but it is implicit. A one-line clarifying note would help the implementer.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] create-slices/references/guidance.md task scope description** *(holistic)*
The plan says "Lines 41-43: Replace entire Graceful Stop section" and the grep pattern only catches line 41. Lines 42-43 also reference `formats.md`, `State:`, `Activity-log:` which are target patterns. The task description is already clear about replacing all 3 stop cases — this is informational only.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 5 distinct issues are directly actionable:
1. Fix Phase 2 Before grep count (~34 → ~21, or expand the grep pattern to match Phase 1)
2. Scope guidance.md task: line 95 = path replacement; lines 99-103 = add `goodplan status --json` detection instruction
3. Add `__active__` grep to Phase 2 Before section (symmetry with Phase 1)
4. Simplify line 13 caution note to single-occurrence fact
5. Add one-line note explaining why create-plan does not invoke `quest:plan` begin transition

## RESEARCH_NEEDED

None.

## Contradictions Resolved

None. Both reviewers flagged distinct issues with no overlapping or conflicting assessments. The software-architecture reviewer confirmed the `submit-plan --quest` approach is correct; the holistic reviewer confirmed the same for the broader plan structure.

## Unresolved (USER_INPUT required)

None.
