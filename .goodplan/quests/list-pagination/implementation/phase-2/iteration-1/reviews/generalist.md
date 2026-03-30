# Phase 2 Review: Apply to All List Commands + Tests

**Reviewer:** Generalist
**Score:** 9/10
**Issues:** Critical: 0, Important: 0, Minor: 3

## Plan Adherence

All tasks from Phase 2 are completed:

- [x] Wire pagination into `epic:list`, `quest:list`, `slice:list`, `task:list`, `decision:list`
- [x] Integration tests for `slice:list` and `quest:list` using `pagination` fixture
- [x] End-to-end verification of all 6 commands with `--limit 3 --json`
- [x] `commands-api.md` updated with List Flags section
- [x] Schema registry (`schema.ts`) updated with `listArgDefs` for all 6 list commands
- [x] Build, tsc, and all 1456 tests pass

## Cross-File Integration

All 5 list commands follow the identical pattern established by `learning:list` in Phase 1:
1. Collect items into `allItems` (or `filtered` for task:list)
2. Call `applyPagination(allItems, args)`
3. JSON path: `output(paginated, args)` (task:list spreads `{ ...paginated, filter }` -- correct)
4. Human path: check `paginated.total === 0` for empty, then `paginated.items.length === 0` for out-of-range, then render items + footer

The `listArgs` are properly spread in both the command `args` and the `schema.ts` `listArgDefs` for all commands. INV-006 compliance is maintained.

## Code Reuse

Excellent reuse of shared infrastructure from Phase 1. Each command imports `applyPagination` and `formatPaginationFooter` from `../../util/pagination.js`. No duplication of pagination logic.

## Slice-Specific Handling

`slice:list` correctly handles the `--all` grouped-by-epic display with pagination applied to the flat array and epic headers derived from the paginated subset. The out-of-range case is handled before the `args.all` branch, which is the right ordering.

## Task-Specific Handling

`task:list` correctly applies pagination after the `--all`/open filter. The `total` reflects filtered count (not raw count), which matches the plan. The `filter` field is preserved via spread. The "N open tasks (use --all to show all M)" hint now correctly uses `paginated.total` instead of `items.length`.

## Test Coverage

Both test files (`slice-list.test.ts`, `quest-list.test.ts`) cover the required scenarios:
- No pagination flags (total present, offset/limit absent)
- `--limit` only
- `--offset` only
- `--limit` + `--offset` combined
- `--offset` alone without `--limit`
- Human mode footer
- `--quiet` mode
- `--query` combined with pagination
- Invalid values producing exit code 2

Tests verify item order correctness (e.g., `firstItem?.name` checks after offset).

## Minor Issues

### Minor 1: Inconsistent "out of range" handling across commands

In `slice:list`, the `paginated.items.length === 0` branch is handled as a separate top-level condition (before `args.all`), while in the other 4 commands it is nested inside the `else` block after `paginated.total === 0`. Both work correctly, but the structural difference is slightly inconsistent. Not worth changing -- the slice command's branching is necessarily different due to the `--all` grouped display.

### Minor 2: Missing integration tests for `epic:list`, `task:list`, `decision:list`

The plan says "Add integration tests for at least `slice:list` and `quest:list`" -- so this is technically compliant. However, `task:list` has unique behavior (filter field, `--all` interaction with pagination) that would benefit from dedicated integration tests. Consider adding in a future pass.

### Minor 3: `commands-api.md` heading level

The new "List Flags" section uses `###` (h3), which is the same level as "Common Workflow Flags" immediately below it. This is correct -- just noting that both are subsections under the implicit "Global Flags" section, and the new content reads well in context.

## Summary

Clean, consistent implementation across all 5 remaining list commands. The pattern from Phase 1 was applied uniformly with appropriate per-command adaptations (slice grouping, task filtering). Schema registry, docs, and tests are all updated. No functional issues found.
