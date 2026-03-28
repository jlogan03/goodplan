# Holistic Review (Round 2) -- audit-docs-and-tests

## Issues

**[IMPORTANT]** Graceful Stop lacks per-step detail compared to audit-architecture pattern
The audit-architecture skill's Graceful Stop (Step 6) has detailed per-step markers specifying exactly what to write for interruptions during gap analysis, reassessment, fitness audit, invariant check, maturity review, quest proposal, and project-health refresh. Both audit-docs (Step 8) and audit-tests (Step 9) simply say "write partial report with `<!-- partial -- interrupted during <step>` marker." This is underspecified -- the implementer must decide which steps get which markers and what completed data to include. At minimum, list the steps that should produce partial markers (e.g., "during doc discovery," "during reviewer execution," "during fix classification," "during report writing"). Without this, interruption during Step 4 (spawning sub-agents) might leave orphaned agents or lost findings with no guidance on what to persist.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** audit-tests Step 6 (Propose Side Quest) occurs before the audit report (Step 7)
In audit-architecture, the pattern is: findings -> side quest proposals (Step 4) -> audit report (Step 5) -> health refresh (Step 5b). Both audit-docs and audit-architecture write side quest proposals before the audit report, which is correct -- the report documents what quests were created. However, audit-tests Step 6 proposes a side quest, then Step 7 writes the audit report. This ordering is fine logically, but the audit report template references "side quests created" -- make sure the audit report task for audit-tests explicitly includes documenting the quest created in Step 6. Currently Step 7 just says "following audit-architecture report format" which implicitly covers this, but it would be clearer to state it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** audit-docs Step 5 auto-fix flow needs user confirmation for batch approval but plan says "do NOT auto-fix without approval"
Step 5 describes a batch-approval flow where trivial fixes are presented via `AskUserQuestion`. The plan correctly says "do NOT auto-fix without approval." However, the task description says "batches trivial fixes for user approval, confirms large changes" (overview) but in Step 5, the phrasing "batch and present via `AskUserQuestion` ('Apply these N trivial fixes?')" suggests a single yes/no for the entire batch. This is fine, but there's no guidance on what happens if the user says "no" to the batch -- does it skip all, allow individual selection, or defer to a side quest? Add a brief note on the rejection path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Both skills omit scope resolution (epic vs project) from context loading
The audit-architecture skill resolves scope in Step 1a (active epic vs project-level) which affects where architecture files are read from. The new skills' Step 1 loads learnings, conventions, activity-log, expertise, and resume detection -- but doesn't mention scope resolution. For audit-docs, this matters because documentation may be epic-scoped (epic architecture files). For audit-tests, this is less critical since tests aren't typically epic-scoped. Consider adding a brief scope note to audit-docs Step 1, even if the answer is "always operates project-wide."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** audit-docs Step 1 sub-step 3 uses `goodplan state --json --query` but doesn't specify the jq filter
The audit-architecture skill specifies an exact jq filter for activity-log loading (scoped by `$FLOW_SCOPE`). The plan for both new skills just says "Load recent activity-log via `goodplan state --json --query`" without specifying the filter. An implementer won't know what to query. Either provide the filter or at minimum say "filter for recent entries" with enough specificity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase-level Expected Behavior could include a negative test for non-existent repos
Both phases verify the skill works on the goodplan repo. Neither verifies graceful failure when run on a repo with no documentation/tests. This would catch edge cases early. Not critical for a first version, but worth noting.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has substantially improved from round 1. All critical issues from round 1 have been resolved: `install-skills.sh` registration is now included, the side quest mechanism uses `quest:create` with explicit justification for the modernization, and all audit-architecture pattern steps (context loading, graceful stop, audit report, project health, expertise check) are now present. The remaining issues are about specificity within already-present steps rather than missing structure. Bringing the graceful stop detail up to audit-architecture level and clarifying the few underspecified areas would reach 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
