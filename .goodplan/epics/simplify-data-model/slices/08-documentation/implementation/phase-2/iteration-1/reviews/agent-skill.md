# Agent Skill Review: complete-epic/SKILL.md

Phase: Phase 2: Fix complete-epic Bugs

## Issues

**[CRITICAL]** epic:complete invocation missing required `--epic` flag
The CLI command `epic:complete` defines `epic` as a required flag argument (`required: true` in citty args at `src/commands/epic/complete.ts:28`). Step 7d pipes `epic` inside the stdin JSON payload without the `--epic` flag on the command line:
```
echo '{"epic":"<EPIC_NAME>","verificationResults":[<RESULTS>],"learnings":[<LEARNINGS>]}' | $GP epic:complete --json
```
Citty validates required args before `run()` executes, so this will fail with a missing-argument error before stdin is ever read. The correct invocation should use the `--epic` flag:
```
echo '{"verificationResults":[<RESULTS>],"learnings":[<LEARNINGS>]}' | $GP epic:complete --epic $EPIC_NAME --json
```
The payload description in the text below the command (lines 335-338) also needs updating to remove `epic` from the stdin schema and note it comes from `--epic` flag.
File: skills/complete-epic/SKILL.md:333
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Verification field name mismatch: `verification` vs `verifications`
Step 7a says "Extract the `verification` array from the response" but the epic entity schema (`src/schemas/entities/epic.ts:41`) uses `verifications` (plural). The `epic:show --json` output will have `verifications`, not `verification`. This will cause the orchestrator to extract `undefined` and fail silently or error. Also appears in Step 4e's task prompt: "each criterion in the epic's `verification` array" should be `verifications`.
File: skills/complete-epic/SKILL.md:275
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Verification entry field names incorrect in Step 7a
Step 7a states: "Each entry has an `index`, `criterion`, and `addedDuring` field." The actual `verificationSchema` fields are `description`, `status`, `addedDuring`, and `modifiedDuring`. There is no `index` field (index is the array position) and no `criterion` field (it is `description`). This will mislead the orchestrator into extracting non-existent fields.
File: skills/complete-epic/SKILL.md:275
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 7a instruction to "independently verify" is vague
Step 7a says "the orchestrator must independently verify these criteria" but then immediately uses the completion-epic agent's `verificationAssessments` to construct the results. There is no independent verification step — the orchestrator just passes through the agent's assessments. The sentence creates confusion about whether the orchestrator should do its own verification or rely on the agent. Either remove the "independently verify" claim (since it just uses agent results) or specify what independent verification means.
File: skills/complete-epic/SKILL.md:265
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 4e task prompt references `verification` array without explaining how agent accesses it
The task prompt tells the agent to "assess the epic's verification criteria" and evaluate "each criterion in the epic's `verification` array" but doesn't provide the verification criteria as input data or tell the agent which file/command to use to obtain them. The agent has Read/Grep/Glob but not Bash, so it cannot run `gp epic:show --json`. Either the orchestrator should pass the verification criteria in the task prompt (from the `epic:show` output obtained during scope resolution), or the agent needs Bash in its allowed tools.
File: skills/complete-epic/SKILL.md:155
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The core changes (verification assessment, quest creation via stdin, learnings rollup) are well-structured and address real gaps. However, the `--epic` flag omission is a runtime failure that blocks the primary workflow, and the field name mismatches (`verification` vs `verifications`, `criterion` vs `description`) will cause incorrect data extraction. Fixing these three issues would bring the score to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 2
