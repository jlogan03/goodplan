# Software Architecture Review — Phase 1: Shared Pagination Infrastructure

## Issues

**[IMPORTANT]** `limit` and `offset` as global args leak onto mutation commands

Adding `limit` and `offset` to `globalArgs` means every command in the system — including mutation commands like `epic:create`, `slice:complete`, `quest:abandon` — will expose these flags in `--help` and in the `schema --json` output. These flags are semantically meaningless on mutation commands. LLM consumers that read the schema to construct commands may attempt to use `--limit` on mutations, producing confusing no-op behavior. The `GLOBAL_FLAG_KEYS` set in `validate.ts` correctly strips them before Zod validation (so they won't break anything), but their presence in the schema is misleading.

The `state` command already shows the alternative: define `limit`/`offset` locally on commands that use them. However, given that 6+ list commands all need these flags, the global approach avoids duplication. The tradeoff is acceptable for Phase 1, but consider: (a) documenting that these flags are no-ops on non-list commands, or (b) in Phase 2, moving to a `listArgs` spread that's used only by list commands (similar to how `parseInlineBudget` is only used by `state`).

File: src/commands/global-args.ts:35
Resolution: USER_INPUT

**[IMPORTANT]** Fitness functions have stale global arg lists

Two fitness functions maintain hardcoded lists of global arg names that were not updated to include `limit`, `offset`, or the pre-existing `force`:

1. `tests/fitness/stateless-commands.test.ts:12` — `GLOBAL_ARG_NAMES` set: `["json", "quiet", "query", "verbose"]`. Missing `force`, `limit`, `offset`. This means `limit`/`offset` on mutation commands would be treated as non-global args in the entity-identifying check. Currently doesn't cause a test failure (they aren't entity-identifying), but the set is semantically wrong.

2. `tests/fitness/schema-output-accuracy.test.ts:52` — `globalArgNames`: `["json", "quiet", "query", "verbose"]`. This test asserts every command includes these globals. It doesn't check `force`, `limit`, or `offset`, so it won't catch regressions where these flags are accidentally removed from a command.

Both should be updated to reflect the actual `globalArgs` keys, ideally by importing or deriving from a single source of truth rather than hardcoding.

File: tests/fitness/stateless-commands.test.ts:12
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `state` command re-declares `offset` and `limit` that are already in `globalArgs`

The `state` command at lines 38-47 declares its own `offset` and `limit` args with state-specific descriptions ("Skip N entries when result is an array (requires --query)"). Since `globalArgs` now includes these with generic descriptions, the local declarations override the global ones via spread order — this works correctly in citty. However, the duplication is easy to miss and could drift. A comment in `state.ts` noting that these intentionally override the global descriptions would prevent accidental removal.

File: src/commands/global/state.ts:38
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `PaginatedResult` uses `exactOptionalPropertyTypes`-safe conditional spread but interface definition uses `?`

The `PaginatedResult` interface declares `offset?: number` and `limit?: number`. With `exactOptionalPropertyTypes: true`, this means these properties can be absent OR `number`, but NOT `undefined`. The `applyPagination` function correctly returns objects without these keys (when no pagination flags) or with numeric values (when flags present), using the conditional-return pattern rather than conditional spread. This is correct, but the docstring on the interface could note this distinction for maintainers who might be tempted to set `offset: undefined`.

File: src/util/pagination.ts:27
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Clean module extraction with good separation of concerns. `parseNonNegativeInt` was properly lifted from `state.ts` to a shared utility. The `applyPagination` / `formatPaginationFooter` API is deep: callers pass raw string args and get back a fully-resolved result with correct slicing, total, and optional metadata. The paginate-then-query semantic difference from `state` command is well-documented. Test coverage is thorough across unit and integration levels.

Deductions: The global-args-on-mutation-commands design decision (IMPORTANT) affects the public API surface for all commands and will be visible to LLM consumers. The stale fitness functions (IMPORTANT) mean the system's architectural invariant tests are incomplete. Both are solvable without structural changes. To reach 9+: resolve the fitness function staleness and decide on the global-vs-list-only args approach.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
