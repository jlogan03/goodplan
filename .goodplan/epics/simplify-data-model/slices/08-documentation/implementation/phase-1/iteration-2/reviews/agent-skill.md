# Agent Skill Review: start-epic SKILL.md Rewrite (Iteration 2)

## Issues

**[MINOR]** Context Discipline note is unusual for a non-orchestrator skill
The "Context Discipline" callout after the intro is a pattern used by orchestrator skills (create-epic, complete-epic, implement, plan-slice) to prevent orchestrators from reading artifact content into their context. Start-epic is not an orchestrator -- it has no sub-agents, no phase table, no context budget concerns. It legitimately needs to Read architecture files in Step 4 to present them to the user. The note ("This is a legitimate orchestrator exception") is confusing because start-epic is not an orchestrator in the first place -- there is no rule to make an exception from. Consider removing the Context Discipline callout entirely, or replacing it with a simpler note like: "This skill reads architecture files directly to present them for user review."
File: skills/start-epic/SKILL.md:14
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 4 derives architecture path manually instead of using CLI output
Step 4 says "use the `name` field to derive the path `.goodplan/epics/<name>/architecture/`". This works but couples the skill to the internal directory structure. The `epic:show --json` response includes an `artifacts` object -- if architecture file paths are available there or via a future CLI enhancement, the skill should prefer CLI-provided paths. This is a minor coupling concern, not a correctness issue. The current approach will work fine with the existing CLI.
File: skills/start-epic/SKILL.md:93
Resolution: DIRECTLY_ACTIONABLE

## Round 1 Fix Verification

All five issues from iteration 1 have been correctly addressed:

1. **`$GP` variable (IMPORTANT)** -- Fixed. All bash code blocks now use bare `gp`, consistent with other non-orchestrator skills (explore, status, task, upgrade). No `$GP` references remain.

2. **`test -f` guard contradicting intro (IMPORTANT)** -- Fixed. Step 3 now checks `artifacts.architectureDefined` from the `epic:show` JSON response (already fetched in Step 2), eliminating the direct filesystem check. The intro's claim of "no direct filesystem reads of state files" is now accurate. The Context Discipline note explicitly acknowledges that architecture file reads (Step 4) are legitimate since that is the skill's purpose.

3. **Version check logic (MINOR)** -- Fixed. Step 0 now includes explicit version comparison: "If the version does not satisfy `>= 1.0.0`, tell the user..." with a specific stop message including the found version. Matches the pattern in explore and status skills.

4. **Architecture loading ambiguity (MINOR)** -- Fixed. Step 4 now provides a concrete path derivation strategy ("use the `name` field to derive the path `.goodplan/epics/<name>/architecture/`") and specifies reading `_overview.md` first, then additional files. Clear enough for an agent to follow.

5. **Duplicate trigger phrase (MINOR)** -- Fixed. The description no longer contains duplicate 'start epic'. The trigger list is clean.

## Score: 9/10

The rewrite is clean, well-structured, and correctly addresses all round 1 feedback. The skill follows the non-orchestrator pattern consistently: bare `gp` CLI calls, no `$GP` variable, no sub-agents, no context discipline concerns. Status handling in Step 2 is comprehensive, covering all possible epic states including in-progress and terminal statuses with appropriate next-step guidance via `nextCommands`. The two remaining MINOR items are style/coupling preferences, not correctness issues. The skill is ready for use.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
