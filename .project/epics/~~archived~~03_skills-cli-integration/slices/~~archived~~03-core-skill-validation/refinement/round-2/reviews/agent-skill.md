## Issues

**[IMPORTANT]** Phase 3 end-to-end smoke test scope is unclear for skill invocation
The plan adds an end-to-end smoke test (Phase 3 task): "run `goodplan init`, `epic:create`, create a slice, advance through implementation, then invoke the migrated `/complete` skill." Skills are invoked by users typing natural language that triggers the skill description match. The smoke test should clarify what "invoke the migrated `/complete` skill" means operationally: either (a) manually execute the steps listed in the SKILL.md against a real CLI project (tracing each CLI command), or (b) trigger the skill via Claude Code in a test project. Option (a) is more reliable and doesn't require a running agent. The plan's current wording "If full automation is infeasible, run the actual CLI commands manually" partially addresses this but should be the primary approach, not the fallback. Reword the task to make manual CLI command execution the primary verification method, with skill invocation as optional bonus verification.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Convention doc worked example fix (Phase 3) only addresses `start-complete` but not `start-explore`
Phase 3 includes a task to fix the `cli-interaction-conventions.md` worked example that references the non-existent `start-complete` command. However, the same convention doc (line 184) also shows `goodplan start-explore --epic my-epic --inline --json` in the explore orchestrator worked example. If `start-explore` also does not exist, both worked examples need correction. The plan should expand the Phase 3 fix task to audit all worked examples in the convention doc for non-existent commands, not just the `start-complete` one.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Phase 2 Step 6d Signal Tracking uses a jq query that may not work with `state --json --query`
Step 6d replaces direct `activity-log.jsonl` reads with `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete")]'`. The `state --json --query` feature was added in slice 01, but the plan does not verify that (a) the jq syntax is compatible with the query engine used by the CLI, and (b) the activity-log entries actually have a `phase` field with value `"complete"`. The cli-schemas.md research file does not cover the activity-log entry schema. Add a task early in Phase 2 to verify the query works: `goodplan state --json --query '.["activity-log.jsonl"][0]'` to inspect entry shape, then refine the filter query accordingly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Mode A flow specifies writing `idea.md` to a deterministic path but does not explain how to derive it
The plan says: "Write `idea.md` to `.project/idea.md` (LLM-owned markdown, path is deterministic after init)." This is correct — `idea.md` always lives at `.project/idea.md`. However, `goal.md` is written "to path from `epic:create` response" — the plan correctly uses the CLI response for `goal.md` but hardcodes the path for `idea.md`. This inconsistency is minor since `idea.md` truly is always at `.project/idea.md`, but the plan should note this is a known fixed path (not derived from CLI response) to avoid confusion about when to use CLI-provided paths vs known paths.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 re-entry detection uses `stat <slice-dir>/completion/learnings.md` but does not specify error handling
The plan says "re-entry detection must use `stat <slice-dir>/completion/learnings.md` (legitimate directory-structure read)." If the file does not exist, `stat` returns a non-zero exit code. The skill should treat this as "no prior completion attempt" (fresh run). The plan should specify: "If `stat` fails (file not found), proceed with fresh completion. If it succeeds, offer to resume from the last completed step."
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all critical issues from round 1 comprehensively. The `epic:complete` payload shape is now clearly distinguished from `slice:complete`. The archive step is correctly retained as skill-owned. The `learning:rollup` redundancy is eliminated. The filesystem-backed accumulation paths are specified. The remaining issues are important but not blocking: the smoke test wording could be clearer, the convention doc fix should be broader, and the jq query compatibility should be verified. To reach 9+: make the smoke test primary approach explicit (manual CLI traces), expand the convention doc audit scope, and add a query verification task for `state --json --query`.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
