# Integration Review: Sub-Agent Commands & Quest Lifecycle

**Reviewer**: Generalist
**Score**: 8/10
**Scope**: Full diff 6bbc09a...HEAD (64 files, +4680/-192)

## Summary

The implementation delivers both feature clusters (quest lifecycle + context bundling) cleanly. All 5 phases integrate well: types from Phase 1 flow through state machine (Phase 2) into RPC/CLI (Phase 3), context bundling (Phase 4) is consumed by start commands (Phase 5), and the `--inline` wiring through `complete()` activates the `complete` priority table. The helper consolidation from `slice-submit.ts` to `helpers.ts` is thorough with no orphaned code.

## Cross-Phase Integration: Strong

- **Phase 1 -> 2**: Event types defined in `state-events.ts` are consumed by all 5 transition handler files. `handleNotImplemented` placeholders in `reduce.ts` properly replaced with real imports.
- **Phase 2 -> 3**: State machine handlers are wired through `begin()` and `complete()` correctly. `buildBeginResult`/`buildCompleteResult` extended for quest targets.
- **Phase 3 -> 4**: `SubmitPhase` extended with `'complete'` in `rpc/types.ts`, consumed by `priorities.ts` for the complete phase priority table.
- **Phase 4 -> 5**: `startContext()` used by all 8 `start-*` commands and wired into `complete()` for `--inline`.
- **Slice-submit refactor**: `getQuest`, `guardQuestStatus`, `setQuestJson` moved to `helpers.ts`. All callers in `slice-submit.ts` updated to use `isStateError()` narrowing instead of `quest!` non-null assertions. Clean.

## Issues

### Important (1)

1. **Circular type dependency between context and RPC modules** (`context/types.ts` imports `SubmitPhase, Target` from `rpc/types.ts`; `rpc/types.ts` imports `ContextBundle` from `context/types.ts`). Both are `import type` so this works at compile time, but it contradicts the stated architecture: "context module is a peer, not a child of RPC" and "RPC layer imports from context, not the reverse." The dependency is bidirectional. Consider extracting `SubmitPhase` and `Target` to a shared types module that both context and RPC import from.

### Minor (3)

1. **`completed` timestamp in overview never set**: `updateQuestOverviewStatus()` only updates the `status` field. The `completed` field (initialized as `null` in `quest-create.ts`) is never set to the actual completion timestamp. This is a pre-existing pattern from slice handling (same gap exists in `updateSliceOverviewStatus`), so it is consistent -- but it means `quest:list` will always show `completed: null` even for completed quests.

2. **Non-null assertion in start commands**: `start-implementation.ts:91` uses `questVal!` after the mutual-exclusivity check. The comment explains why this is safe, and the plan explicitly called out avoiding `quest!` assertions in `submit-plan.ts` style. This one is well-justified by the guard above, but a type-narrowing helper could eliminate it.

3. **`as string` casts in epic-scoped start commands**: Files like `start-architecture.ts:40` use `args.epic as string` and `args.inline as string | undefined`. These are citty arg-parsing artifacts, not unsafe casts, but they add noise. A thin wrapper would clean this up across all 8 commands.

## What Works Well

- **Consistent patterns**: Quest commands mirror slice commands exactly (same output format, same `--json`/`--quiet` handling, same RPC routing). This makes the codebase predictable.
- **Context bundling is well-isolated**: `src/core/context/` has clean boundaries -- reads from tree types, no state mutations, no reduce calls. The `startContext(state, ...)` signature taking caller-provided state is good for testability.
- **Budget implementation is correct**: Uses `Buffer.byteLength` for UTF-8 measurement, first entry always inlined regardless of budget, empty entries handled. The multi-byte char test in `budget.test.ts` is a nice touch.
- **Deduplication in startContext**: The `seen` set prevents duplicate entries when multiple priority sources resolve to the same file. Good defensive code.
- **Comprehensive tests**: 6 new test files covering state transitions, commands, context module internals, and a full lifecycle walkthrough. The test for `start-plan --inline` verifying the entity goal is inlined first validates the priority table contract end-to-end.
- **Architecture docs updated**: `transition-tables.md`, `rpc-layer-api.md`, `_overview.md`, and `conventions.md` all reflect the implementation.
- **TODO cleanup**: `TODO(slice-05)` removed from `slice-submit.ts` as planned.

## No Regressions Detected

- `slice-submit.ts` changes are purely mechanical: swapping local helpers for shared ones, `quest!` for `questOrErr` with `isStateError()` narrowing. Logic unchanged.
- Existing `rpc/submit.ts` `resolveStatuses` fallback changed from hardcoded `"pre-submit"/"post-submit"` to proper quest status reading -- this fixes a known placeholder, not a regression.
- `SubmitPhase` extension with `'complete'` is handled in `buildSubmitEvent` with an explicit error case, so no existing submit codepath is broken.
