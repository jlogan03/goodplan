# Software Architecture Review

Phase: Phase 2: Apply to All List Commands + Tests
Review context: a code implementation
Iteration: 1

---

## Issues

**[IMPORTANT]** `GLOBAL_FLAG_KEYS` in `validate.ts` not updated for `limit`/`offset`

`src/util/validate.ts` has a hardcoded set `GLOBAL_FLAG_KEYS = new Set(["json", "quiet", "query", "verbose", "help", "version", "force"])` used to strip global flags before Zod validation in `validateInput()`. The `limit` and `offset` flags are NOT in this set. While list commands do not call `validateInput()` (they read args directly), citty parses the registered command definitions, and global args are spread into every command via `globalArgs`. The `listArgs` are only spread into list commands — so `limit`/`offset` will not be present in mutation command args at runtime. However, if any code path ever passes list-command args through `validateInput()`, or if a future refactor adds `listArgs` to `globalArgs`, `limit` and `offset` will bleed into Zod validation as unexpected fields. The research file (item 1 in Concerns section) called this out explicitly. Even if the current paths are safe, `GLOBAL_FLAG_KEYS` is documented as the filter for "global flags that should be stripped before command-level schema validation" — `limit` and `offset` are not global flags, so omitting them is architecturally consistent. This is a documentation/design clarity issue more than a live bug, but worth addressing to close the gap the research identified.

File: `src/util/validate.ts:5`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:list` "N open tasks" summary line uses `paginated.total` (filtered count) — semantically inconsistent label

In `src/commands/task/list.ts` line 68, the hint message reads:
```
`${paginated.total} open tasks (use --all to show all ${allItems.length})`
```
`paginated.total` is the count of open tasks (the filtered subset before pagination), which is correct. However, the variable name `paginated.total` is easily confused with "total items including non-open" since the comment and naming conventions elsewhere use `total` to mean "all items before pagination." The logic is correct but the naming context requires a close read to verify. No rename is strictly needed (the value is correct), but a local alias like `const openCount = paginated.total` at the call site would make the intent unambiguous.

File: `src/commands/task/list.ts:68`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:list --all` human-mode pagination produces partial epic groups without any indication

When `slice:list --all --limit N` is used in human mode, the paginated items are regrouped by epic from the already-sliced flat array. This means a paginated response may show only 1 of 3 slices from `epic-beta` with no indication that the epic has more. The footer says "Showing 1-2 of 5" but the epic grouping headers (e.g., `epic-beta:`) will appear to show a complete group when they don't. The research file (item 4 in Concerns) flagged this. For JSON consumers this is a non-issue (they get `total` and can paginate further), but for human output the grouping headers are misleading. A note in the footer like "Showing 1-2 of 5 (epic groups may be partial)" would close this UX gap without architectural change.

File: `src/commands/slice/list.ts:88-106`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No integration tests for `decision:list`, `epic:list`, `task:list`, or `learning:list` pagination

Phase 2 adds tests for `slice:list` and `quest:list` only. Four other list commands received the same pagination wiring but have no integration test coverage. The test file coverage is asymmetric — if a regression were introduced in one of the four untested commands, it would not be caught. The fixture already has data for decisions and learnings (`decisions.jsonl`, `learnings.jsonl`) and epics/tasks can be inferred from the epic structure. Adding at least one round-trip test per command (no-flags baseline + limit) would close this gap.

File: `tests/integration/` (missing files for decision, epic, task, learning list pagination)
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The architecture is clean and consistent. `listArgs` is correctly separated from `globalArgs` to prevent flag leakage to mutation commands. The `applyPagination`/`formatPaginationFooter` utilities in `src/util/pagination.ts` are deep modules with small public surfaces. The `PaginatedResult` interface is well-typed with `exactOptionalPropertyTypes`-safe conditional spread. INV-006 (schema reflects actual command signatures) is properly maintained — `schema.ts` adds `listArgDefs` to all six list commands in sync with the runtime command definitions. No invariants are violated.

What would bring this to 9+: address the `GLOBAL_FLAG_KEYS` gap (IMPORTANT issue) and add pagination integration tests for the four untested list commands (closes asymmetric coverage).

## Summary
- Critical: 0
- Important: 1
- Minor: 3
