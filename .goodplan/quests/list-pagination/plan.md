# Plan: List Pagination

## Overview

Add `--limit` and `--offset` pagination flags to all 6 list commands. JSON output gains a `total` field always, plus `offset`/`limit` when those flags are used. Human output shows a pagination footer when results are truncated.

Pagination is applied to the items array before formatting/output. `--query` operates on the (potentially paginated) output, matching the `state` command's existing pattern.

No default limit — existing behavior is preserved when flags aren't used.

## Phase 1: Shared Pagination Infrastructure

Add pagination args, helper function, and update output patterns so all list commands can adopt pagination uniformly.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan learning:list --limit 5 --json` errors or ignores `--limit` — the flag is not recognized
- [ ] JSON output from `goodplan learning:list --json` has shape `{ items: [...] }` with no `total` field

**After implementation** (should pass / show presence):
- [ ] `goodplan learning:list --limit 5 --json` returns `{ items: [...], total: N, limit: 5, offset: 0 }` with exactly 5 items (or fewer if total < 5)
- [ ] `goodplan learning:list --json` returns `{ items: [...], total: N }` (total always present, no limit/offset when not specified)
- [ ] `goodplan learning:list --offset 2 --limit 3 --json` returns 3 items starting from index 2
- [ ] `goodplan learning:list --limit 5` (human mode) shows 5 items plus a footer: `Showing 1-5 of N`

### Tasks

- [ ] **Add pagination args to `globalArgs`** in `src/commands/global-args.ts`: add `limit` (type: `"string"`, description: "Maximum number of items to return", required: false) and `offset` (type: `"string"`, description: "Number of items to skip", required: false). Use string type matching the `state` command's pattern — parse to number at call site.

- [ ] **Create `applyPagination()` helper** in `src/util/pagination.ts`:
  ```typescript
  interface PaginationArgs { limit?: string; offset?: string }
  interface PaginatedResult<T> { items: T[]; total: number; offset?: number; limit?: number }
  function applyPagination<T>(items: T[], args: PaginationArgs): PaginatedResult<T>
  ```
  - Parse `limit` and `offset` from string to non-negative integer (reuse or adapt `parseNonNegativeInt` from `state.ts` — move to a shared location if it's not already shared)
  - Always include `total` (original array length before slicing)
  - Include `offset` in result only when flag is provided (default 0)
  - Include `limit` in result only when flag is provided
  - Slice the array: `items.slice(start, end)`

- [ ] **Create `formatPaginationFooter()` helper** in `src/util/pagination.ts`:
  ```typescript
  function formatPaginationFooter(result: PaginatedResult<unknown>): string | undefined
  ```
  - Returns `undefined` if not paginated (no limit/offset) or if all items shown
  - Returns `"Showing {start+1}-{end} of {total}"` when truncated
  - Uses `picocolors.dim()` for the footer text

- [ ] **Update `learning:list` as the first consumer** — wire `applyPagination()` into the command. For JSON mode: `output(paginatedResult, args)`. For human mode: format the paginated `items`, append footer if present. This validates the pattern before applying to all commands.

- [ ] **Add unit tests for `applyPagination()`** in `tests/unit/`: no pagination args (returns all items + total), limit only, offset only, limit + offset, offset beyond array length (returns empty items, total unchanged), limit larger than array, zero limit (returns empty), negative values (error or treat as 0).

- [ ] **Add integration test for `learning:list` pagination** in `tests/integration/`: test `--limit`, `--offset`, `--limit --offset`, and `--json` output shape. Use a fixture with enough learnings to paginate.

### Verification

- `applyPagination()` unit tests pass
- `learning:list --limit 5 --json` returns correct shape on this repo (131+ learnings)
- `learning:list --limit 5` shows footer in human mode
- Existing `learning:list` (no flags) behavior unchanged
- `tsc --noEmit` passes

## Phase 2: Apply to All List Commands + Tests

Wire pagination into the remaining 5 list commands and add integration test coverage.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan epic:list --limit 2 --json` ignores the `--limit` flag (no `total` in output)
- [ ] `goodplan slice:list --limit 2 --json` ignores the `--limit` flag

**After implementation** (should pass / show presence):
- [ ] All 6 list commands accept `--limit` and `--offset` and return paginated JSON with `total`
- [ ] `goodplan quest:list --limit 3 --json` returns `{ items: [...], total: N, limit: 3, offset: 0 }`
- [ ] `goodplan decision:list --limit 5 --json` works (even if 0 decisions — returns `{ items: [], total: 0 }`)
- [ ] `goodplan task:list --limit 2 --json` works
- [ ] Human mode footer appears on all commands when truncated

### Tasks

- [ ] **Wire pagination into `epic:list`** (`src/commands/epic/list.ts`): wrap items with `applyPagination()`, update JSON and human output paths.

- [ ] **Wire pagination into `quest:list`** (`src/commands/quest/list.ts`): same pattern.

- [ ] **Wire pagination into `slice:list`** (`src/commands/slice/list.ts`): same pattern. Note: slice:list aggregates across epics — pagination applies to the flattened list.

- [ ] **Wire pagination into `task:list`** (`src/commands/task/list.ts`): same pattern. Note: task:list already has `--all` flag filtering — pagination applies after filtering.

- [ ] **Wire pagination into `decision:list`** (`src/commands/decision/list.ts`): same pattern.

- [ ] **Add integration tests** for at least `slice:list` and `quest:list` pagination (these have the most items on this repo after learnings). Test `--limit`, `--offset`, JSON shape, and human footer.

- [ ] **Verify all 6 commands end-to-end** on this repo: run each with `--limit 3 --json` and confirm output shape.

### Verification

- All 6 list commands produce consistent paginated JSON shape
- Human mode footer consistent across all commands
- No regressions in existing list behavior (no flags = same output as before, except `total` added to JSON)
- `tsc --noEmit` passes
- All tests pass
