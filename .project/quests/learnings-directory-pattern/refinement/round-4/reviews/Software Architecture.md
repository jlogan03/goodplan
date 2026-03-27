## Issues

**[IMPORTANT]** ROLLUP_LEARNINGS handler in `begin.ts` does not copy `.md` files -- plan mentions it but the RPC wiring is unclear

The plan's Phase 1 task says "RPC layer -- `ROLLUP_LEARNINGS` handler must copy `.md` files" and describes copying via `copyMarkdownFiles()` after reduce succeeds. However, looking at the actual codebase, `ROLLUP_LEARNINGS` is dispatched through `begin()` in `src/core/rpc/begin.ts`, which follows a generic pattern: `loadState -> buildBeginEvent -> reduce -> commitState -> buildResult`. There is no per-event post-reduce hook in the `begin()` function -- it's a straight pipeline. The `complete()` function in `src/core/rpc/complete.ts` is similarly a straight pipeline with no post-reduce side-effects.

To add `.md` file copying after `ROLLUP_LEARNINGS` reduce, the plan needs to specify WHERE in the code this happens. Options: (a) add a conditional block in `begin()` that checks for `phase === "rollup"` and calls `copyMarkdownFiles()` between `reduce()` and `commitState()` (or after `commitState()`), (b) create a separate `rollupLearnings()` RPC function (parallel to `complete()`) that the `learning:rollup` command calls directly instead of going through `begin()`.

The same issue applies to the `complete()` path for slice/quest completion: `complete()` in `src/core/rpc/complete.ts` currently has no post-reduce file-writing step. The plan says the RPC layer writes `.md` files after reduce but before `commitState()` -- this requires modifying `complete()` to add that step.

Fix: Make the plan explicit about WHERE in the RPC layer these filesystem operations are added. For `complete()`, add a block between `reduce()` and `commitState()` that writes `.md` files via `writeMarkdownFiles()`. For `ROLLUP_LEARNINGS`, either add a conditional in `begin()` or (cleaner) extract a dedicated `rollupLearnings()` RPC function that includes the copy step. The plan already mentions a "standalone ROLLUP_LEARNINGS handler" -- clarify that this means a new RPC function, not just the state machine handler.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Shared learnings helper extraction may be premature -- the two handlers have small differences

The plan includes a task: "Extract shared helper for learnings processing: Both `slice-complete.ts` and `quest-complete.ts` share identical learnings processing logic." Looking at the actual code, the learnings processing in `slice-complete.ts` (lines 73-117) and `quest-complete.ts` (lines 47-81) is similar but not identical: slices roll up to both `epic` and `project`, while quests only roll up to `project` (with an explicit comment about skipping `epic`). The source path format also differs (`epics/<epic>/slices/<slice>` vs `quests/<quest>`).

These differences are small enough that a shared helper is reasonable, but the helper needs parameterization (source path, available rollup targets). The plan doesn't specify the helper's signature, which could lead to an overly generic abstraction or one that doesn't cleanly handle the quest-skips-epic case.

Fix: Specify the helper signature, e.g., `processLearnings(tree, learnings: LearningEventEntry[], source: string, availableTargets: Set<string>): ProjectState` where `availableTargets` controls which rollup targets are valid. This makes the quest case explicit: `availableTargets = new Set(["project"])`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `LearningSummary` type change uses `file?: string` but plan doesn't address `exactOptionalPropertyTypes` for the rollup path

Phase 2 adds `file?: string` to `LearningSummary` in `src/core/context/types.ts` and correctly notes the `exactOptionalPropertyTypes` issue for `collectLearnings` projection (using conditional spread). However, the `LearningSummary` type is also used in `ContextBundle.learnings` (see `rpc-layer-api.md`), which is returned to callers. If any caller iterates `ContextBundle.learnings` and spreads or assigns `file`, they'll hit the same `exactOptionalPropertyTypes` constraint. The plan should note that callers of `ContextBundle.learnings` should use `"file" in learning` checks rather than `learning.file !== undefined` to avoid TypeScript errors.

This is minor because `collectLearnings` is the only producer and the plan handles its projection correctly. But it's worth a note for future callers.

Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- 4-layer compliance: The plan correctly keeps the state machine pure (INV-003). Slug derivation is in the RPC layer, not the state machine. Data Layer helpers (`writeMarkdownFiles`, `copyMarkdownFiles`) preserve the dependency direction.
- Schema transition strategy: The `z.union([new, legacy])` approach is sound and avoids `exactOptionalPropertyTypes` issues. Phase 4 tightening after migration is the correct ordering.
- INV-001 compliance: All state mutations go through `reduce()`. The `.md` file writes are supplementary artifacts, not state mutations.
- INV-005 compliance: Schema validation continues to work -- the union schema validates both old and new formats during the transition period.
- Maturity awareness: All touched subsystems are Developing, so changes are encouraged. No fitness function conflicts detected.

## Score: 9/10

Round 3's IMPORTANT issues (Data Layer helpers for `.md` writes, recovery semantics, `state-events.ts` task) have been correctly incorporated into the plan. The remaining issue is about implementation specificity: the plan describes what the RPC layer should do (write `.md` files after reduce, copy files during rollup) but doesn't specify the insertion point in the existing `complete()` and `begin()` functions. This matters because these functions follow a tight pipeline pattern with no current hook points for side-effects. To reach 10: specify exactly where in `complete()` and `begin()` (or a new `rollupLearnings()` function) the filesystem operations are called.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
