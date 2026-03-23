# Phase 1: Decision & Rollup State Machine

Add CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS to the StateEvent union and implement their pure handlers. Fix O(n²) learnings rollup in existing COMPLETE_SLICE and COMPLETE_QUEST handlers.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_DECISION" src/schemas/state-events.ts` — no match (event not in union)
- [ ] `grep "ROLLUP_LEARNINGS" src/core/state/reduce.ts` — no match (handler not wired)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union
- [ ] `bun test tests/unit/state/` — all tests pass including new decision + rollup tests
- [ ] `bun test tests/unit/schemas/` — event exhaustiveness updated

### Tasks

- [ ] Add `CREATE_DECISION`, `UPDATE_DECISION`, `ROLLUP_LEARNINGS` to `StateEvent` union in `src/schemas/state-events.ts`. Payloads per state-machine-api.md: `CREATE_DECISION` (id, domain, title, summary, ts), `UPDATE_DECISION` (id, changes: Partial<DecisionEntry>, ts), `ROLLUP_LEARNINGS` (from, to, ts).
- [ ] Create `src/core/state/transitions/decision.ts` — CREATE_DECISION handler: guard duplicate id in `decisions.jsonl` via `getJsonl`. Append new `DecisionEntry` with `status: "active"`, `date` from `ts`, `supersededBy: null`. Append activity-log. UPDATE_DECISION handler: find entry by id (error if missing). Apply changes (status transitions per transition-tables.md: active→revisiting, active→superseded, revisiting→active, revisiting→superseded). Set `supersededBy` when transitioning to superseded. Guard: can't update superseded decisions (terminal state). Append activity-log.
- [ ] Create `src/core/state/transitions/rollup-learnings.ts` — ROLLUP_LEARNINGS handler: `getJsonl` source `learnings.jsonl`, filter entries whose `rollupTo` array includes the target scope. `getJsonl` target `learnings.jsonl`, concat filtered entries (batch append — single `setEntry`). Guard: source path must resolve to a valid `learnings.jsonl`. Append activity-log with count of entries rolled up.
- [ ] Fix O(n²) in `src/core/state/transitions/slice-complete.ts`: collect all project-rollup `LearningEntry` items into an array first, then do one `getJsonl("learnings.jsonl")` + concat + `setEntry`. Same for epic-rollup entries. Remove the per-entry `getJsonl` + `setEntry` loop (lines ~93-100).
- [ ] Fix O(n²) in `src/core/state/transitions/quest-complete.ts`: same batch pattern for project-rollup learnings (lines ~68-69).
- [ ] Wire all 3 handlers in `reduce.ts` `handlerRecord`.
- [ ] Update `state-events.test.ts` exhaustiveness (3 new events).
- [ ] Write unit tests:
  - `decision.test.ts`: CREATE_DECISION creates entry with correct shape, duplicate id guard, UPDATE_DECISION status transitions (active→revisiting→active, active→superseded, revisiting→superseded), can't update superseded (terminal), missing id error, activity-log entries for both.
  - `rollup-learnings.test.ts`: filters by `rollupTo` matching target, batch appends to target, missing source error, empty source returns unchanged state, only matching entries rolled up (non-matching entries stay in source only).
  - Verify O(n²) fix: multiple learnings with `rollupTo:["project"]` in a single COMPLETE_SLICE produce correct `learnings.jsonl` with all entries (regression test).

### Verification
`bun test tests/unit/state/` passes. `bun test tests/unit/schemas/` passes. `npx tsc --noEmit` clean. No fs imports in `src/core/state/`.
