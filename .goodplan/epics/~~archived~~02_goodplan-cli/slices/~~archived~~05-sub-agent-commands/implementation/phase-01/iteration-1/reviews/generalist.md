# Generalist Review — Phase 01: Quest Types & Helpers

**Score: 9/10**

## Plan Adherence

All four plan tasks completed:

1. **StateEvent union** — 6 new quest events added with correct field shapes matching transition-tables.md. `STATE_QUEST_ALREADY_ACTIVE` added to `StateErrorCode`. `COMPLETE_QUEST` carries required `learnings` and `architectureDelta` arrays (no `deferred` field), matching the plan exactly.
2. **CompleteInput quest variant** — Extended with optional `learnings?` and `architectureDelta?`, no `deferred`. Correct.
3. **Helper consolidation** — `getQuest`, `guardQuestStatus`, `setQuestJson` moved from `slice-submit.ts` to `helpers.ts`. `guardQuestStatus` upgraded to return `Quest | StateError` (matching `guardSliceStatus` pattern). `setQuestStatus`, `updateQuestOverviewStatus`, `isQuestTerminal` added. `slice-submit.ts` callers updated to use `isStateError()` narrowing. All `quest!` non-null assertions removed. `TODO(slice-05)` removed.
4. **reduce.ts placeholders** — 6 new entries with `() => notImplementedError` pattern. Exhaustiveness check via `satisfies` ensures compile-time coverage.

## Cross-File Integration

- `slice-submit.ts` imports `getQuest`, `guardQuestStatus`, `setQuestJson` from `helpers.js` — correct.
- `reduce.ts` handler record covers all 35 event types via `satisfies` constraint.
- Tests updated to 35 event types with structural validity checks for all new events.

## Code Quality

- `notImplementedError` is a shared constant rather than per-handler inline objects — clean approach. The arrow functions `() => notImplementedError` correctly satisfy `Handler<K>` because the return type `StateError` is assignable to `ProjectState | StateError`.
- Quest helpers in `helpers.ts` follow the exact same patterns as slice/epic helpers (guard returns entity or error, status setter bundles overview sync).
- `guardQuestStatus` return type upgrade from `StateError | null` to `Quest | StateError` eliminates the need for `quest!` assertions — a meaningful type safety improvement.

## Issues

### Important (1)

**Quest handlers in `slice-submit.ts` don't use `setQuestStatus` for overview sync.** The newly added `setQuestStatus` helper bundles `setQuestJson` + `updateQuestOverviewStatus`, mirroring `setSliceStatus`. However, the existing quest handlers (`handleCompleteQuestPlan`, `handleCompleteQuestRefinementRound`, `handleCompleteQuestImplementation`) still call `setQuestJson` directly, skipping overview sync. The slice equivalents use `setSliceStatus`. This is pre-existing behavior (not introduced by this phase), but the plan explicitly said to "update `slice-submit.ts` imports and callers to use shared helpers" — the guard pattern was updated but the status-setting pattern was not. Future phases implementing `CREATE_QUEST`/`BEGIN_QUEST_PLAN`/etc. should use `setQuestStatus`, and ideally the existing handlers should be migrated too. Not blocking since it's a pre-existing gap, but worth noting for phase 2+.

### Minor (1)

**`COMPLETE_QUEST` event field naming inconsistency.** The `CREATE_QUEST` event uses `name` as its identifier field, while all other quest events use `quest`. This matches the pattern of `CREATE_SLICE` (uses `name`) vs other slice events (use `slice`), so it's consistent with the broader codebase convention. No action needed — just documenting the observation.

## Completeness

- All plan tasks checked off.
- Build passes (tsc --noEmit).
- Tests pass (122 tests).
- No `quest!` non-null assertions remain.
- No `TODO(slice-05)` remains.
- Event count correctly updated from 29 to 35 in tests.

## Summary

Clean, well-structured phase. Helper consolidation follows established patterns exactly. The `guardQuestStatus` upgrade to return `Quest | StateError` is the most impactful change — it eliminates a class of non-null assertion bugs. The only substantive gap is that existing quest handlers weren't migrated to use `setQuestStatus` for overview sync, but this is pre-existing behavior and can be addressed when the quest lifecycle handlers are fully implemented in later phases.
