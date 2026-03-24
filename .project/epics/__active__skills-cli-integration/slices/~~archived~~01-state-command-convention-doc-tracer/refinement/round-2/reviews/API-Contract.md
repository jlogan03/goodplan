## Issues

**[IMPORTANT] State command output contract: bare `state` (no `--json`) always outputs JSON but bypasses `output()` conventions**

Phase 1 says: "Bare `state` (no `--json`): Always output JSON (use `deterministicStringify` with indentation). The `state` command is LLM-facing; there is no human-readable format." This means `state` is the only command where the default (no `--json`) behavior produces JSON. Every other command uses `output()` which, without `--json`, either produces human-readable text or treats data as a pre-formatted string. This creates an inconsistency in the public API contract: callers cannot assume "no `--json` = human-readable" across all commands.

The plan should either: (a) document this as an explicit exception in the convention doc (Phase 2) so skills know `state` always returns JSON regardless of `--json`, or (b) require `--json` and produce a helpful error message if omitted (like "the state command requires --json"). Option (a) is simpler and already implied; just make it explicit in the convention doc task list.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Pagination semantic ambiguity when `applyQuery()` returns a single result that is itself an array**

The plan says: "if result is an array and `--offset`/`--limit` are set, apply `Array.slice(offset, offset + limit)`." The `applyQuery()` function returns the raw value for single results. If a jq expression produces a single result that happens to be an array (e.g., `.["activity-log.jsonl"]` returns the entire JSONL array as one result), pagination applies. But if the expression produces multiple scalar results (which `applyQuery()` wraps in an array), pagination also applies. The plan acknowledges this ("pagination applies to any array result regardless of origin") but does not address the edge case where the user queries for multiple results and gets unexpected pagination.

This is acceptable for now since the plan's comment acknowledges it, but the convention doc (Phase 2) should document this behavior explicitly: `--offset`/`--limit` apply to any array-valued result, whether the array came from the data or from jq producing multiple outputs. Add a note to Phase 2's task list item for the "Deep Dives" section.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `--version --json` output contract not registered in schema command**

The plan adds `--version --json` handling in `src/index.ts` (before command dispatch), but does not register it in the command registry (`schema.ts`). This means `goodplan schema --json` will not advertise the `--version --json` capability. Skills checking version compatibility via `goodplan schema --json` won't discover this endpoint. The convention doc (Phase 2) documents it manually, which is sufficient for now, but the schema registry gap should be acknowledged.

Add a comment in the `--version --json` task noting that `--version` is handled pre-dispatch (not a subcommand) and therefore outside the schema registry. This is a known limitation, not a bug.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `state` command test file naming inconsistency with plan**

The plan's task list references `tests/unit/commands/state-command.test.ts` and `tests/integration/state-command.test.ts`, but the codebase context research file (section 7) lists them as `tests/unit/commands/state.test.ts` and `tests/integration/state.test.ts`. The existing pattern uses the command name directly (e.g., `status.test.ts` not `status-command.test.ts`). The Expected Behavior section uses `state-command.test.ts`. Pick one and be consistent -- recommend `state-command.test.ts` since the plan already uses it in Expected Behavior, or `state.test.ts` to match the existing `status.test.ts` pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Convention doc Phase 2: `start-complete` referenced in architecture spec but plan says to omit**

The plan correctly notes "`start-complete` does not exist as a command -- omit from examples or explicitly mark as 'not yet available'." This is good. However, the convention doc should also note that `slice:complete` and `quest:complete` require stdin payloads (verification results, learnings, etc.) -- the worked example in the architecture spec's `cli-interaction-conventions.md` already covers this, but Phase 2's task list should ensure the convention doc includes the complete payload shape for completion commands since skills will need to construct these payloads.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 activity-log pagination assumes knowledge of array length**

Phase 3 says: "replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"]' --offset <len-5> --limit 5`." This requires the skill to first query the array length to compute `<len-5>`. The plan acknowledges jqjs negative indexing `.[-5:]` may not be supported but doesn't provide a fallback for discovering the length. The skill would need a two-step process: (1) query length with `.["activity-log.jsonl"] | length`, (2) compute offset, (3) query with offset/limit.

The jqjs research confirms it supports most core jq features including array slicing. The plan should either verify `.[-5:]` works in jqjs during Phase 1 verification (step 9 mentions performance but not negative indexing), or document the two-step fallback explicitly in Phase 3's task list.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan's API contract design is solid -- unwrapped serialization, consistent error shapes, clear pagination semantics, and proper separation between read-only and mutation paths. The main gaps are documentation-level: the `state` command's always-JSON behavior needs to be called out as an explicit exception, the pagination behavior for array results should be documented in the convention doc, and the `--version --json` schema gap should be acknowledged. All issues are directly actionable and none require architectural changes. Bringing this to 9+ requires explicitly documenting the `state` command's unique output behavior and ensuring the convention doc covers pagination semantics.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
