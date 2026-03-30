# Software Architecture Review — Integration (All 5 Phases)

Reviewer: SoftwareArchitecture
Scope: 64 files, +4680/-192 across quest lifecycle (5 state machine handlers, 8 CLI commands, RPC wiring) and context bundling (src/core/context/ module)

## Issues

**[IMPORTANT]** Circular type dependency between context and RPC modules
The context module (`src/core/context/types.ts`) imports `SubmitPhase` and `Target` from `src/core/rpc/types.ts`, while the RPC module (`src/core/rpc/types.ts`) imports `ContextBundle` from `src/core/context/types.ts`. This creates a bidirectional type dependency between two peer modules. Although TypeScript handles type-only circular imports at compile time (they are erased), this violates the documented architecture where context is described as a "peer module alongside the RPC layer" that the "RPC layer imports from ... not the reverse." The actual dependency graph has both importing from each other, which means neither module can be understood or replaced independently. The shared types (`Target`, `SubmitPhase`) should live in a shared types module that both context and RPC import from, or context should define its own Target/SubmitPhase types.
File: src/core/context/types.ts:7
File: src/core/rpc/types.ts:6
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Quest overview sync in `quest-create.ts` bypasses `updateQuestOverviewStatus` helper
The `handleCreateQuest` function in `quest-create.ts` manually constructs and writes `quests/overview.json` inline (lines 55-63) rather than using the `updateQuestOverviewStatus` helper from `helpers.ts`. This is inconsistent with the pattern used by all other quest status changes (which go through `setQuestStatus` -> `updateQuestOverviewStatus`). The create case is different (adding a new item vs updating an existing one), but the inline construction means overview shape changes must be updated in two places. Consider adding an `addToOverview` helper in `helpers.ts` to centralize this.
File: src/core/state/transitions/quest-create.ts:55
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `resolveEntityJsonPath` and `entityJsonPath` are duplicate implementations
The RPC types module (`src/core/rpc/types.ts:176`) exports `resolveEntityJsonPath(target)` which maps Target to its JSON path. The context priorities module (`src/core/context/priorities.ts:28`) has a local `entityJsonPath(target)` that does the exact same thing. Similarly, `entityDir` in priorities.ts partially overlaps with path logic elsewhere. This duplication means a new entity type must be updated in multiple places.
File: src/core/context/priorities.ts:28
File: src/core/rpc/types.ts:176
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Quest submit handlers remain co-located with slice submit handlers
The research context file (`_codebase-context.md`) identified that quest submit handlers (`handleCompleteQuestPlan`, `handleCompleteQuestRefinementRound`, `handleCompleteQuestImplementation`) should be consolidated into their own file during this slice. They remain in `slice-submit.ts` alongside the slice equivalents. The file comment has been updated to acknowledge this co-location, and the code works correctly. However, the file is now 304 lines covering two entity types, which makes it the largest transition file. Splitting quest submit handlers into `quest-submit.ts` would align with the one-file-per-entity convention used by all other quest handlers (`quest-create.ts`, `quest-plan.ts`, `quest-implement.ts`, `quest-complete.ts`, `quest-abandon.ts`).
File: src/core/state/transitions/slice-submit.ts:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `ResolvedTarget` is defined in types.ts but re-exported from priorities.ts
`ResolvedTarget` is defined in `context/types.ts` (line 43), re-exported from `context/priorities.ts` (line 11), and consumed by `context/collect.ts` which imports it from `priorities.ts` rather than `types.ts`. This indirect import path makes the dependency graph harder to follow. Since `collect.ts` already imports from both `priorities.ts` and `types.ts`, it should import `ResolvedTarget` from `types.ts` directly.
File: src/core/context/collect.ts:8
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong implementation with clean layering overall. The 4-layer architecture (Commands -> RPC -> State Machine + Data Layer) is correctly maintained across all 64 files. The state machine remains pure (no I/O imports verified by test). The context module is well-designed as a read-only peer with clear separation from the RPC layer. Quest handlers follow the established patterns precisely, with good helper reuse (guardQuestStatus, setQuestStatus, evaluateRefinement). All 618 tests pass.

To reach 9+: resolve the circular type dependency between context and RPC modules (the most architecturally significant issue), and consolidate the duplicated path-resolution logic.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
