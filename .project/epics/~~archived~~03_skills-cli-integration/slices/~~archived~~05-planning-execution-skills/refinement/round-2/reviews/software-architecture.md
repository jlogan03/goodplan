# Software Architecture Review — Iteration 2

## Issues

**[IMPORTANT]** refine-slices Cleanup on Interruption has an uncovered activity-log reference (line 120)
The plan's Phase 1 tasks for `refine-slices/SKILL.md` list lines 114 (state.md) and 115 (activity-log) under Step 5: State Write-Back. However, line 120 in the Cleanup on Interruption section also writes to activity-log: `Write activity-log with "status":"abandoned"`. This reference is not listed in the plan's task inventory and would survive the grep verification (which checks for `activity-log.jsonl` — line 120 says `activity-log` without `.jsonl`, but the intent is the same file). The implementing agent may miss this because it is in a separate section from the ones called out.

Fix: Add a task bullet under refine-slices/SKILL.md for line 120: Replace the "Write activity-log" instruction in Cleanup on Interruption with a note that CLI manages activity recording, or remove the activity-log write entirely since interrupted/abandoned states are not tracked through CLI submit commands (the skill just stops without calling submit).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-slices/references/guidance.md task underspecified — lines 42-43 also have state.md/activity-log/formats.md references
The plan task says "Line 41: Replace `state.md` reference in graceful stop — stops leave artifacts, no state writes." But lines 42-43 also contain explicit state.md and activity-log references for stop cases (b) and (c): "load formats.md. State: ...", "Activity-log: ...". The task description implies only line 41 needs changing, but the entire Graceful Stop section (lines 41-43) needs updating to match the "stops leave artifacts, no state writes" pattern.

Fix: Expand the task to cover lines 41-43: "Lines 41-43: Replace entire Graceful Stop section — all 3 cases leave artifacts in place with no state writes and no activity-log appends. Remove formats.md references."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-plan guidance.md task list doesn't explicitly call out line 13 `__active__` reference
Line 13 of guidance.md contains `epics/__active__<name>/slices/sequencing.md` within the Context Loading section. The plan lists "Line 13: Replace `__active__` in context loading paths" which does cover it, but this is a different conceptual location than the scope resolution references. The line is long and contains multiple path references. This is already listed in the plan so it's just a clarity note — the implementing agent should be careful to catch all `__active__` occurrences within this dense line.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test step 8 uses `--inline` without `--json`
Step 8: `goodplan start-refine-slices --epic smoke --inline` — the research doc (line 87) shows the command as `goodplan start-refine-slices --epic <name> --inline --json`. The `--json` flag is missing from the smoke test. The other `start-*` commands in the smoke test (steps 11, 14, 17) also omit `--json`. This is likely intentional (checking human-readable output) but inconsistent with the research doc. If verification will parse the output, `--json` may be needed.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured and follows established migration patterns from slices 03-04. The iteration 1 fixes (quest scope handling, guidance.md expansions, graceful stop semantics, CLI error handling) are correctly incorporated. Module boundaries are respected — no CLI code changes, all modifications are prompt-level pattern replacements. The phasing (low-complexity first, high-complexity second, validation third) is sound and matches the dependency graph.

Two IMPORTANT issues prevent a 9: (1) the missed activity-log reference in refine-slices Cleanup on Interruption could cause a grep verification failure in Phase 3, and (2) the underspecified create-slices guidance.md task could leave state.md/activity-log references in place. Both are straightforward to fix.

What would bring it to 9+: Fix the two IMPORTANT issues to ensure complete coverage of all state.md/activity-log references across all files.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
