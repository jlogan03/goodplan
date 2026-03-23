# Phase 2: Quest State Machine

All quest transition handlers. Pure functions, no I/O. Simpler than slice — no sequential enforcement, no deferred work routing, no epic association.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/transitions/quest-create.ts` — file not found
- [ ] `grep "CREATE_QUEST" src/core/state/reduce.ts` — matches only placeholder stub from Phase 1

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/state/` — all state machine tests pass (existing + new)
- [ ] `grep -r "from.*fs" src/core/state/` — returns nothing (purity preserved)
- [ ] `npx tsc --noEmit` — passes

### Tasks

- [ ] Create `src/core/state/transitions/quest-create.ts` — CREATE_QUEST handler. Creates `quests/<name>/quest.json` (with goal, status: created, refinement: null, created/updated from ts). Creates `quests/<name>/` directory structure. Updates `quests/overview.json` (adds item — no `epic` field since quests are project-scoped). Appends activity-log entry. Guard: quest name must not already exist. Use the same helper patterns from slice-create (setEntry for directories).
- [ ] Create `src/core/state/transitions/quest-plan.ts` — BEGIN_QUEST_PLAN handler. No sequential enforcement guard (quests are independent). Sets `project.json` activeQuest. Sets quest status to `planning`. Appends activity-log.
- [ ] Create `src/core/state/transitions/quest-implement.ts` — BEGIN_QUEST_REFINEMENT handler: unconditional from `plan-created`, sets `refining`, initializes refinement field `{ round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] }`. BEGIN_QUEST_IMPLEMENTATION handler: guard `hasChild(state, "quests/<name>", "plan-refined.md")` — STATE_CONTENT_MISSING if absent. Sets `implementing`. Both append activity-log and set activeQuest. Note: COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION already implemented in slice 03's `slice-submit.ts`.
- [ ] Create `src/core/state/transitions/quest-complete.ts` — COMPLETE_QUEST handler:
  1. **Guard**: status == implementation-complete AND verificationPassed == true. If verificationPassed == false → STATE_VERIFICATION_FAILED.
  2. **Learnings**: Transform `LearningInput` to `LearningEntry` (add `source: \`quests/${event.quest}\``, `rollup: learning.rollupTo.length > 0`). Write to `quests/<name>/learnings.jsonl`. For `rollupTo` containing `"project"`, append to top-level `learnings.jsonl`. Note: no `"epic"` rollup for quests since they are project-scoped.
  3. **Architecture deltas**: write `event.architectureDelta` to `quests/<name>/architecture-deltas.jsonl`. Deltas arrive with `ts` already injected by RPC layer.
  4. **Status**: set quest to `completed`, call `updateQuestOverviewStatus`.
  5. **Clear activeQuest**: set `project.json` activeQuest to null.
- [ ] Create `src/core/state/transitions/quest-abandon.ts` — ABANDON_QUEST handler. Guard: status is non-terminal (not completed, not abandoned). Sets abandoned, records reason. Calls `updateQuestOverviewStatus`. Clears activeQuest if this was the active quest. Appends activity-log.
- [ ] Replace Phase 1's placeholder stubs in `reduce.ts` handler record with real handler imports.
- [ ] Export transition tables from each handler file as typed arrays.
- [ ] Write unit tests organized by handler file:
  - quest-create: CREATE_QUEST produces quest.json + overview update + activity log. Duplicate name guard.
  - quest-plan: BEGIN_QUEST_PLAN succeeds from created (no sequential enforcement). Sets activeQuest.
  - quest-implement: BEGIN_QUEST_REFINEMENT initializes refinement. BEGIN_QUEST_IMPLEMENTATION guards plan-refined.md.
  - quest-complete: COMPLETE_QUEST happy path (learnings appended, architectureDelta recorded, status completed, activeQuest cleared). verificationPassed: false → error. learningsRolledUp to project level.
  - quest-abandon: from various non-terminal states, terminal → error, clears activeQuest if active.
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes. `grep -r "from.*fs" src/core/state/` returns nothing. Full quest lifecycle exercisable through reduce() directly.
