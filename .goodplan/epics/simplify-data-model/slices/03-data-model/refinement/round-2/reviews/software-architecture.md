# Software Architecture Review: Data Model Changes Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 3 overview consolidation changes the unified overview shape but plan doesn't specify how `task-lifecycle.ts` CONVERT_TASK's dynamic path construction adapts
The `CONVERT_TASK` handler in `task-lifecycle.ts` (line ~108) constructs overview paths dynamically: `getJson<Overview>(state, \`${targetNamespace}/overview.json\`)` where `targetNamespace` is `"quests"` or `"epics"`. In the consolidated model, this becomes `overview.json` at the root, but the handler also needs to know *which sub-key* to check (`epics` vs `quests`). The plan lists "Update `task-lifecycle.ts` (task drop/convert) for new overview path" but doesn't acknowledge this dynamic path construction pattern. Unlike the other helpers which each operate on a known sub-key, this handler switches between two different sub-keys at runtime. The implementer needs guidance: either (a) the helper functions (`addQuestToOverview`, `addEpicToOverview`, `updateTaskOverviewStatus`) absorb all the overview access so the handler never touches paths directly, or (b) the handler switches on `event.to` and accesses the right sub-key. Option (a) is already implied by the plan's helper update task and is architecturally cleaner -- make this explicit.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 unified overview schema task is underspecified on backward compatibility of type exports
The plan says "Specify whether existing types (`Overview`, `EpicOverview`, `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem`) are preserved as sub-shapes or replaced." This is good -- but the answer matters for blast radius. These types are imported in `helpers.ts`, `task-lifecycle.ts`, `slice-plan.ts`, `complete.ts`, and across test files. If the existing types are *removed* in favor of new unified types, every import site needs updating. If they're *preserved as sub-shapes* (re-exported from the unified schema), the import changes are minimal. The plan should make the decision now: preserve existing types as re-exports from the unified schema module. This minimizes Phase 3's blast radius and keeps the change additive where possible. The unified type is the new primary; the old types become convenience aliases pointing into the unified structure.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 entityPath validation task specifies RPC layer but the actual insertion point in `begin.ts` is unclear
The plan correctly says validation belongs in `begin.ts` and "NOT in the transition handler, NOT via direct filesystem I/O." But `begin.ts` currently builds the `CREATE_DECISION` event in the `buildBeginEvent` function (line ~184), and the state is loaded before that (line 48: `loadState`). The validation must happen between `loadState` and `buildBeginEvent` -- specifically, the plan should note that `begin()` has access to `oldState` (the loaded `ProjectState`) and should validate `entityPath` against it using tree navigation (`resolve()` or `getJson()`). This keeps validation pure (state tree lookup, no filesystem I/O) while keeping it out of the reducer. The `buildBeginEvent` function itself doesn't have state access, so the check must be in `begin()` before calling `buildBeginEvent`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 HMAC verification task is a no-op but the plan's wording suggests extra work
The plan says: "Verify HMAC serialization in `src/core/data/hmac.ts` handles the new `overview.json` path correctly (the path change from 3 files to 1 may affect path-based HMAC entries)." Having verified the HMAC implementation, it operates on the full state tree generically -- `serializeForHmac` walks all entries regardless of path. It has no path-specific logic for overview files. The HMAC will automatically cover the new `overview.json` because it covers everything in the tree. This task is correct to include (defense-in-depth verification is good), but should be annotated as a verification-only step rather than a code change, to avoid the implementer searching for path-specific HMAC logic that doesn't exist.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 migration crash-safety could be strengthened with write ordering
The migration steps are: (1) read old files, (2) merge, (3) write `overview.json`, (4) update HMAC, (5) verify, (6) remove old files. The idempotency handling says "if `overview.json` exists AND old files exist, re-run from step 1." This is correct. However, step (3) write + step (4) HMAC update are two separate operations. If the process crashes between them, the state has an invalid HMAC. The existing `commitState` pattern handles this atomically (it writes JSON + HMAC together). The plan should specify that the migration uses `commitState` or an equivalent atomic write pattern rather than raw file writes, ensuring the HMAC is always consistent with the data.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 issues have been addressed effectively. The plan now has correct command names, explicit validation placement, complete task coverage for state events and RPC mapping, and doc update tasks. The remaining issues are refinements: one important issue about dynamic path construction in `task-lifecycle.ts` that could trip up an implementer, one important issue about type export strategy that affects blast radius, and three minor clarification items. To reach 9+: (1) specify that helpers fully encapsulate overview access so `task-lifecycle.ts` never constructs paths, (2) decide to preserve existing type exports as aliases, and (3) annotate the HMAC task as verification-only.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
