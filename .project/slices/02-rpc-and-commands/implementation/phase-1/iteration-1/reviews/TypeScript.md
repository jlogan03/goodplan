## Issues

**[IMPORTANT]** `requireActiveEpic` loads state redundantly in read-only commands
`requireActiveEpic()` calls `loadState(projectDir)` internally, then `show.ts` and `list.ts` call `loadState(projectDir)` again immediately after. While `loadState` has caching (so this is not a correctness bug), it is a design smell: the function's hidden I/O dependency means callers cannot share the already-loaded state. Consider refactoring `requireActiveEpic` to accept a `ProjectState` parameter (or a `Project` object) instead of `projectDir`, so callers that already have state loaded can avoid the second call. The same pattern applies in the subagent start-* commands (3 files).
File: src/commands/slice/utils.ts:17
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `list.ts` uses inline type alias and ad-hoc project.json typing
`list.ts` line 57 reads `project.json` with an inline type `getJson<{ activeEpic: string | null }>(...)` rather than importing and using the `Project` type from `../../schemas/entities/project.js`. This is fragile -- if the `Project` type changes shape, this inline type won't track. The `SliceWithEpic` type (line 42) is defined inline inside the `run` function body. While not incorrect, it would be cleaner as a module-level type or, better, derived from the existing `SliceOverviewItem` at module scope.
File: src/commands/slice/list.ts:57
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `show.ts` double-loads state when `--epic` is not provided
When `args.epic` is undefined, `requireActiveEpic(projectDir)` is called (which loads state), then `loadState(projectDir)` is called again on line 41. Same issue as the first item but specifically notable here because `show.ts` is a read-only command that could easily accept the state from `requireActiveEpic`.
File: src/commands/slice/show.ts:40
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `list.ts` line 58: `project?.activeEpic ?? undefined` is safe but slightly misleading
With `exactOptionalPropertyTypes`, the `?? undefined` coercion from `null` to `undefined` is correct (since `activeEpic` is `string | null`, not `string | undefined`). However, the optional chaining `project?.` means if `project` itself is undefined, the expression evaluates to `undefined` directly. The `?? undefined` then only converts `null` to `undefined`. This is correct behavior but could benefit from a brief comment explaining the null-to-undefined coercion intent for readers unfamiliar with `exactOptionalPropertyTypes`.
File: src/commands/slice/list.ts:58
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The implementation is clean, well-structured, and achieves its goals effectively. All 22 `@ts-expect-error` and `TODO(slice-02)` annotations are cleared. TypeScript compiles without errors. All 874 unit tests pass. The `requireActiveEpic` helper is a good extraction that avoids repetition across 10+ command files. The two pre-existing test failures (integration/workflow-init and fitness/stateless-commands) are not caused by these changes. The only items preventing a 10 are the redundant state loading pattern (IMPORTANT) and the inline type usage in `list.ts` (IMPORTANT).

## Summary
- Critical: 0
- Important: 2
- Minor: 2
