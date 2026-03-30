## Issues

**[CRITICAL]** Missing `GLOBAL_FLAG_KEYS` update in `validate.ts`

The plan adds `limit` and `offset` to `globalArgs` in Phase 1 but never mentions updating the `GLOBAL_FLAG_KEYS` set in `src/util/validate.ts`. This set is used by `validateInput()` to strip global flags before Zod schema validation for mutating commands. Without adding `"limit"` and `"offset"` to this set, these flags will leak into stdin-merged validation and cause spurious validation errors on any mutating command that uses `validateInput()`.

Add a task to Phase 1: "Update `GLOBAL_FLAG_KEYS` in `src/util/validate.ts` to include `"limit"` and `"offset"`."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `slice:list --all` human-mode pagination will break epic grouping

When `slice:list --all` is used in human mode, the output groups slices under epic headers (lines 77-93 of `src/commands/slice/list.ts`). If pagination slices the flat `items` array before rendering, a page boundary could split an epic's slices across pages — the user would see an epic header with only some of its slices, or slices from a subsequent epic starting mid-group with no header context.

The plan should explicitly address this: either (a) document that pagination applies to the flat list and partial epic groups are expected, (b) paginate at the epic-group level in human mode, or (c) only paginate JSON output for `slice:list --all`. Option (a) is simplest and probably fine — just note it in the plan so the implementer handles the edge case intentionally rather than discovering it during testing.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `task:list` JSON envelope has `filter` field — plan should preserve it in paginated output

`task:list` outputs `{ items, filter }` where `filter` is `"open" | "all"` (line 44 of `src/commands/task/list.ts`). The plan's `applyPagination()` returns `{ items, total, offset?, limit? }` which would lose the `filter` field if it replaces the envelope. The plan says "same pattern" for all commands but doesn't address how to merge command-specific envelope fields with pagination fields.

Clarify that `applyPagination()` returns pagination metadata that gets spread into the existing envelope, e.g., `output({ ...applyPagination(items, args), filter }, args)` — or show the merge pattern explicitly in the `task:list` task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Footer text should account for offset in range display

The plan specifies `"Showing {start+1}-{end} of {total}"` which is correct, but the example in Expected Behavior says `"Showing 1-5 of N"` for `--limit 5` without `--offset`. When `--offset 10 --limit 5` is used, the footer should show `"Showing 11-15 of N"`. This is implied by `{start+1}` but worth making the offset-based example explicit in Expected Behavior to avoid an implementer defaulting to always showing `1-X`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Integration test fixture availability for all 6 entity types

The plan says to "use a fixture with enough learnings to paginate" and test `slice:list` and `quest:list`. The research notes that no list command integration tests exist yet and fixture data would need to be verified. The `slice-in-progress` fixture is confirmed to have data for `state` tests, but it's unclear whether it has enough learnings, quests, decisions, tasks, and epics to meaningfully test pagination across all 6 commands.

Phase 2's integration test task should either (a) verify the chosen fixture has sufficient data for the commands being tested, or (b) create/extend a fixture with at least 3+ items per entity type to make pagination testable.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No validation error test for invalid `--limit`/`--offset` values

The plan lists unit test cases including "negative values (error or treat as 0)" but doesn't include an integration test verifying that `--limit abc` or `--offset -1` produces a clear validation error with exit code 2 (per INV-007). Since `parseNonNegativeInt` throws `VALIDATION_INVALID_INPUT`, this should work, but an integration test confirming the user-facing error message would strengthen the error reporting coverage.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases, good separation of infrastructure from rollout, and sensible verification steps. The critical `GLOBAL_FLAG_KEYS` omission would cause real breakage on mutating commands. The `task:list` envelope merge and `slice:list` grouping issues need explicit handling to avoid implementation surprises. Addressing these three items and the minor clarifications would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 3
