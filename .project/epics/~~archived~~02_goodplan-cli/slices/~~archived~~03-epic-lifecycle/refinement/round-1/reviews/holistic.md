# Holistic Review — Epic Lifecycle Plan

## Issues

**[IMPORTANT]** Phase 1 claims `epicStatusSchema` has no status values matching transition-tables.md, but it already does
The Phase 1 "Before implementation" check states `grep "epicStatusSchema" src/schemas/entities/epic.ts — no match (schema exists but no status values matching transition-tables.md)`. However, `src/schemas/entities/epic.ts` already contains `epicStatusSchema` with all 14 statuses exactly matching transition-tables.md. The "Before" check will pass (not fail as expected), making it a false negative. The task to "Update epicStatusSchema values" is also a no-op — the values are already correct.
Resolution: DIRECTLY_ACTIONABLE
Fix: Remove the epicStatusSchema "Before" check (it already matches). Change the epicStatusSchema task from "Update" to "Verify epicStatusSchema values match transition-tables.md" or remove it entirely if no actual changes are needed.

**[IMPORTANT]** Epic schema missing `refinement` field referenced by Phase 3
Phase 3 (epic-refine.ts) says handlers should "Update epic.json refinement field (round, scoreHistory)." However, the current `epicSchema` in `src/schemas/entities/epic.ts` has no `refinement` field — only `name`, `status`, `goal`, `verifications`, `sliceSequence`, `created`, `activated`, `updated`. Phase 1 does not include a task to extend the epic schema with refinement tracking fields. The state machine will need to store round counts and score history somewhere in the epic entity.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a task to Phase 1 (or early Phase 3) to extend `epicSchema` with a refinement tracking field, e.g., `refinement: z.object({ round: z.number(), maxRounds: z.number(), scoreHistory: z.array(...) }).nullable()`. Alternatively, clarify where refinement state is stored if not in epic.json.

**[IMPORTANT]** Phase 4 `complete()` function scope mismatch with goal
Phase 4 defines `complete(target, input)` mapping to `COMPLETE_EPIC/COMPLETE_SLICE/COMPLETE_QUEST`. However, goal.md scope boundaries say slice lifecycle is slice 04 and quest lifecycle is slice 05. The `complete()` function in Phase 4 should only handle epic completion for this slice. Including slice/quest completion handling adds out-of-scope logic. The same concern applies to `begin()` handling slice/quest BeginPhase values like `'plan'`, `'implement'`, etc.
Resolution: DIRECTLY_ACTIONABLE
Fix: Clarify that Phase 4's `begin()` and `complete()` implementations should define the full type signatures (for forward compatibility) but only implement the epic-related mappings in this slice. Slice/quest mappings should throw "not yet implemented" or be deferred to their respective slices. Alternatively, explicitly note that the generic RPC functions are designed for extensibility and the slice/quest branches will be dead code until slices 04-05.

**[IMPORTANT]** Phase 3 slice-submit.ts includes slice/quest transition handlers that are out of scope
Phase 3 task for `slice-submit.ts` implements `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_IMPLEMENTATION`, and quest variants. The goal.md scope says "Slice lifecycle (slice 04)" and "Quest lifecycle (slice 05)" are out of scope. However, the goal also says submit-plan/submit-refinement/submit-implementation commands are in scope. This creates tension: the state machine handlers for slice transitions need to exist for the submit commands to work. The plan should explicitly acknowledge this cross-cutting concern rather than leaving it implicit.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a note to Phase 3's slice-submit.ts task explaining that these slice/quest handlers are pulled forward from slices 04-05 because the submit-* commands (in scope) require them. This makes the scope extension deliberate and traceable.

**[IMPORTANT]** Phase 2 `loadState()` Before check assumes `src/core/data/load.ts` doesn't exist — verify this is the correct path
Phase 2 says to create `src/core/data/load.ts`. The codebase currently has `src/core/data/assemble.ts`, `src/core/data/commit.ts`, `src/core/data/tree.ts`, `src/core/data/project.ts`, and `src/core/data/schema-registry.ts`. The file `load.ts` doesn't exist yet, which is correct. However, the plan doesn't specify how `loadState()` will be integrated into the RPC layer. Phase 4 mentions `loadState()` but doesn't specify the import path change from `assembleState` to `loadState` in the RPC layer. The existing `rpcInit()` calls `assembleState()` directly — this needs to switch to `loadState()`.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a task to Phase 4 (or Phase 2) to update the RPC layer to import and use `loadState()` instead of `assembleState()` for all state reads. The `assembleState()` function remains as the fallback within `loadState()` but should no longer be called directly from RPC code.

**[MINOR]** Phase 5 read-only commands call `assembleState()` instead of `loadState()`
Phase 5 tasks for `epic:list` and `epic:show` say "Calls `assembleState()`". After Phase 2 implements `loadState()` with caching, read-only commands should use `loadState()` for consistency and performance. Using `assembleState()` bypasses the cache.
Resolution: DIRECTLY_ACTIONABLE
Fix: Change Phase 5 epic:list and epic:show tasks to use `loadState()` instead of `assembleState()`.

**[MINOR]** Phase 5 epic:complete routes through `complete()` but epic:abandon routes through `begin()`
Per rpc-layer-api.md, `epic:abandon` maps to `begin('abandon', ...)` and `epic:complete` maps to `complete(target, input)`. Phase 5 correctly uses `complete()` for epic:complete and `begin()` for abandon. However, for epic:add-verification and epic:update-verification, the plan says "Calls `begin('add-verification', ...)` " which is consistent with the architecture. No issue here — just confirming the routing is correct after initial concern.
Resolution: N/A (verified correct)

**[MINOR]** Phase 6 documentation update task is minimal
Phase 6 includes "Update `.project/conventions.md` repo structure to reflect new directories." This is good but could be more specific about what sections to update. The conventions.md likely has a directory tree section that needs new entries for `src/commands/epic/`, `src/commands/subagent/`, `src/core/state/transitions/`, `src/core/rpc/begin.ts`, etc.
Resolution: DIRECTLY_ACTIONABLE
Fix: Expand the task to list the specific sections of conventions.md that need updating, or at minimum list the new directories/files to add to the repo structure.

**[MINOR]** Phase 3 purity check verification is good but could be stronger
Phase 3 uses `grep -r "from.*fs" src/core/state/` to verify no I/O imports. This regex could miss imports like `import { readFileSync } from "node:fs"` if formatted differently. The existing test pattern from the research file confirms this is the established convention.
Resolution: DIRECTLY_ACTIONABLE
Fix: Consider also checking for `require("fs")` and `require("node:fs")` patterns, or use a more robust check like `grep -r "node:fs\|\"fs\"" src/core/state/`.

## Score: 7/10

The plan is well-structured with clear bottom-up phasing, good verification at each phase, and strong alignment with the confirmed goal. The main issues preventing a higher score: (1) the epicStatusSchema already exists with correct values, making Phase 1 partially a no-op without acknowledgment; (2) the missing refinement field in the epic schema is a gap that would block Phase 3 implementation; (3) scope boundaries between this slice and slices 04-05 are blurred in Phase 3's slice-submit handlers and Phase 4's generic RPC without explicit acknowledgment. To reach 9+: fix the schema gap, correct the false Before checks, and add explicit scope-crossing notes where slice 03 pulls forward slice 04-05 concerns.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
