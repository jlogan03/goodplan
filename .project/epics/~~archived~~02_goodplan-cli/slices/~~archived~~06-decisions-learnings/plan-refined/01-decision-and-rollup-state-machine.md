# Phase 1: Decision & Rollup State Machine

Add CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS to the StateEvent union and implement their pure handlers. Fix O(n²) learnings rollup in existing COMPLETE_SLICE and COMPLETE_QUEST handlers.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep "CREATE_DECISION" src/schemas/state-events.ts` — no match (event not in union)
- [x] `grep "ROLLUP_LEARNINGS" src/core/state/reduce.ts` — no match (handler not wired)

**After implementation** (should pass / show presence):
- [x] `npx tsc --noEmit` — passes with full StateEvent union
- [x] `bun test tests/unit/state/` — all tests pass including new decision + rollup tests
- [x] `bun test tests/unit/schemas/` — event exhaustiveness updated

### Tasks

- [x] Add `CREATE_DECISION`, `UPDATE_DECISION`, `ROLLUP_LEARNINGS` to `StateEvent` union in `src/schemas/state-events.ts`. Payloads per state-machine-api.md: `CREATE_DECISION` (id, domain, title, summary, ts), `UPDATE_DECISION` (id, changes: Partial<Omit<DecisionEntry, "id" | "date">>, ts), `ROLLUP_LEARNINGS` (from, to, ts).
- [x] Add new `StateErrorCode` values in `src/schemas/state-events.ts`: `STATE_DUPLICATE_DECISION` for duplicate decision id guard. Reuse `STATE_INVALID_TRANSITION` for terminal-state guard (can't update superseded decisions), for invalid `supersededBy` usage, and for invalid source path in ROLLUP_LEARNINGS.
- [x] Create `src/core/state/transitions/decision.ts` — CREATE_DECISION handler: guard duplicate id in `decisions.jsonl` via `getJsonl` (error: `STATE_DUPLICATE_DECISION`). Append new `DecisionEntry` with `status: "active"`, `date` from `ts`, `supersededBy: null`. Append activity-log. UPDATE_DECISION handler: find entry by id (error if missing). Apply changes (status transitions per transition-tables.md: active→revisiting, active→superseded, revisiting→active, revisiting→superseded). Set `supersededBy` when transitioning to superseded. Guard: can't update superseded decisions — terminal state (error: `STATE_INVALID_TRANSITION`). Guard: `supersededBy` may only be set when status is changing to `superseded` (error: `STATE_INVALID_TRANSITION`). Append activity-log.
- [x] Create `src/core/state/transitions/rollup-learnings.ts` — ROLLUP_LEARNINGS handler: Path resolution: `from` is a relative scope path (e.g., `"slices/01-auth"`) — resolve to `<from>/learnings.jsonl` in the state tree. `to` is a scope label: `"project"` resolves to root `learnings.jsonl`, `"epic"` resolves to `<activeEpicPath>/learnings.jsonl` (read active epic name from `project.json`). `getJsonl` from resolved source path, filter entries whose `rollupTo` array includes a label matching the target scope (e.g., `to: "project"` matches entries with `"project"` in their `rollupTo` array; `to: "epic"` matches `"epic"`). Only matching entries are rolled up — un-tagged entries stay in their source scope. Idempotency: after copying matched entries to target, remove them from source (filter out rolled-up entries and `setEntry` the remaining source list). This prevents duplicates on repeated invocation. `getJsonl` target from resolved target path, concat filtered entries (batch append — single `setEntry`). Guard: resolved source path must contain a valid `learnings.jsonl` (error: `STATE_INVALID_TRANSITION`). Guard: resolved target path must be valid. Append activity-log with count of entries rolled up.
- [x] Fix O(n²) in `src/core/state/transitions/slice-complete.ts` (lines ~89-106): the nested `for (const target of entry.rollupTo)` loop does per-entry `getJsonl` + `setEntry`. Replace with batch operations: collect entries into separate arrays per target scope (one array for epic-rollup entries, one for project-rollup entries), then one `getJsonl` + concat + `setEntry` per target scope. Both epic-rollup and project-rollup paths must use batch operations.
- [x] Fix O(n²) in `src/core/state/transitions/quest-complete.ts`: same batch pattern — collect entries per target scope, then one `getJsonl` + concat + `setEntry` per scope (lines ~68-69).
- [x] Update `state-machine-api.md`: change `UPDATE_DECISION` payload type from `Partial<DecisionEntry>` to `Partial<Omit<DecisionEntry, "id" | "date">>` to match the plan's constraint (preventing id/date mutation). This is an architecture doc update.
- [x] Wire all 3 handlers in `reduce.ts` `handlerRecord`.
- [x] Update `state-events.test.ts` exhaustiveness (3 new events).
- [x] Write unit tests:
  - `decision.test.ts`: CREATE_DECISION creates entry with correct shape, duplicate id guard (`STATE_DUPLICATE_DECISION`), UPDATE_DECISION status transitions (active→revisiting→active, active→superseded, revisiting→superseded), can't update superseded (terminal, `STATE_INVALID_TRANSITION`), `supersededBy` rejected without status→superseded (`STATE_INVALID_TRANSITION`), missing id error, activity-log entries for both.
  - `rollup-learnings.test.ts`: filters by `rollupTo` matching target, batch appends to target, missing source error, empty source returns unchanged state, only matching entries rolled up (non-matching entries stay in source only).
  - Verify O(n²) fix: multiple learnings with `rollupTo:["project"]` in a single COMPLETE_SLICE produce correct `learnings.jsonl` with all entries (regression test).

### Verification
`bun test tests/unit/state/` passes. `bun test tests/unit/schemas/` passes. `npx tsc --noEmit` clean. No fs imports in `src/core/state/`.
