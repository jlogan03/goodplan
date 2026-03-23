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

- [ ] Create `src/core/state/transitions/quest-create.ts` — CREATE_QUEST handler. Creates `quests/<name>/quest.json` (with goal, status: created, refinement: null, created/updated from ts). Creates `quests/<name>/` directory structure. Errors if `quests/overview.json` is absent (matching `slice-create.ts` error-if-missing pattern — `init.ts` already creates it unconditionally), then appends item. Overview item shape: `{ name: string, status: QuestStatus, created: event.ts, completed: null }` (no `epic` field — quests are project-scoped; `created`/`completed` required by `overviewItemSchema`). Appends activity-log entry. Guard: quest name must not already exist. Use the same helper patterns from slice-create (setEntry for directories).
- [ ] Create `src/core/state/transitions/quest-plan.ts` — BEGIN_QUEST_PLAN handler. Guard: `activeQuest == null` — reject with `STATE_QUEST_ALREADY_ACTIVE` if another quest is already active (user must complete or abandon it first). Follow the `getProject` + `setEntry` pattern from `slice-plan.ts` for `project.json` mutations (setting `activeQuest`). Sets quest status to `planning`. Appends activity-log.
- [ ] Create `src/core/state/transitions/quest-implement.ts` — BEGIN_QUEST_REFINEMENT handler: unconditional from `plan-created`, sets `refining`, initializes refinement field `{ round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] }`. BEGIN_QUEST_IMPLEMENTATION handler: guard `hasChild(state, "quests/<name>", "plan-refined.md")` — STATE_CONTENT_MISSING if absent. Sets `implementing`. Both append activity-log. Do NOT set `activeQuest` here — it is already set by `BEGIN_QUEST_PLAN` and these transitions happen within an already-active quest (consistent with the slice pattern and transition tables). Note: COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION already implemented in slice 03's `slice-submit.ts`.
- [ ] Create `src/core/state/transitions/quest-complete.ts` — COMPLETE_QUEST handler:
  1. **Guard**: status == implementation-complete AND verificationPassed == true. If verificationPassed == false → STATE_VERIFICATION_FAILED.
  2. **Learnings**: Transform `LearningInput` to `LearningEntry` (add `source: \`quests/${event.quest}\``, `rollup: learning.rollupTo.length > 0`). Write to `quests/<name>/learnings.jsonl`. For `rollupTo` containing `"project"`, append to top-level `learnings.jsonl`. Note: quests are project-scoped, so `rollupTo: "epic"` entries are silently skipped (no epic to roll up to). Document this behavior in a code comment.
  3. **Architecture deltas**: transform `ArchitectureDeltaInput[]` to `ArchitectureDelta[]` by injecting `ts` from `event.ts` (matching `slice-complete.ts` lines 112–113: `event.architectureDelta.map((d) => ({ ...d, ts: event.ts }))`). Write to `quests/<name>/architecture-deltas.jsonl`.
  4. **Status**: set quest to `completed`, call `updateQuestOverviewStatus`.
  5. **Clear activeQuest**: set `project.json` activeQuest to null (using `getProject` + `setEntry` pattern from `slice-plan.ts`).
- [ ] Create `src/core/state/transitions/quest-abandon.ts` — ABANDON_QUEST handler. Guard: status is non-terminal (not completed, not abandoned). Sets abandoned, records reason. Calls `updateQuestOverviewStatus`. Clears activeQuest if this was the active quest. Appends activity-log.
- [ ] Update `transition-tables.md`: set `BEGIN_QUEST_PLAN` guard to `activeQuest == null` (currently shows "—"), and add a "one-active-quest" entry to the Cross-Cutting Guards table. This is the source-of-truth update for the guard implemented in `quest-plan.ts`.
- [ ] Replace Phase 1's placeholder stubs in `reduce.ts` handler record with real handler imports.
- [ ] Export transition tables from each handler file as typed arrays.
- [ ] Write unit tests organized by handler file:
  - quest-create: CREATE_QUEST produces quest.json + overview update + activity log. Duplicate name guard. Missing `quests/overview.json` → error (init.ts creates it unconditionally). Overview item includes `created` and `completed: null`.
  - quest-plan: BEGIN_QUEST_PLAN succeeds from created when no activeQuest. Rejects with `STATE_QUEST_ALREADY_ACTIVE` when another quest is active. Sets activeQuest.
  - quest-implement: BEGIN_QUEST_REFINEMENT initializes refinement. BEGIN_QUEST_IMPLEMENTATION guards plan-refined.md.
  - quest-complete: COMPLETE_QUEST happy path (learnings appended, architectureDelta recorded, status completed, activeQuest cleared). verificationPassed: false → error. learningsRolledUp to project level.
  - quest-abandon: from various non-terminal states, terminal → error, clears activeQuest if active.
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes. `grep -r "from.*fs" src/core/state/` returns nothing. Full quest lifecycle exercisable through reduce() directly.
