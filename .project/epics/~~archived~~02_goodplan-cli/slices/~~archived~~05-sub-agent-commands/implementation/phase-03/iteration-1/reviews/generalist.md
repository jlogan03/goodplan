# Phase 03 Review: Quest RPC & CLI

**Reviewer**: Generalist
**Score**: 9/10
**Critical**: 0, **Important**: 1, **Minor**: 2

---

## Plan Adherence

All plan tasks are fully implemented:

- `begin()` extended for quest targets (create, plan, refine-plan, implement, abandon) — confirmed in `begin.ts` lines 149-234.
- `complete()` extended for quest targets with `?? []` coercion for learnings/architectureDelta — confirmed in `complete.ts` lines 89-104.
- `buildBeginResult` extended for quest targets deriving proper statuses from state tree — confirmed in `begin.ts` lines 265-270.
- `buildCompleteResult` extended for quest targets with `learningsRolledUp` and `architecturePaths` — confirmed in `complete.ts` lines 244-280.
- `resolveStatuses` in `submit.ts` fixed for quest targets — confirmed in `submit.ts` lines 221-228.
- All 8 CLI commands created (create, list, show, plan, refine-plan, implement, complete, abandon).
- Commands registered in `main.ts` under `quest:` namespace.
- Zod schemas created in `schemas/commands/quest.ts`.
- Tests cover all commands, output modes, and full lifecycle.

## Cross-File Integration

Excellent integration across layers:

- `CompleteInput` union in `types.ts` (line 131-136) already includes `quest` variant with correct optional fields (no `deferred`).
- `resolveEntityName` and `resolveEntityJsonPath` in `types.ts` handle quest targets.
- CLI commands correctly use conditional spread for optional fields at the boundary (`complete.ts` lines 44-48), matching the `slice:complete` pattern exactly.
- RPC layer uses `?? []` coercion (not conditional spread), matching the plan's instruction to follow `slice-complete.ts` lines 83-85 pattern.

## Code Reuse

Strong pattern reuse from slice commands:

- `quest:list` follows `slice:list` format minus epic column (as specified).
- `quest:show` follows `slice:show` format minus epic/deferred lines.
- `quest:complete` mirrors `slice:complete` structure but omits deferred handling and epic-level learnings.
- Helper functions `buildPlanPhaseEvent`, `buildRefinePlanEvent`, `buildImplementEvent` reused by adding quest switch cases.
- `buildQuestCompleteResult` correctly scopes learnings rollup to project-only (no epic-level).

## Completeness

Tests are thorough: individual command tests for JSON/human-readable/quiet modes, plus a full lifecycle integration test walking create -> plan -> submit -> refine -> submit -> implement -> submit -> complete -> verify via show.

---

## Issues

### Important

1. **`quest:complete` reads quest name from `input.quest` but schema merges `--quest` flag into stdin** (`complete.ts` line 40: `name: input.quest`). This works because `validateInput` merges args into stdin, but the `completeQuestInputSchema` includes a `quest` field that must come from the `--quest` flag. The `slice:complete` schema follows the same pattern (`completeSliceInputSchema` has a `slice` field). However, if a user provides `quest` in both stdin JSON and `--quest` flag, the behavior depends on merge order in `validateInput`. This is an existing pattern-level concern, not new to this phase, but worth noting since the plan called out "proper narrowing for quest name (not `input.quest!` non-null assertion)". The implementation does use proper narrowing via Zod validation — so the plan instruction is satisfied.

### Minor

1. **`quest:list` uses `quests/overview.json`** — the Overview type is imported from `schemas/entities/overview.js` which was designed for slices (items have `epic` field). The quest overview may have a different shape. If the quest overview items lack the `epic` field, the `item.completed` access at line 43 depends on the quest overview item schema having `completed: string | null`. This works if the state machine produces the same overview item shape for quests, but could be fragile if quest overview items diverge from slice overview items in the future.

2. **`quest:show` does not display `completed` timestamp** in human-readable output (lines 43-53), while it does exist on the entity. Minor omission compared to `slice:show` which shows completion status.
