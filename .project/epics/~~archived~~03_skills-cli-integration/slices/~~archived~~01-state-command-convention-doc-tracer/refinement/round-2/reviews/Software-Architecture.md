# Software Architecture Review — Round 2

## Issues

**[IMPORTANT]** Phase 3 Step 4 activity-log query requires knowing total length for offset calculation

Phase 3 replaces `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"]' --offset <len-5> --limit 5`. This requires the skill to know the total number of activity-log entries to compute `<len-5>`. The plan does not specify how the skill obtains the total count. Options:

1. First query `goodplan state --json --query '.["activity-log.jsonl"] | length'` to get the count, then compute offset = count - 5, then query with `--offset` and `--limit`. This requires two CLI invocations.
2. Use jqjs negative indexing `.[-5:]` — but the plan itself notes this may not be supported and marks it as a risk (M11 from round 1).
3. Use a large offset with no limit and let the result be the last entries — but this doesn't work since `--offset` skips from the beginning.

The plan should commit to one approach. Option 1 (two-step query) is the safest and most explicit. If the plan wants to avoid two invocations, it should confirm jqjs supports `.[-5:]` via a quick test during Phase 1 implementation and document the fallback.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention doc `--inline` interaction with `state` command semantics needs precise specification

The plan says `--inline` changes markdown serialization from `true` to raw string content. The convention doc (Phase 2, section 8) should document this as a contract change: callers parsing `state --json` output must handle both shapes depending on whether `--inline` was passed. Without this, skills may assume markdown entries are always `true` and break when `--inline` is used, or vice versa.

The plan's Phase 2 task list item 8 says "Document `--inline` explicitly: it changes the state command's output contract." This is good intent but needs to be more specific: the convention doc should include the exact type change (`true` vs `string`) and when to use each mode. Recommendation: add a concrete example showing the same query path with and without `--inline`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `serializeStateTree` sorts keys via `deterministicStringify` but serialization happens before stringify

The plan creates `serializeStateTree()` to transform the typed tree into a plain object, then the caller passes the result to `deterministicStringify()` for output. Since `deterministicStringify` already sorts keys (via `sortKeys` in `json.ts`), `serializeStateTree` does not need to sort keys itself — it only needs to correctly unwrap the `StateEntry` discriminated union. This is architecturally fine, but the plan should note that key ordering is handled by the output layer, not the serialization function, to prevent duplicate sorting logic from being added during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 test file paths in Expected Behavior vs Tasks are inconsistent

Expected Behavior references `tests/unit/commands/state-command.test.ts` and `tests/integration/state-command.test.ts`. The Tasks section references the same paths. This is consistent (round 1's M6 was addressed — the naming now uses `state-command.test.ts`). However, the existing codebase test at `tests/unit/commands/status.test.ts` uses `status.test.ts` (no `-command` suffix). The plan should either follow the existing pattern (`state.test.ts`) or explain why the new naming convention was chosen. Minor inconsistency that won't block implementation but may cause confusion.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1 raised 2 critical, 12 important, and 13 minor issues. The revised plan addresses nearly all of them well:

- **C1** (requires frontmatter, binary vs project detection): Fully addressed — Phase 3 now has explicit frontmatter update task and two-stage detection.
- **C2** (schema registry ArgDefinitions): Fully addressed — explicit `ArgDefinition` entries for inline, offset, limit are specified.
- **I1** (pagination/output() consolidation): Fully addressed — single consolidated approach with `applyQuery()` + manual pagination + `process.stdout.write()`.
- **I2** (show --json artifacts dependency): Addressed — Phase 3 now notes "without artifacts — artifacts field is deferred to slice 02."
- **I3** (Step 9 elimination): Addressed — "Remove Step 9 entirely" is explicit.
- **I4** (--inline flag): Addressed — `parseInlineBudget` with boolean coercion documented.
- **I5** (bare state behavior): Addressed — "Always output JSON (use `deterministicStringify` with indentation)."
- **I6** (start-complete): Addressed — "Note: `start-complete` does not exist as a command."
- **I7** (Format B data): Addressed — lists `slice:list --json`, `quest:list --json`, `epic:list --json`.
- **I8-I12**: All addressed in the revised plan.
- **M1-M12**: Nearly all addressed. M11 (jqjs negative indexing) noted but not fully resolved — surfaced as the remaining IMPORTANT issue above.

The plan is now architecturally sound. The four-layer dependency direction is respected, module boundaries are clean, and the public API surface is well-defined. The two remaining issues are refinements, not structural problems.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
