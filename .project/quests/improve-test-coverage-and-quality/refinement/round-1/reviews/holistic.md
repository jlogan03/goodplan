## Issues

**[IMPORTANT]** Phase 3 fixture task incorrectly targets pre-CLI fixtures
The task "Add `tasks/overview.json` to all test fixtures" says to update every fixture directory with a `.project/` directory, explicitly listing `fresh-init`, `epic-created`, `epic-activated`, `slice-in-progress`, `slice-refining-max-rounds`, and "any others with `.project/`." However, `pre-cli-project` and `learnings-migration` are pre-CLI format fixtures (they have `state.md` instead of `project.json`, no `decisions.jsonl`, no `quests/` directory). These are used by migration tests and intentionally represent pre-migration state. Adding `tasks/overview.json` to them would corrupt their purpose — the migration code needs to handle the absence of modern entities. The task should explicitly exclude `pre-cli-project` and `learnings-migration` from the fixture update list.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 task omits `_overview.md` update but verification requires it
Phase 4 verification says: "`_overview.md` fitness function listings are accurate." But the tasks only mention updating `commands-api.md` and `rpc-layer-api.md`. The `_overview.md` subsystem maturity table has a "Fitness Functions" column that lists specific test file paths per subsystem. Currently the RPC Layer row shows `—` (no fitness functions) and the Commands row lists two files. After adding the new fitness functions, the `_overview.md` table needs updating: the structured-errors test should be referenced in Commands (or system-wide), and the mutation-through-state-machine test in the RPC Layer row. Add an explicit task to update the `_overview.md` fitness function column.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 helpers.ts test scope could mention getter/lookup helpers
The plan covers `evaluateRefinement`, guards, `processLearnings`, `appendActivityLog`, and status setters — these are the highest-risk functions. However, `helpers.ts` also exports 10+ getter/lookup functions (`getEpic`, `getSlice`, `getQuest`, `getTask`, `getProject`) and builder functions (`buildInitialQuestJson`, `buildInitialEpicJson`, `createEpicSubdirectories`, `addEpicToOverview`, `addSliceToOverview`, `addQuestToOverview`). While these are simpler and lower-risk, the plan should acknowledge this is a partial coverage choice (e.g., "covers highest-risk functions; getter/builder functions are tested indirectly through transition handler tests") so the implementer doesn't wonder whether they were missed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 structured-errors fitness function scope is vague on "representative set"
The task says "For a representative set of errors (at least one per exit code)." This is ambiguous — the implementer must decide which errors to test. A clearer specification would list specific error codes to test (e.g., one VALIDATION_* for exit 2, one STATE_* for exit 3, one INTERNAL_* for exit 1) or say "all error codes" if that's the intent. Given this is a fitness function (meant to catch regressions), testing all error codes would be more robust, but the plan should be explicit about which approach to take.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good expected behavior sections, and correct technical approach. The two IMPORTANT issues are real risks: incorrectly modifying pre-CLI fixtures would break migration tests, and the `_overview.md` omission means the verification criterion can't be met without an unlisted task. To reach 9+: fix the fixture exclusion list, add the `_overview.md` update task, clarify the partial coverage choice for helpers.ts, and specify the structured-errors test scope.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
