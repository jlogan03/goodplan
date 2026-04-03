# TUI and CLI Reviewer — Round 6

## Issues

**[IMPORTANT]** `schema.ts` registry for `start-explore` and `submit-explore` not updated in task list

Phase 1 tasks correctly specify updating the actual command files (`start-explore.ts`, `submit-explore.ts`) to add `--quest` with mutual exclusivity. However, the `schema.ts` `registerCommand()` calls for these two commands (lines 421-425 and 467-469) still register `epic` as `required: true` with no `quest` arg. The plan's Phase 1 task list mentions updating `schema.ts` only in the context of `quest:plan` description text, but does not include a task to update the `registerCommand("start-explore", ...)` and `registerCommand("submit-explore", ...)` entries to: (a) change `epic` from `required: true` to `required: false`, (b) add `quest` arg with `required: false`, and (c) update the description to mention `--epic or --quest`. Without this, INV-006 is violated -- the schema output will not reflect the actual command signatures.

Resolution: DIRECTLY_ACTIONABLE

Add an explicit task to Phase 1 Sub-phase A: "Update `registerCommand('start-explore', ...)` and `registerCommand('submit-explore', ...)` in `src/commands/global/schema.ts`: change `epic` arg from `required: true` to `required: false`, add `quest` arg (`type: 'string', description: 'Quest name', required: false`), update descriptions to reflect mutual exclusivity. This maintains INV-006."

---

**[MINOR]** Exit code conventions not referenced for new CLI commands

Phase 1 adds new state events (`BEGIN_QUEST_EXPLORE`, `COMPLETE_QUEST_EXPLORE`) that can produce guard failures (e.g., invalid status transitions). The plan references INV-007 in Phase 2 (audit skill error handling) but does not explicitly reference exit code conventions (0/1/2/3 per INV-007) in Phase 1's CLI prerequisite work. The existing pattern in the codebase handles this automatically via `GoodplanError` propagation, so this is unlikely to cause a bug, but a brief note confirming reliance on the existing error propagation pattern would strengthen the plan's completeness.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `--mode` flag parsing ambiguity in init skill description

Phase 3 notes that `--mode` is "parsed from the user's invocation text (e.g., `/gp:init --mode new`), not from formal CLI flags -- skills receive context from natural language." This is correct but could confuse an implementer into building fragile regex parsing. The plan should note the recommended parsing approach: check if the user's prompt text contains `--mode new` or `--mode onboard` using simple string matching, following the pattern used by other skills for argument extraction from natural language invocation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is well-structured for CLI correctness. Both IMPORTANT items from round 5 (quest-plan.ts guard update and start-explore/submit-explore arg changes) have been addressed with specific file paths, function names, and change descriptions. The one remaining IMPORTANT issue is a straightforward INV-006 compliance gap in `schema.ts` that the round-5 fix for the command files themselves did not cover. The two MINOR items are polish -- the plan already handles them implicitly through established patterns but would benefit from brief explicit notes.

To reach 10: add the `schema.ts` registerCommand update task to Phase 1.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
