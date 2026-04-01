# Tracer Bullet Quality Review

## Issues

**[CRITICAL]** `goal-refining.md [02-plan-slice-poc]`: Orchestrator context discipline verification relies on manual log inspection with no concrete criteria
The verification says "Inspect orchestrator log -- no Read calls on architecture files, plans, or source code (only CLI queries and sub-agent spawns)" but does not specify how to detect this programmatically. The expanded verification paragraph repeats "Review the test log to confirm the orchestrator never made Read calls on full artifacts" without defining what constitutes a violation (e.g., a regex pattern, a tool-call name filter, an artifact path pattern). The existing `validate.ts` harness already has a `checkViolation()` function that pattern-matches tool calls -- this slice should produce an equivalent automated check in the test harness, not leave it as manual inspection. Without automation, this verification will be skipped or done inconsistently, and the core orchestrator discipline property goes unvalidated.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [01-test-harness]`: `verifyEntityStatus()` verification step is vague about what "correctly asserts entity status" means
The verification says "Run a harness script against a minimal fixture -- `verifyEntityStatus()` correctly reports the entity's post-run status." This does not specify what entity, what skill to run, what status to expect, or what failure looks like. Compare with the first verification step which concretely names the script, the expected behavior (simulated responses in logs vs. "Proceed"), and how to observe success. The `verifyEntityStatus()` check should specify: run `test-plugin-skills.ts` (or a new minimal test), invoke `/gp:project-status`, assert status field equals a specific value.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [03-data-model]`: Overview consolidation produces large unexercised infrastructure
The overview consolidation (behaviors 5-9) restructures how quests and tasks are stored and read, requiring changes to `assembleState()`, `commitState()`, schema registry, and ~8 commands. However, the verification only exercises `quest:list` and `task:list`. It does not exercise `quest:create`, `task:create`, `quest:show`, `task:show`, or the full `assembleState()` -> `reduce()` -> `commitState()` roundtrip through the new path. The existing integration tests (`workflow-quest.test.ts`, `task-list.test.ts`, etc.) would catch regressions IF they are updated, but the verification section says "Run `bun test`" generically rather than calling out which specific tests validate the new path. A tracer bullet should name the exact integration test files that exercise the new overview path end-to-end.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [05-implement-pipeline]`: Re-entry verification via "commit history" is described but not concretely exercisable
The verification says "Re-entry test: start implement, interrupt after phase 1 of the plan, re-invoke -- skill detects completed phases via commit history and resumes from next incomplete phase." This is the right behavior to verify, but the test harness has no mechanism to interrupt mid-run and re-invoke. The existing Agent SDK `query()` API runs to completion. The test would need to either: (a) create a fixture with pre-existing commits simulating a partial run, then invoke implement to test resume, or (b) use a custom `canUseTool` interceptor to abort after a specific phase. The verification should specify which approach will be used -- otherwise this test is aspirational but unimplementable.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [04-create-epic-pipeline]`: Re-entry test describes interruption but no mechanism
Same pattern as slice 05. The verification says "start create-epic, interrupt after phase 2 (explore), re-invoke" but does not explain how to interrupt an Agent SDK `query()` session mid-flight. The existing harness scripts all run to completion. The test should either pre-populate a fixture at the "explore-complete" status and invoke the skill to verify it picks up at architecture Q&A, or document a specific test harness extension for mid-run interruption. Without this, re-entry testing is unverifiable.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [07-quality-validation]`: Quality assertions are subjective with no automated threshold
The verification lists qualitative checks: "Architecture files have substantive content (not boilerplate)", "Reviews identify real issues (not generic platitudes)", "Completion synthesizes meaningful learnings." These are important quality gates but are not automatable or repeatable. The slice should define concrete proxy metrics: minimum character count for architecture descriptions, presence of specific structural elements (subsystem names matching fixture code), review outputs containing at least one IMPORTANT/CRITICAL issue. Without measurable thresholds, "quality validation" becomes a subjective judgment call that varies between runs.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [06-remaining-skills]`: Deleted skill name collision test is described in prose but not in verification checklist
The expanded verification says "Verify that invoking a deleted skill name (e.g., `/gp:create-plan`) does not match" but this is not in the checkbox list. It should be an explicit verification step since skill name collisions would be a regression.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [08-documentation]`: Verification uses raw `grep` instead of the project's test infrastructure
The verification step runs `grep -r "create-plan|refine-plan|..." --include="*.md" .` as a manual command. Since this is the only slice that uses raw grep for verification instead of the test harness or CLI, it would be more consistent (and repeatable) to add this as a fitness test (e.g., `tests/fitness/stale-skill-references.test.ts`) that can be run with `bun test`. This also prevents the check from being forgotten after the initial pass.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [01-test-harness]`: Network disconnection fallback test is not practically executable in CI or harness
The verification says "Disconnect network briefly during a test -- simulated response falls back to first option with a warning in the log." This requires physical network manipulation and cannot be automated in the Agent SDK harness. The fallback should instead be tested by mocking the API client to throw a connection error, or by pointing to an invalid API endpoint. The current wording suggests a manual test that will be skipped.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The slices have good structural design -- each produces runnable artifacts, and the sequencing correctly builds from simpler to more complex pipelines. However, verification quality is the weakest aspect across nearly all slices. Multiple verification steps describe what to check but not how to check it concretely (re-entry testing with no interruption mechanism, quality assertions with no measurable thresholds, manual log inspection instead of automated checks). The orchestrator context discipline -- arguably the most architecturally important property -- is left as manual log inspection despite existing infrastructure (`checkViolation()` in validate.ts) that could be adapted.

To reach 9+: (1) Define concrete, automatable verification for re-entry testing in slices 04 and 05 (pre-populated fixture approach). (2) Add automated orchestrator discipline checking to the test harness in slice 01 or 02 instead of manual log inspection. (3) Make quality validation (slice 07) thresholds measurable. (4) Specify which existing integration tests validate the overview consolidation path in slice 03.

## Summary
- Critical: 1
- Important: 5
- Minor: 3
