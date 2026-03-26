# TUI-CLI Review — Round 2

## Issues

**[MINOR] Bare `state` behavior description could be more explicit in Expected Behavior section**
The task list now correctly specifies "Always output JSON (use `deterministicStringify` with indentation). The `state` command is LLM-facing; there is no human-readable format." However, the Expected Behavior section only shows `goodplan state --json` examples. There is no "After implementation" item verifying that `goodplan state` (without `--json`) also outputs valid JSON. Adding one Expected Behavior line like "`goodplan state` (no `--json`) -- returns complete state tree as JSON (same as `--json`)" would make the behavior fully testable and prevent ambiguity for the implementer.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Verification step 9 jqjs performance threshold lacks measurement method**
Verification step 9 says "jqjs performance: all queries above complete in < 1s on the goodplan repo state tree." This is a reasonable constraint, but the plan does not specify how to measure it. Neither the unit tests nor integration tests include timing assertions. Since this is a verification step (not a task), the implementer may skip it or measure inconsistently. Suggest: add a comment that this is a manual spot-check during verification, not an automated test, or add a simple `console.time`/`console.timeEnd` wrapper in the integration test for the most complex query.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 Step 4 activity-log retrieval still shows jqjs negative indexing as primary approach**
The plan says: "replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"]' --offset <len-5> --limit 5` (use `--offset`/`--limit` as fallback since jqjs negative array indexing `.[-5:]` may not be supported)." This is good -- it acknowledges the risk and provides the offset/limit fallback. However, the phrasing "as fallback" implies trying `.[-5:]` first, which would cause a runtime error if unsupported. The skill rewrite should use `--offset`/`--limit` as the primary approach and note that `.[-5:]` can be used if confirmed working. This is a minor wording issue -- the implementer will likely figure this out, but clearer phrasing avoids a trial-and-error cycle.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 IMPORTANT and CRITICAL issues from the TUI-CLI perspective have been resolved:

- **Pagination strategy (I1)**: Now clearly specified -- call `applyQuery()` directly when `--query` is present, apply `Array.slice()`, write via `deterministicStringify()`. Consolidated into a single task with a clear "Pagination approach (consolidated)" subsection.
- **`--inline` flag handling (I4)**: Now uses `parseInlineBudget` with explicit coercion to boolean: `const inline = parseInlineBudget(args.inline) !== undefined`. Budget support explicitly marked as deferred.
- **Bare `goodplan state` (I5)**: Now specifies always-JSON output with `deterministicStringify`.
- **Test file naming (M6)**: Now uses `state-command.test.ts` matching the existing pattern.
- **jqjs negative indexing risk (M11)**: Now acknowledged with `--offset`/`--limit` fallback.
- **Convention doc migration table labeling (M7)**: Now labeled as "Migration Reference" with note for new skill authors.
- **Schema registry ArgDefinitions (C2)**: Explicit `ArgDefinition` entries for `inline`, `offset`, `limit` now specified in the task.
- **Version source of truth (I10)**: Now specifies importing from `package.json` or defining a `const VERSION`.

The remaining issues are all MINOR and relate to spec precision rather than correctness or usability gaps. The plan is implementable as-is.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
