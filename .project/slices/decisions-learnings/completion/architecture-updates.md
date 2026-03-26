# Architecture Updates: 06-decisions-learnings

## Changes Made

1. **`commands-api.md`**: Removed `learning:show --id <id>` (intentionally dropped during implementation per user decision). Marked `activity:list` as not-yet-implemented.

2. **`state-machine-api.md`**: Updated during Phase 1 to change `UPDATE_DECISION` payload from `Partial<DecisionEntry>` to `Partial<Omit<DecisionEntry, "id" | "date">>`.

3. **`rpc-layer-api.md`**: Updated during Phase 2 to document `create-decision` phase and rollup target type.

## No Update Needed

- `data-model.md` — accurate as-is
- `transition-tables.md` — accurate as-is
- `state-machine-api.md` — accurate after Phase 1 update

## Deferred

- Subsystem maturity table evaluation — deferred to Step 6f formal evaluation
