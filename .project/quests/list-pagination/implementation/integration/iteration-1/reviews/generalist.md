# Integration Review: List Pagination

**Reviewer:** Generalist
**Scope:** Full diff 11a04fc..HEAD (2 commits, 30 files, +1385 -105)
**Score: 9/10**

## Summary

Clean, well-structured implementation that delivers all plan goals. All 6 list commands gain `--limit`/`--offset` with consistent JSON shape, human-mode footer, and comprehensive test coverage. The shared `applyPagination()` helper is well-typed and the `listArgs` design improvement over the plan is a strict upgrade.

## Plan Alignment

All plan tasks are checked off. Every task in both Phase 1 and Phase 2 has been completed:
- Shared infrastructure (pagination.ts, parseNonNegativeInt extraction, formatPaginationFooter)
- All 6 commands wired (learning, epic, quest, slice, task, decision)
- Pagination fixture with 5+ entries per entity type
- Unit tests for applyPagination and parseNonNegativeInt
- Integration tests for all 6 commands
- commands-api.md updated
- schema.ts updated with listArgDefs for INV-006 compliance

## Design Deviation from Plan (Improvement)

The plan specified adding `limit`/`offset` to `globalArgs` and `GLOBAL_FLAG_KEYS`. The implementation instead created a separate `listArgs` export that is spread only into list commands. This is strictly better:

- Avoids leaking pagination flags onto mutation commands where they have no meaning
- No need to add to `GLOBAL_FLAG_KEYS` (which would strip them from validateInput on all commands)
- The validate.test.ts correctly confirms limit/offset are NOT stripped by validateInput (they would be rejected by strict schemas on mutation commands if accidentally passed)

The `state.ts` command retains its own offset/limit with context-specific descriptions, with a clear code comment explaining why.

## Phase Integration

No regressions from Phase 2 on Phase 1 work. The pattern established in `learning:list` (Phase 1) is replicated identically across all 5 remaining commands (Phase 2). Shared imports, identical pagination flow, consistent footer handling.

## API Contract Consistency

All 6 commands follow the same JSON contract:
- No flags: `{ items: [...], total: N }` (offset/limit absent)
- Either flag: `{ items: [...], total: N, offset: N, limit: N }` (pair always present)
- `task:list` correctly preserves its `filter` field via spread: `{ ...paginated, filter }`

Human mode is consistent:
- `total === 0`: "No {entity} found."
- `total > 0` but paginated empty: "No {entity} in this range." + footer
- Truncated: items + "Showing X-Y of Z" footer

## Code Quality

- `exactOptionalPropertyTypes` correctly handled via conditional spread (no `undefined` assignment)
- Generics preserved (`applyPagination<T>`)
- Doc comments explain the paginate-then-query vs query-then-paginate difference
- `slice:list` handles the `--all` grouped-by-epic case with comment noting partial groups are expected
- `task:list` handles the open-tasks summary vs pagination footer interaction (suppresses summary when footer present)
- Fitness tests updated to derive global arg names from source of truth (`Object.keys(globalArgs)`) instead of hardcoded arrays

## Test Coverage

- **Unit:** 12 tests for `parseNonNegativeInt`, 12 for `applyPagination`, 5 for `formatPaginationFooter`, 2 for `validateInput`
- **Integration:** 6 test files covering all entity types. Tests cover: no-flags baseline, --limit, --offset, --limit+--offset, offset-alone, human footer, quiet mode, --query combination, invalid input exit code 2
- Pagination fixture is well-structured with realistic data for all entity types

## Issues

### Minor

1. **`stripAnsi` duplicated across 7 test files.** Each integration test file and the unit test file independently define the same `stripAnsi` regex helper. This should be a shared test utility. Not a functional issue but adds maintenance burden.

2. **Missing test: `--offset` with offset value of `"true"` (bare flag) in integration tests.** The unit tests cover `parseNonNegativeInt("true", ...)` throwing, but no integration test verifies that `--limit` without a value (which citty delivers as `"true"`) produces exit code 2 from the actual CLI. This is an edge case but was specifically called out in the plan.

3. **`formatPaginationFooter` "all items shown" check is narrow.** The check `result.offset === 0 && result.items.length === result.total` would not suppress the footer if `--limit 100` was passed on a 5-item list (offset=0, items.length=5, total=5, limit=100). Actually -- this case does pass the check since items.length (5) === total (5), so it works correctly. No issue here upon closer inspection.
