# Agent Skill Review — plan-slice SKILL.md (Iteration 2)

## Previous Iteration Fix Verification

1. **Description triggers overlap** (IMPORTANT) — Fixed. Description no longer contains "Combines the create-plan and refine-plan workflow" or bare "create and refine plan" triggers. Current triggers ("plan and refine a slice", "end-to-end plan creation", "orchestrated plan slice", "plan slice end-to-end", "pipeline plan slice") are sufficiently differentiated from the existing `/gp:create-plan` and `/gp:refine-plan` skills. Resolved.

2. **Stagnation logic inconsistency** (IMPORTANT) — Fixed. Lines 315-318 now correctly separate the conditions: stagnation checks `netScore === previous netScore` (exactly equal), reduction checks `netScore < previous netScore`. Each increments its own counter independently. The double-counting issue is resolved.

3. **Reviewer output writing step** (IMPORTANT) — Fixed. Step 4f-iii is now a discrete numbered step ("Write Reviewer Output") with clear instructions: "Write each reviewer's full return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool. Reviewers are read-only and cannot write files themselves — this step ensures their output is persisted for the synthesis agent." No longer buried in a sub-step. Resolved.

## Issues

**[IMPORTANT]** `reconsiderWhen` and `validUntil` fields do not yet exist in the CLI data model
Step 4b instructs the orchestrator to filter decisions by `reconsiderWhen` and learnings by `validUntil`. However, these fields are part of the *target* data model for this epic (defined in `epics/simplify-data-model/architecture/data-model-changes.md`) but have not been implemented yet. The current `DecisionEntry` schema (`src/schemas/records/decision.ts`) has no `reconsiderWhen` field. The current `LearningEntry` schema (`src/schemas/records/learning.ts`) has no `validUntil` field. The `ContextBundle` projections (`src/core/context/types.ts`) also lack these fields — `DecisionSummary` and `LearningSummary` do not include them. Running `gp decision:list --json` returns entries without `reconsiderWhen`. This means step 4b will always produce empty filter results and step 4c's "Active conditions to evaluate" section will always be empty until a later slice implements the schema changes. The skill should be explicit that this is a forward-looking feature and gracefully handle the missing fields rather than treating them as always-present.
File: skills/plan-slice/SKILL.md:170
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Add a note at the top of step 4b: "Note: `reconsiderWhen` (decisions) and `validUntil` (learnings) are planned fields — see `data-model-changes.md`. Until implemented, the filter will return empty results. The orchestrator should skip the condition-evaluation instructions in step 4c when no conditions are found." Alternatively, gate the filtering behind a check: "If the JSON entries contain a `reconsiderWhen` or `validUntil` field, filter for non-empty values. Otherwise, skip condition evaluation."

---

**[MINOR]** Context Discipline section omits "lightweight summary files" from allowed reads
The epic conventions (`architecture/conventions.md` lines 13-14) explicitly list "lightweight summary files when user-facing context is needed (re-entry summaries, error details from failed sub-agents)" as acceptable orchestrator reads. The SKILL.md's Context Discipline section (lines 19-24) lists CLI output, sub-agent returns, user Q&A, orchestrator-generated files, and temp directory paths — but "orchestrator-generated files" partially covers this. However, it could be clearer. The iteration 1 review flagged this (MINOR), and the current text at line 23 ("Orchestrator-generated files (Q&A output, re-entry summaries, error details from failed sub-agents)") now covers most cases by explicitly listing re-entry summaries and error details as parenthetical examples. This is adequate — the spirit of the convention is satisfied even if the exact phrasing differs.
File: skills/plan-slice/SKILL.md:23
Resolution: No action needed — already addressed in iteration 1 fix. Noting for completeness.

---

**[MINOR]** `submit-plan` command does not require stdin, but usage is now correct
Iteration 1 flagged the `echo '' |` prefix on the `submit-plan` command. The current SKILL.md (line 227) correctly shows `$GP submit-plan --slice $SLICE_NAME --json` without piped input, which matches the actual command implementation (`src/commands/subagent/submit-plan.ts` line 17: "No stdin content required (plan is already on disk)"). Resolved.
File: skills/plan-slice/SKILL.md:227
Resolution: No action needed — already fixed.

---

**[MINOR]** Cleanup step (4h) is now explicit
Iteration 1 flagged the ambiguous "may be cleaned up" language. The current SKILL.md (lines 354-358) now has clear directives: "On successful completion (no errors), delete the temp directory: `rm -rf $TMPDIR`. On any error, preserve it for debugging." Resolved.
File: skills/plan-slice/SKILL.md:354
Resolution: No action needed — already fixed.

---

**[MINOR]** `user-invocable: true` remains inconsistent with other skills
The frontmatter includes `user-invocable: true` (line 9), which no other skill in the repo uses (all 18 other skills omit it, relying on the default). The epic conventions document lists it as part of the pipeline skill structure, so this is intentional for the new pattern. Harmless, but worth noting the inconsistency.
File: skills/plan-slice/SKILL.md:9
Resolution: No action needed — intentional per epic conventions.

## Score: 9/10

All three IMPORTANT issues from iteration 1 are resolved. The description triggers are well-differentiated. The stagnation/reduction logic is correctly separated. The reviewer output writing step is a clear discrete step. The one remaining IMPORTANT issue is the `reconsiderWhen`/`validUntil` forward-reference — the skill references fields that don't exist in the current data model. This is a real concern for a PoC that will be executed before those schema changes ship. Adding a graceful-degradation note or conditional check would bring this to 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 4 (3 already resolved from iteration 1, 1 pre-existing harmless inconsistency)
