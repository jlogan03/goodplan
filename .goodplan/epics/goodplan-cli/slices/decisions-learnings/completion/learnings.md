# Learnings: 06-decisions-learnings

## Global flag additions require mechanical audit of all existing commands

Adding `--query` to shared `output()` was insufficient — ~40 existing command files still gated structured output behind `if (args.json)` only. Future plans adding global behaviors must include an explicit task to grep and update all command files, not just modify the shared utility.

## Non-entity RPC operations need dedicated return types

`learning:rollup` was forced into the entity-shaped `begin()` Target/BeginResult contract using a fake `{ type: "decision", id: "rollup" }` target. All 4 reviewers flagged this as critical. When an operation doesn't fit the entity pattern, design a dedicated type (e.g., `RollupResult`) rather than faking the existing shape.

## Architecture doc updates must be gated tasks per phase

Both `rpc-layer-api.md` and `state-machine-api.md` drifted from implementation because doc updates were consolidated into Phase 4. The implementation agent doesn't revisit earlier phases' docs. Future plans should include architecture doc updates as tasks within each phase that changes behavior.

## Dual mechanisms for the same domain need explicit ownership rules

Auto-rollup (during COMPLETE_SLICE/COMPLETE_QUEST) and manual rollup (ROLLUP_LEARNINGS) target the same `learnings.jsonl` data. Without dedup-on-append, repeated rollup would duplicate entries. When two mechanisms touch the same data, the plan must specify interaction semantics and idempotency upfront.

## Drift detection tests should verify shapes, not just key presence

The INV-006 command registry drift test initially only checked that registry keys matched citty command keys, missing that arg definitions could diverge. Registry-style tests should assert structural equality (key sets, types, defaults) to catch drift at the contract level.

## `exactOptionalPropertyTypes` conditional spread pattern is confirmed

For Zod schemas with optional fields feeding into types requiring exact optional properties, conditionally spread only defined keys. This pattern worked cleanly across `decision:update` and RPC payload types — it's the canonical workaround until Zod v4 provides native support.
