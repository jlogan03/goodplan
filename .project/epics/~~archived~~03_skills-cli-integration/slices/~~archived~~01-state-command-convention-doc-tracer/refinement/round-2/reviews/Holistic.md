# Holistic Review (Round 2) — State Command, Convention Doc & Tracer Bullet

## Issues

**[IMPORTANT]** Test file naming inconsistent with codebase convention

The plan creates `tests/unit/commands/state-command.test.ts` and `tests/integration/state-command.test.ts`. Existing unit test files use the pattern `<command>.test.ts` without the `-command` suffix: `status.test.ts`, `init.test.ts`, `schema.test.ts`. Integration tests use descriptive names like `workflow-init.test.ts`, `smoke.test.ts`. The unit test should be `state.test.ts` (matching the existing pattern). The integration test naming is more flexible, but `state-command.test.ts` is acceptable there since integration tests don't follow the same strict pattern. However, the plan's Expected Behavior and Tasks sections both reference `state-command.test.ts` for the unit test — this should be `state.test.ts` for consistency.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 bare `state` (no `--json`) behavior conflicts with `output()` default path

The plan says: "Bare `state` (no `--json`): Always output JSON (use `deterministicStringify` with indentation). The `state` command is LLM-facing; there is no human-readable format." However, the implementation approach described has the state command calling `output()` for the non-query path. The `output()` function (in `src/util/output.ts`) treats data as a pre-formatted string when `args.json` is false — it does `typeof data === "string" ? data : deterministicStringify(data)`. So passing the serialized state tree object through `output()` without `--json` would actually produce JSON via the fallback `deterministicStringify()` path — but this is an accident of the fallback, not explicit design. The plan should specify that the state command always sets `json: true` internally (or bypasses `output()` and writes directly), so the JSON output behavior is intentional rather than depending on a fallback code path. This matters because the `--quiet` flag would suppress all output if someone passes `state --quiet`, which is probably wrong for an always-JSON command.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 activity-log pagination uses `--offset` but doesn't know total length

The plan says: "replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"]' --offset <len-5> --limit 5`". This requires knowing the total length of the activity log to compute `<len-5>`. The plan doesn't specify how to obtain this length. Options: (a) first query the length with `--query '.["activity-log.jsonl"] | length'`, then compute offset — two commands instead of one; (b) use jqjs negative array slicing `'.["activity-log.jsonl"][-5:]'` if supported; (c) query the full array and let the LLM take the last 5. The plan notes that "jqjs negative array indexing `.[-5:]` may not be supported" but doesn't resolve the approach. The implementer needs a concrete directive — the two-command approach (query length, then query with offset) is most reliable and should be specified.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification step 9 performance assertion is untestable as written

Verification step 9 says "jqjs performance: all queries above complete in < 1s on the goodplan repo state tree." This is a subjective observation, not a runnable check. It should either be dropped (it's unlikely to be a problem for a small state tree) or converted into a formal benchmark test in the test suite. As a verification step, it adds no value — the implementer will notice if a query takes more than a second.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 convention doc section 4 notes `start-complete` does not exist but the code confirms no such command

The plan says: "Note: `start-complete` does not exist as a command — omit from examples or explicitly mark as 'not yet available'." This is correct (confirmed: no `start-complete` in the codebase). However, this note is embedded in a task description rather than being a standalone task. If the implementer misses it, the convention doc might include a non-existent command. Consider promoting this to a bullet point within the task rather than an inline note.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "before" check for `--version --json` uses wrong expected output

The "before" check says: `goodplan --version --json` — prints `goodplan 0.0.1\n` (plain text, ignores `--json`). Looking at the actual code in `src/index.ts` line 62, the output is `"goodplan 0.0.1\n"`. The backslash-n is literal in the source (template string), so the actual output would be `goodplan 0.0.1` followed by a newline. The "before" description is technically correct but could be clearer — it says "prints `goodplan 0.0.1\n`" with the `\n` visible, which might confuse the implementer into thinking the literal characters `\n` appear in output. Minor, but precision in expected behavior matters.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 task list doesn't include a task for reviewing existing skills that reference `state-and-activity-formats.md`

Round 1 flagged the partial obsolescence of `state-and-activity-formats.md`. The updated plan includes a deprecation note in Phase 2 section 6, which addresses the round-1 concern. However, Phase 2's task list has a "Verify convention doc completeness" task but no explicit task for adding the deprecation note to `state-and-activity-formats.md` itself. The deprecation note is only mentioned as a sub-bullet of section 6 content. The implementer might write the convention doc's text about deprecation but forget to actually modify `state-and-activity-formats.md`. Add an explicit task: "Add deprecation note to `skills/_shared/references/state-and-activity-formats.md` — mark the state.md section as obsolete, reference `cli-interaction.md` as replacement."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has improved significantly from round 1. All four IMPORTANT issues from round 1 were addressed: pagination is consolidated into the state command task with a clear manual approach, Phase 3 step 9 elimination is explicit, `show --json` artifacts dependency is marked as deferred, and Format B data requirements now specify `slice:list`/`quest:list`/`epic:list` usage. The remaining issues are mostly about implementation clarity (test naming, bare-state output behavior, activity-log tail approach) rather than structural problems. Resolving the three IMPORTANT items and four MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
