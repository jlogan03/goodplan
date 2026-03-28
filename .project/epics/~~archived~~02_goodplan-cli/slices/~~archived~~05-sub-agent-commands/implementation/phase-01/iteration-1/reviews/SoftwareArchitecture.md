# Software Architecture Review — Phase 1: Quest Types & Helpers

## Issues

**[IMPORTANT]** Quest submit handlers use `setQuestJson` instead of `setQuestStatus`, skipping overview sync

The three existing quest submit handlers in `slice-submit.ts` (`handleCompleteQuestPlan`, `handleCompleteQuestRefinementRound`, `handleCompleteQuestImplementation`) all call `setQuestJson()` directly with manual status/timestamp updates. The newly created `setQuestStatus()` helper in `helpers.ts` bundles status change + `updated` timestamp + overview sync — exactly matching the `setSliceStatus()` pattern used by all slice handlers.

The quest handlers were written before `setQuestStatus` existed (they were part of slice 03/04), and this phase only consolidated the helpers without updating callers to use the deeper helper. This means quest status changes do NOT sync `quests/overview.json`, while all slice and epic status changes DO sync their respective overviews. This is an inconsistency that will cause `quests/overview.json` to drift out of sync with actual quest statuses.

The plan says to "Add `setQuestStatus` (bundles status + overview sync + timestamp, matching `setSliceStatus`)" and to "Update `slice-submit.ts` imports and callers to use shared helpers." The helper was added but the callers were not migrated to use `setQuestStatus`.

File: src/core/state/transitions/slice-submit.ts:178
Resolution: DIRECTLY_ACTIONABLE

Fix: Replace `setQuestJson(state, event.quest, { ...questOrErr, status: "<newStatus>", updated: event.ts })` calls with `setQuestStatus(state, event.quest, questOrErr, "<newStatus>", event.ts)` in all three quest handlers. Import `setQuestStatus` from helpers and remove the now-unused direct `setQuestJson` import (or keep it if the refinement handler needs to set both status and refinement fields — in which case use `setQuestJson` for the compound update but follow it with `updateQuestOverviewStatus`).

Note: The refinement handler has a compound update (status + refinement field). For that case, either (a) call `setQuestJson` for the compound update then `updateQuestOverviewStatus` separately, or (b) extend `setQuestStatus` to accept an optional entity override. Option (a) is simpler and matches how `setSliceStatus` callers handle compound updates (they spread the extra fields into the slice before calling `setSliceStatus`). Looking at `handleCompleteRefinementRound` for slices: it passes `{ ...sliceOrErr, refinement: finalRefinement }` as the slice arg to `setSliceStatus`. The quest handlers should do the same: `setQuestStatus(state, event.quest, { ...questOrErr, refinement: finalRefinement }, "plan-refined", event.ts)`.

**[MINOR]** `notImplementedError` is a shared mutable reference (though immutable in practice)

`notImplementedError` in `reduce.ts` is a single `const` object reference returned by all 6 placeholder handlers. Since the reducer's callers never mutate the returned error, this is safe today. However, if any future code path were to add properties to the returned error (e.g., attaching event context), all placeholders would share the mutation. Consider using `Object.freeze()` on the error or making each placeholder return a new object.

File: src/core/state/reduce.ts:57
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation correctly adds the 6 new event types to the `StateEvent` union, adds `STATE_QUEST_ALREADY_ACTIVE` to the error code union, consolidates quest helpers into `helpers.ts` with the upgraded `guardQuestStatus` return type (now `Quest | StateError` matching the slice/epic pattern), extends `CompleteInput`, adds placeholder handlers in the reducer with compile-time exhaustiveness, and updates tests. The helper consolidation is clean and follows existing patterns precisely.

The score is held back by the overview sync gap: quest submit handlers still use `setQuestJson` directly instead of the new `setQuestStatus`, meaning quest status changes don't sync `quests/overview.json`. This is the exact kind of inconsistency the helper consolidation was meant to prevent. Fixing this brings it to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
