# Phase 1: Quest Types & Helpers

Add the remaining quest event types to the StateEvent union, extend CompleteInput with quest learnings/architectureDelta fields, and consolidate quest helpers from `slice-submit.ts` to `helpers.ts`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_QUEST" src/schemas/state-events.ts` — no match (only COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION exist)
- [ ] `grep "getQuest" src/core/state/transitions/helpers.ts` — no match (quest helpers are local to slice-submit.ts)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union including all quest events
- [ ] `bun test tests/unit/schemas/` — all tests pass
- [ ] `grep "getQuest" src/core/state/transitions/helpers.ts` — match found (helpers consolidated)

### Tasks

- [x] Extend `StateEvent` union in `src/schemas/state-events.ts` with 6 quest lifecycle events per transition-tables.md. Also add `STATE_QUEST_ALREADY_ACTIVE` to the `StateErrorCode` union (used by Phase 2's `BEGIN_QUEST_PLAN` guard). Events: `CREATE_QUEST` (name, goal, ts), `BEGIN_QUEST_PLAN` (quest, ts), `BEGIN_QUEST_REFINEMENT` (quest, ts), `BEGIN_QUEST_IMPLEMENTATION` (quest, ts), `COMPLETE_QUEST` (quest, ts, verificationPassed, learnings: LearningInput[], architectureDelta: ArchitectureDeltaInput[] — both **required** arrays, not optional, matching `COMPLETE_SLICE` pattern; NO deferred field, quests don't route deferred work), `ABANDON_QUEST` (quest, ts, reason). All carry `ts: string`. Note: COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION already exist from slice 03. Optionality for learnings/architectureDelta lives only on `CompleteInput` (RPC boundary) — the RPC layer coerces `undefined` → `[]` using conditional spread for `exactOptionalPropertyTypes` compliance.
- [x] Extend the `CompleteInput` quest variant in `src/core/rpc/types.ts` — currently `{ type: "quest"; verificationPassed: boolean }`. Add optional fields: `learnings?: LearningInput[]`, `architectureDelta?: ArchitectureDeltaInput[]`. No `deferred` field (quests don't do deferred routing).
- [x] Consolidate quest helpers from `slice-submit.ts` to `helpers.ts`: move `getQuest`, `guardQuestStatus`, `setQuestJson`. Upgrade `guardQuestStatus` to return `Quest | StateError` (matching `guardSliceStatus` pattern). Add `setQuestStatus` (bundles status + overview sync + timestamp, matching `setSliceStatus`), `updateQuestOverviewStatus`, `isQuestTerminal`. Update `slice-submit.ts` imports and callers to use shared helpers with `isStateError()` narrowing (remove `quest!` non-null assertions). Remove the `TODO(slice-05)` comment.
- [x] Update the `satisfies` handler record in `reduce.ts` — add placeholder entries for the 6 new quest event types. Create a `handleNotImplemented` helper (one-liner returning `{ ok: false, code: 'STATE_INVALID_TRANSITION', message: 'Not yet implemented' }`) or use inline arrow functions returning the same StateError shape.
- [x] Update unit tests for StateEvent type coverage (extend exhaustiveness array and count for 6 new events)

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/schemas/` passes. Quest helpers in `helpers.ts`, not `slice-submit.ts`.
