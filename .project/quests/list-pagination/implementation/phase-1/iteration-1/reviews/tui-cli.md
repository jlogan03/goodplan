# TUI and CLI Review: Phase 1 — Shared Pagination Infrastructure

## Issues

**[IMPORTANT]** `state` command declares redundant local `offset`/`limit` args that shadow the global ones
The `state` command (lines 38-47) declares its own `offset` and `limit` args with state-specific descriptions ("requires --query"). Since `globalArgs` now includes `offset` and `limit`, the local declarations shadow the global ones. This works correctly due to spread order (`...globalArgs` first, then local overrides), but creates a maintenance hazard: if someone removes the local declarations thinking they're redundant, the descriptions would silently change. The local declarations should remain (they have better descriptions for the `state` context) but should include a comment explaining why they override the global versions.
File: src/commands/global/state.ts:38
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Pagination footer lacks leading blank line separator from content
The `formatPaginationFooter` returns a string that is appended directly to the `lines` array. In the `learning:list` output, the footer appears immediately after the last item with no visual separation. A leading blank line before the "Showing X-Y of Z" footer would improve readability and match common CLI patterns (e.g., `git log`, `gh pr list`).
File: src/commands/learning/list.ts:55
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--limit`/`--offset` help text could be more discoverable for list commands
The global arg descriptions ("Maximum number of items to return", "Number of items to skip") are generic. For list commands, users discovering these via `--help` would benefit from seeing that these affect both JSON and human output. However, since all existing global args (`--force`, `--query`, `--verbose`) use similarly generic descriptions, this is consistent with the established pattern.
File: src/commands/global-args.ts:36
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Human-mode empty pagination state could be confusing
When `--offset` exceeds total items in human mode, `paginated.total` is non-zero so the "No learnings found." message is skipped, but `paginated.items` is empty so no items render. The footer shows "Showing 0 of 7" which is technically correct but the user sees only a footer with no context. Consider showing "No learnings in range." or similar when `paginated.items.length === 0 && paginated.total > 0`.
File: src/commands/learning/list.ts:44
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation. The `applyPagination` helper is well-designed with clean separation of concerns, the `PaginatedResult` type properly handles `exactOptionalPropertyTypes`, and the test coverage is thorough (unit + integration, both output modes, error cases, query interaction). The paginate-then-query semantics are documented and justified. To reach 9+: add visual separator before pagination footer, add a comment on the state command's arg shadowing, and handle the empty-but-paginated human output edge case.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
