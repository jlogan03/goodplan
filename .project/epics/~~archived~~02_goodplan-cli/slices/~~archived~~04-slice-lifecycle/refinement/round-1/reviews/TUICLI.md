# TUI and CLI Review: Slice Lifecycle Plan

## Issues

**[IMPORTANT]** `slice:create` flag/stdin input mismatch across phases

Phase 4 task for `slice/create.ts` says "Requires `--epic` flag to specify which epic the slice belongs to" and also "reads stdin JSON `{name, goal, epic}`". But the `commands-api.md` spec shows `goodplan slice:create --epic <name>` with stdin `{name, goal}` — epic comes from the flag, not stdin. The Phase 5 walkthrough uses `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic`, confirming the spec. However, Phase 4's Expected Behavior section shows `echo '{"name":"01-auth","goal":"Auth","epic":"my-epic"}' | bun run src/index.ts slice:create --json` with epic in stdin and no `--epic` flag. This contradiction will cause confusion during implementation. The spec is clear: `--epic` is a flag, stdin carries `{name, goal}`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `BeginPayloadMap["create"]` expansion is underspecified for type safety

Phase 3 proposes: "keep `create` payload as `{name: string; goal: string; epic?: string}` where `epic` is required for slice targets and absent for epic targets." This makes `epic` optional at the type level but required at runtime — a TypeScript anti-pattern that undermines `exactOptionalPropertyTypes`. The existing `INIT_PROJECT` create path uses `{name, goal}` with `goal` already optional (`goal?: string`). Adding another optional field further erodes type safety. A better approach: overload `BeginPayloadMap["create"]` as a discriminated union keyed by target type, or use separate phase keys (e.g., `create-slice` vs `create`). Given `exactOptionalPropertyTypes: true` in the project's tsconfig, the plan should specify the concrete approach rather than leave it as "Option:".

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `CompleteResult` needs extension for slice completion metadata

Phase 3 says "Return CompleteResult with deferredRouted, architecturePaths, epicComplete, learningsRolledUp extracted from the new state." But the current `CompleteResult` type in `types.ts` only has `{entity, previousStatus, newStatus}`. The plan doesn't include a task to extend `CompleteResult` with these additional fields. This is important because: (1) the CLI layer in Phase 4 says "Complete shows deferred count, learnings count, epicComplete flag" — it needs these fields from the result, and (2) the `commands-api.md` transition table lists `deferredRouted, architecturePaths, epicComplete, learningsRolledUp` as orchestrator-returned values. Phase 3 should include an explicit task to extend `CompleteResult` (or create a `SliceCompleteResult` union variant).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Guard helper inconsistency not addressed in Phase 2

The research file explicitly calls out: "slice-submit.ts local helpers use `StateError | null` guard pattern. New slice handlers should use `Entity | StateError` pattern per learnings." Phase 2 task list says "Add shared helpers to `helpers.ts` as needed: `guardSliceStatus(state, name, validStatuses)` returning `Slice | StateError`" — good. But it doesn't address the existing `guardSliceStatus` in `slice-submit.ts` which returns `StateError | null` and is used by the three existing submit handlers. After Phase 2, there will be two `guardSliceStatus` functions with different signatures — one in `helpers.ts` and one local in `slice-submit.ts`. The plan should either: (a) migrate slice-submit.ts to use the shared helper (which changes the calling pattern from `if (err !== null)` to `if (isStateError(result))`), or (b) explicitly document that the duplication is intentional and will be reconciled later. Option (a) is safer since both are touched in this slice.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--query` flag missing from slice commands

The existing epic commands (e.g., `epic:create`, `epic:complete`) don't include `--query` in their args, but `commands-api.md` lists `--query` as a global flag. The plan for Phase 4 doesn't mention `--query` either. This is consistent with the existing epic command pattern (no command currently uses `--query`), so it's not a regression — but worth noting that the plan perpetuates the gap between the spec and the implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 walkthrough step 11 sequential enforcement test is self-contradictory

Step 11 says: "attempt `goodplan slice:plan --slice 02-api` while 01-auth is in `planning` -> STATE_SLICE_NOT_READY". But by step 10, 01-auth has already been completed. The walkthrough needs reordering: the sequential enforcement test should happen *before* 01-auth is completed (i.e., between steps 6 and 10), or the step should reference a different pair of slices. As written, an implementer following the walkthrough linearly would not be able to reproduce the expected error.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `slice:create` stdin validation schema location unclear

Phase 4 says "Create `src/schemas/commands/slice.ts`" with Zod schemas for `createSliceInput` and `completeSliceInput`. But Phase 1 already creates `src/schemas/shared-records.ts` with `learningSchema` and `architectureDeltaSchema`. The `completeSliceInput` schema in Phase 4 will need to reference these. The dependency is implicit — Phase 4 should explicitly note that it imports from `shared-records.ts` (Phase 1) for the complete input validation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:list` and `slice:show` are read-only but not called out as Data Layer routes

Phase 4 says `slice:list` "Calls `loadState()`, navigates to `slices/overview.json`" and `slice:show` "Calls `loadState()`, navigates to `slices/<name>/slice.json`". The `commands-api.md` spec says read-only commands go directly to the Data Layer, not through the RPC Layer. The plan correctly describes calling `loadState()` directly, but should explicitly note these bypass the RPC layer — matching the pattern in `commands-api.md` Read/Write Routing contract. This helps the implementer avoid accidentally routing through `begin()`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and follows the proven bottom-up phasing pattern. The biggest issues are: (1) the `slice:create` input contract contradiction between Phase 4 tasks and the Expected Behavior / Phase 5 walkthrough, which will cause implementation confusion; (2) the `BeginPayloadMap` type expansion left underspecified despite strict TypeScript mode; (3) the missing `CompleteResult` extension task; and (4) the guard helper inconsistency acknowledged by research but not resolved in the plan. Fixing these four IMPORTANT issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
