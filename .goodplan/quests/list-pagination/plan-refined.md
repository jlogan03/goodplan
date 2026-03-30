# Plan: List Pagination

## Overview

Add `--limit` and `--offset` pagination flags to all 6 list commands. JSON output gains a `total` field always, plus `offset`/`limit` when those flags are used. Human output shows a pagination footer when results are truncated.

Adding `total` to all 6 list commands is an intentional additive contract change to the JSON output consumed by LLM orchestrators and skills via the `schema` command. Existing consumers are unaffected (additive, non-breaking).

Pagination is applied to the items array before formatting/output. `--query` operates on the (potentially paginated) output, matching the `state` command's existing pattern. Note: list commands paginate-then-query while the `state` command queries-then-paginates — both are correct for their context.

No default limit — existing behavior is preserved when flags aren't used.

## Phase 1: Shared Pagination Infrastructure

Add pagination args, helper function, and update output patterns so all list commands can adopt pagination uniformly.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan learning:list --limit 5 --json` errors or ignores `--limit` — the flag is not recognized
- [ ] `goodplan learning:list --json | jq 'has("total")'` returns `false`

**After implementation** (should pass / show presence):
- [ ] `goodplan learning:list --limit 5 --json` returns `{ items: [...], total: N, limit: 5, offset: 0 }` with exactly 5 items (or fewer if total < 5)
- [ ] `goodplan learning:list --json` returns `{ items: [...], total: N }` (total always present; offset/limit both absent when neither flag is used)
- [ ] `goodplan learning:list --limit 5 --json` includes both `limit: 5` and `offset: 0` — the pair always appears together (offset defaults to 0 when only limit is provided, and vice versa)
- [ ] `goodplan learning:list --offset 2 --limit 3 --json` returns 3 items starting from index 2
- [ ] `goodplan learning:list --limit 5` (human mode) shows 5 items plus a footer: `Showing 1-5 of N`
- [ ] `goodplan learning:list --offset 10 --limit 5` shows footer: `Showing 11-15 of N`
- [ ] `goodplan schema --json | jq '.commands["learning:list"].args | keys'` includes `limit` and `offset` (INV-006 compliance)

### Tasks

- [x] **Add pagination args to `globalArgs`** in `src/commands/global-args.ts`: add `limit` (type: `"string"`, description: "Maximum number of items to return", required: false) and `offset` (type: `"string"`, description: "Number of items to skip", required: false). Use string type matching the `state` command's pattern — parse to number at call site. Note: `state.ts` defines its own `offset`/`limit` args with `state`-specific descriptions ("requires --query"). These shadow the global args — keep the `state.ts` overrides with their context-specific descriptions (citty supports this).

- [x] **Add `"limit"` and `"offset"` to `GLOBAL_FLAG_KEYS`** in `src/util/validate.ts`. Without this, these flags will leak into `validateInput()` Zod `.strict()` schema validation on mutating commands, producing spurious validation errors. Add a unit test confirming `validateInput` strips these flags.

- [x] **Extract `parseNonNegativeInt` from `src/commands/global/state.ts` to `src/util/pagination.ts`**. Update `state.ts` to import from the new shared location. This makes the parser available to `applyPagination()` without duplication.

- [x] **Create `applyPagination()` helper** in `src/util/pagination.ts`:
  ```typescript
  interface PaginationArgs { limit?: string; offset?: string }
  interface PaginatedResult<T> { items: T[]; total: number; offset?: number; limit?: number }
  function applyPagination<T>(items: T[], args: PaginationArgs): PaginatedResult<T>
  ```
  - Use the extracted `parseNonNegativeInt` to parse `limit` and `offset` from string to non-negative integer
  - Always include `total` (original array length before slicing)
  - `offset` and `limit` are a pair: both included in result when either flag is provided (offset defaults to 0 when only limit is given, limit defaults to total when only offset is given), both omitted when neither flag is used
  - When neither flag is used, `offset` and `limit` must be absent from the returned object (use conditional spread, not `undefined` assignment) due to `exactOptionalPropertyTypes: true`
  - Slice the array: `items.slice(start, end)`
  - Bare `--limit` or `--offset` without a value (citty delivers `"true"`) intentionally produces a validation error from `parseNonNegativeInt`. This is correct behavior — no special handling needed.
  - Add a doc comment explaining that list commands paginate-then-query while `state` queries-then-paginates, so future contributors don't "fix" this difference.

- [x] **Create `formatPaginationFooter()` helper** in `src/util/pagination.ts`:
  ```typescript
  function formatPaginationFooter(result: PaginatedResult<unknown>): string | undefined
  ```
  - Returns `undefined` if not paginated (no limit/offset) or if all items shown
  - Returns `"Showing {start+1}-{end} of {total}"` when truncated
  - When `total > 0` but paginated items are empty (e.g., `--offset` beyond total), show the footer (not "No items found"). Reserve "No items found" for `total === 0` only.
  - Uses `picocolors.dim()` for the footer text

- [x] **Update `learning:list` as the first consumer** — wire `applyPagination()` into the command. For JSON mode: `output(paginatedResult, args)`. For human mode: format the paginated `items`, append footer if present. This validates the pattern before applying to all commands.

- [x] **Add unit tests for `applyPagination()`** in `tests/unit/util/pagination.test.ts`: no pagination args (returns all items + total, verify `offset`/`limit` keys are absent via `expect(result).not.toHaveProperty("offset")`), limit only (includes both limit and offset in result), offset only (includes both offset and limit in result), limit + offset, offset beyond array length (returns empty items, total unchanged), limit larger than array, zero limit (returns empty), negative values (error), `--offset` without `--limit` (offset present, limit defaults), offset on empty array (produces `limit: 0` — document this semantic oddity). Also test `parseNonNegativeInt` edge cases: `"0"`, `"-1"`, `"1.5"`, `""`, `"true"` (bare flag), very large numbers.

- [x] **Create a `pagination` fixture** under `tests/fixtures/pagination/` with 5+ entries for each of the 6 entity types (learnings, epics, quests, slices, tasks, decisions). Reference this fixture by name in integration tests across Phase 1 and Phase 2.

- [x] **Add integration tests for `learning:list` pagination** in `tests/integration/`: test `--limit`, `--offset`, `--limit --offset`, `--json` output shape, `--limit abc` produces a validation error with exit code 2 (INV-007), and `--limit` combined with `--query` (validates paginate-then-query ordering is correct before rolling out to all commands). Use the `pagination` fixture.

### Verification

- `applyPagination()` unit tests pass
- `GLOBAL_FLAG_KEYS` unit test passes (validates `limit`/`offset` are stripped by `validateInput`)
- `learning:list --limit 5 --json` returns correct shape on this repo (131+ learnings)
- `learning:list --limit 5` shows footer in human mode
- `learning:list --limit abc` produces a clear validation error
- Existing `learning:list` (no flags) behavior unchanged
- `goodplan schema --json` includes `limit` and `offset` in list command args (INV-006)
- `tsc --noEmit` passes

## Phase 2: Apply to All List Commands + Tests

Wire pagination into the remaining 5 list commands and add integration test coverage.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan epic:list --limit 2 --json | jq 'has("total")'` returns `false` (pagination not yet wired into epic:list)
- [ ] `goodplan slice:list --limit 2 --json | jq 'has("total")'` returns `false` (pagination not yet wired into slice:list)

