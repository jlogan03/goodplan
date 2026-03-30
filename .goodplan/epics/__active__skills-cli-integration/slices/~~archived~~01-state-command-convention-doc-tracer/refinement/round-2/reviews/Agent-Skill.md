# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** Phase 2 convention doc structure omits "Deriving Workflow Phase" availability caveat in task description

The plan's Phase 2 task list (section 7) says: "Deriving Workflow Phase — use `show --json` artifacts field. Mark this section with 'Available after slice 02'." This correctly identifies the deferral, and the round-1 I2 fix was applied. However, the convention doc's worked examples in the "Interaction Patterns by Skill Role" section (task item 5) include a `start-complete` example from the architecture source that depends on artifacts. The plan correctly flags `start-complete` as "not yet available" per round-1 I6, but the task description for section 5 does not instruct the implementer to verify which `start-*` commands actually exist before including them as worked examples. Only `start-plan`, `start-explore`, etc. should appear if they exist in the current CLI. Including non-existent commands in worked examples — even with a caveat — risks confusing agents who may try to run them.

Fix: Task item 5 should instruct the implementer to verify each `start-*` and `submit-*` command against `goodplan schema --json` (or `src/commands/main.ts`) before including it as a worked example. Only include commands that currently exist. For commands that are planned but not yet implemented, list them in a separate "Coming in future slices" subsection rather than inline with working examples.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 activity-log access pattern assumes knowledge of total array length

Phase 3 Step 4 says: "replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"]' --offset <len-5> --limit 5`". This requires the skill to know the total number of entries to compute `<len-5>`. But the skill has no way to know the array length before querying it. The plan notes jqjs negative indexing `.[-5:]` "may not be supported" and suggests offset/limit as "fallback," but offset/limit cannot replicate "last 5" without a prior length query.

Two viable approaches: (a) query the full array and let the agent take the last 5 entries from the result, or (b) use jqjs `.[-5:]` if supported (the jq research doc confirms slicing is supported in jqjs). The plan should commit to one approach rather than leaving the implementer to guess.

Fix: Commit to using `.["activity-log.jsonl"] | .[-5:]` as the primary approach (jqjs supports array slicing per the research doc). Add a note that if negative indexing fails at runtime, fall back to querying the full array and taking the tail. Remove the `--offset <len-5>` suggestion which is not implementable without a prior query.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 SKILL.md rewrite does not specify what happens to Step 10 ("Offer Detail")

The plan explicitly addresses removing Step 9 (state.md writeback, round-1 I3 fix applied). But Step 10 ("Want me to show the full activity-log or all slice statuses?") is not mentioned. After the rewrite, the agent would need to use CLI commands to fulfill this offer (e.g., `goodplan state --json --query '.["activity-log.jsonl"]'` for full activity log, `goodplan slice:list --json` for all statuses). The plan should specify whether Step 10 is kept (and if so, how the agent fulfills the offer) or removed.

Fix: Add a brief note to Phase 3 tasks specifying that Step 10 is kept with updated CLI-based data retrieval, or removed if the Format B reporting already covers the same ground.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention doc section 6 deprecation note scope is unclear

Phase 2 task item 6 says: "Add a deprecation note for `skills/_shared/references/state-and-activity-formats.md` — the state.md section is now obsolete; 12 skills reference this file." This correctly identifies the issue (round-1 M5), but does not clarify whether the deprecation note goes in the convention doc itself, in the `state-and-activity-formats.md` file, or both. Since 12 skills reference `state-and-activity-formats.md` directly, a deprecation note only in the convention doc would not be seen by those skills until they are rewritten.

Fix: Specify that the deprecation note should be added to `state-and-activity-formats.md` itself (at the top of the state.md section), with a pointer to `cli-interaction.md` as the replacement. The convention doc can also reference this deprecation for context.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 convention doc section 4 does not specify how to document `--inline[=<bytes>]` future form

The Expected Behavior says "Documents `start-*` always-JSON behavior and `--inline[=<bytes>]`" and the task mentions `--inline` explicitly. But the task description only references the boolean form. Since the convention doc will be the reference for all future skill authors, it should mention that `--inline` accepts an optional byte budget (e.g., `--inline=4096`) even though budget support is deferred. This prevents skill authors from being surprised when the budget form appears in a later slice.

Fix: Task item 8 should instruct documenting `--inline` with a note: "Currently accepts bare `--inline` (includes all markdown). A future slice will add `--inline=<bytes>` for budget-limited inclusion." This sets expectations without requiring implementation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were substantially addressed. The critical issue (C1: missing `requires` frontmatter, binary vs project detection separation) is now clearly specified in the plan's Phase 3 tasks. The convention doc reference (I8), Step 9 removal (I3), description update (I11), and `stdin: ""` documentation (I12) are all explicitly present. The remaining issues are lower severity — the activity-log access pattern (IMPORTANT) needs a concrete approach rather than an unresolvable suggestion, and the remaining items are polish. To reach 9+: commit to a concrete activity-log tail approach and clarify Step 10 disposition.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
