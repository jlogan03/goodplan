# Generalist Review: Phase 1 — RPC, Commands & Tests

## Score: 9/10

## Summary

All 22 `@ts-expect-error` annotations and 2 `TODO(slice-02)` markers have been cleared. Path resolution throughout the RPC layer, commands, and context layer correctly updated from `slices/${name}` to `epics/${epic}/slices/${name}`. The `requireActiveEpic` helper centralizes active-epic resolution cleanly. Migration builds nested slice directories under epics. Tests comprehensively updated. Build, type-check, and all 874 tests pass.

## Plan Adherence

All tasks in the plan are checked off and verified in the diff:

- **RPC Layer**: `paths.ts`, `begin.ts`, `complete.ts`, `submit.ts` all updated correctly with `epic` fields on events and nested paths.
- **Context Layer**: `index.ts` (`resolveScope`) and `priorities.ts` (`entityDir`, `completeSources`, `refineSlicesSources`) all updated.
- **Shared Helper**: `utils.ts` created with `requireActiveEpic`.
- **Commands**: All 12 command files updated (create, plan, refine-plan, implement, complete, abandon, 6 subagent commands).
- **Status**: `status.ts` updated with epic overview aggregation, null guards for `activeEpic`, and nested slice paths.
- **List/Show**: `list.ts` restructured for epic-embedded slices with `--all` flag; `show.ts` gets `--epic` flag with active-epic fallback.
- **Schema**: `schema.ts` updated with new `--all` and `--epic` args.
- **Migrate**: `migrate.ts` nests slices under epics, removes top-level `slices/` directory.
- **Docs**: `rpc-layer-api.md` Target type updated.
- **Tests**: All test files updated with `epic` field on Targets, nested paths in fixtures and assertions.

## Issues

### Minor

1. **Error code mismatch with plan spec** (`src/commands/slice/utils.ts` line 21): Plan specifies a namespaced code like `"NO_ACTIVE_EPIC"` per INV-007, but implementation uses `"VALIDATION_INVALID_INPUT"`. This is pragmatic since `NO_ACTIVE_EPIC` doesn't exist in the `GoodplanErrorCode` union, so adding it would require schema changes outside scope. The existing code is valid and the error message is clear. However, if a consumer needs to programmatically distinguish "no active epic" from other validation errors, this won't work.

2. **Double `loadState` call** (`src/commands/slice/show.ts` lines 33-34): `requireActiveEpic(projectDir)` internally calls `loadState(projectDir)`, then line 34 calls `loadState(projectDir)` again. The cache makes this cheap, but it's a minor inefficiency pattern repeated across all commands that use `requireActiveEpic`. Not a bug since `loadState` uses caching.

3. **`list.ts` cast** (`src/commands/slice/list.ts` line 53): `args.epic as string | undefined` is a type cast that could be avoided by using the citty-provided type. Minor style nit.

## Observations (non-issues)

- The `complete.ts` deferred routing now correctly iterates all epics' slices (not just same-epic), which is the right behavior per the plan's DeferredItem.targetEpic specification.
- The architecture-deltas JSONL path fix at line 267 (the one the plan flagged as "easy to miss") was correctly updated.
- The `epicComplete` check correctly scopes to the same epic via `epicEntry.slices` — preserving the intentional same-epic-only scoping.
- Migration removes the top-level `slices` directory entirely, which is the correct structural change.

## Verdict

Clean, mechanical implementation that faithfully follows a detailed plan. All paths updated, all annotations cleared, all tests passing. The three minor issues are cosmetic/pragmatic trade-offs, none affecting correctness.
