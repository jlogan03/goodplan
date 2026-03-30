## Issues

**[IMPORTANT]** `applyPagination` return type uses optional properties but the plan specifies conditional presence

The `PaginatedResult<T>` interface uses `offset?: number; limit?: number` optional properties. With `exactOptionalPropertyTypes: true`, the implementation must use conditional spread (`...( flagsUsed ? { offset, limit } : {})`) rather than assigning `undefined` to these properties. The plan's interface definition is correct, but the implementation task for `applyPagination()` does not mention this constraint. If the implementor assigns `offset: undefined` when no flags are used, the TypeScript compiler will reject it under `exactOptionalPropertyTypes`, and even if it compiled, `JSON.stringify` would omit `undefined` values while `deterministicStringify` (used by `output()`) may not -- potentially leaking `"offset": null` into JSON output.

Fix: Add a note to the `applyPagination()` implementation task specifying that when neither flag is used, `offset` and `limit` must be absent from the returned object (use conditional spread), not set to `undefined`. The unit test task already covers this with `not.toHaveProperty` -- but the implementation guidance should match.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `total` field semantics for `task:list` with `--all` filter needs clarification

The plan says `total` is "original array length before slicing." For `task:list`, pagination applies after the `--all`/open filter. So `total` reflects the filtered count, not the raw count of all tasks. This is correct behavior, but the plan should be explicit: `total` represents the count of items *entering* pagination (post-filter), not the total in the data store. Without this clarification, an implementor might interpret `total` as the unfiltered count and add special handling, breaking the clean `applyPagination(filteredItems, args)` pattern.

Fix: Add a clarifying note to the Phase 2 `task:list` task: "`total` is the count of filtered items (post-`--all` filter), not all tasks in the overview. This falls naturally from `applyPagination(items, args)` where `items` is already filtered."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `force` flag missing from Global Flags table in `commands-api.md` update task

The plan's Phase 2 task says to add `--limit` and `--offset` to the Global Flags table in `commands-api.md`. The current table (line 300-309) lists `--json`, `--quiet`, `--query`, and `--verbose` but omits `--force`, which is already in `globalArgs`. This is a pre-existing omission, not introduced by this plan. However, since the plan is already touching this table, it would be efficient to fix it in the same edit.

Fix: Note this as a pre-existing gap to address during the `commands-api.md` update, or flag it as out of scope.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `limit` defaults to `total` when only `--offset` is given -- edge case with empty arrays

The plan specifies "limit defaults to total when only offset is given." When the items array is empty (`total = 0`) and `--offset 5` is passed, the result would be `{ items: [], total: 0, offset: 5, limit: 0 }`. A `limit: 0` is indistinguishable from an explicit `--limit 0` in the output. This is a minor semantic oddity, not a bug -- but the unit test suite should include this edge case to lock in the behavior.

Fix: Add `--offset` on empty array to the unit test list (verify `limit` defaults correctly).

Resolution: DIRECTLY_ACTIONABLE

## Round 1 Issue Resolution Assessment

All critical and important issues from round 1 have been addressed:

- **GLOBAL_FLAG_KEYS** (CRITICAL): Fully addressed -- dedicated task added with unit test.
- **offset/limit pairing** (IMPORTANT): Resolved with clear "pair" semantics -- both present when either flag is used, both absent otherwise. This is a different resolution than the round-1 recommendation (which suggested omitting offset when only limit is passed), but the chosen approach is internally consistent and simpler to implement. The plan and Expected Behavior now agree.
- **slice:list grouping** (IMPORTANT): Addressed -- task notes partial groups are intentional, derive headers from paginated subset.
- **task:list filter field** (IMPORTANT): Addressed -- explicit spread pattern documented.
- **parseNonNegativeInt extraction** (MINOR): Addressed -- explicit extract-and-reimport task.
- **Pagination semantics doc comment** (MINOR): Addressed -- doc comment task in `applyPagination`.
- **INV-006 schema verification** (IMPORTANT): Addressed -- added to Expected Behavior and Verification sections.
- **Contract change acknowledgment** (IMPORTANT): Addressed -- overview now has explicit note.
- **Bare flag behavior** (IMPORTANT): Addressed -- documented as intentional.
- **commands-api.md update** (MINOR): Addressed -- dedicated task in Phase 2.

## Score: 8/10

The plan has improved significantly from round 1. All critical and important issues are resolved. The architecture is clean: shared helper in `src/util/pagination.ts`, single extraction point for `parseNonNegativeInt`, consistent pattern across all 6 commands, and clear layering (pagination happens in the Commands layer before `output()`, matching the read-only routing pattern). The offset/limit pairing decision (both-or-neither) is a reasonable design choice that simplifies the implementation. The two remaining IMPORTANT issues are implementation guidance gaps that could lead to subtle bugs under strict TypeScript flags or misinterpretation by the implementor. Addressing those and the two MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