**After implementation** (should pass / show presence):
- [ ] All 6 list commands accept `--limit` and `--offset` and return paginated JSON with `total`
- [ ] `goodplan quest:list --limit 3 --json` returns `{ items: [...], total: N, limit: 3, offset: 0 }` (both limit and offset present as a pair)
- [ ] `goodplan decision:list --limit 5 --json` works (even if 0 decisions — returns `{ items: [], total: 0 }`)
- [ ] `goodplan task:list --limit 2 --json` works
- [ ] Human mode footer appears on all commands when truncated

### Tasks

- [x] **Wire pagination into `epic:list`** (`src/commands/epic/list.ts`): wrap items with `applyPagination()`, update JSON and human output paths.

- [x] **Wire pagination into `quest:list`** (`src/commands/quest/list.ts`): same pattern.

- [x] **Wire pagination into `slice:list`** (`src/commands/slice/list.ts`): same pattern. Note: `slice:list --all` aggregates across epics with grouped headers in human mode. Pagination applies to the flat items array; partial epic groups may appear (e.g., last 2 slices of one epic, first 3 of next). This is intentional — the footer ("Showing X-Y of Z") makes truncation clear. Derive epic headers from the paginated subset.

- [x] **Wire pagination into `task:list`** (`src/commands/task/list.ts`): same pattern. Note: task:list already has `--all` flag filtering — pagination applies after filtering. `total` is the count of filtered items (post-`--all` filter), not all tasks in the overview — this falls naturally from `applyPagination(items, args)` where `items` is already filtered. Preserve the existing `filter` field in JSON output: spread `applyPagination()` result with `{ filter }`, e.g., `output({ ...applyPagination(items, args), filter }, args)`.

- [x] **Wire pagination into `decision:list`** (`src/commands/decision/list.ts`): same pattern.

- [x] **Add integration tests** for at least `slice:list` and `quest:list` pagination using the `pagination` fixture from Phase 1. Test `--limit`, `--offset`, `--offset` alone (without `--limit`), JSON shape, human footer, `--quiet` mode with pagination, and `--query` combined with pagination. Add an integration test for invalid `--limit`/`--offset` values producing exit code 2.

- [x] **Verify all 6 commands end-to-end** on this repo: run each with `--limit 3 --json` and confirm output shape.

- [x] **Update `commands-api.md`** (`.project/architecture/commands-api.md`): add `--limit` and `--offset` to the Global Flags table (they apply to all list commands). Note their interaction with `--query` (paginate-then-query for list commands). Scope this update to `--limit`/`--offset` only — other stale entries (e.g., missing `--force`) are out of scope for this quest. Out of scope: `--force` flag gap in the Global Flags table — consider a future docs-audit task to sweep all missing flag entries.

### Verification

- All 6 list commands produce consistent paginated JSON shape
- Human mode footer consistent across all commands
- No regressions in existing list behavior (no flags = same output as before, except `total` added to JSON)
- `tsc --noEmit` passes
- All tests pass
