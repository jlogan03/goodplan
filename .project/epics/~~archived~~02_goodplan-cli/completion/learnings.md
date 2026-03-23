# Epic Learnings — goodplan-cli

## The 4-layer architecture held up across all 8 slices without boundary changes

Strict unidirectional dependencies (Commands → RPC → State Machine → Data Layer) and the pure reducer pattern made each slice formulaic after slice 02 proved the model. The only tension was cross-layer type sharing, resolved with `src/core/tree.ts` as a shared types module. Future epics should invest in the layer model early — it paid dividends through the entire epic.

## Reducer purity is the highest-leverage architectural constraint

INV-003 (no I/O in state machine) meant every handler was trivially unit-testable and deterministic. It forced clean separation: timestamps via event payloads, overview sync via bundling helpers, computed values derived in RPC. The cost was small (RPC injects `ts`, helpers bundle operations); the benefit was 166 unit tests that run in milliseconds. Preserve this constraint aggressively in future work.

## The satisfies + handlerRecord pattern gives compile-time exhaustiveness for handler maps

With `noUncheckedIndexedAccess`, `Map.get()` returns `T | undefined`. Using `satisfies Record<K, Handler<K>>` on a plain object catches missing handlers at compile time before Map conversion. This pattern repeated across 37 event types and should be the standard for any typed handler registry.

## Plans referencing CLI commands must be verified against source during planning

Slices 06, 07, and 08 all had plan inaccuracies (wrong error codes, missing commands, imprecise sequences). The fix is mechanical: grep `src/commands/main.ts` and `src/util/errors.ts` during `/create-plan`. This would have saved refinement cycles across 3 slices.

## Novel modules accumulate 3-5x more review issues than pattern-following code

Context bundling (slice 05, no precedent) had 8 issues; quest state machine (following slice patterns) had 0. Budget extra review iterations for phases introducing new subsystems or patterns. Pattern-following code often passes review on the first iteration.

## Overview sync must be bundled into every status-changing operation

Three slices (03, 04, 05) independently discovered that forgetting to sync overview fields creates data inconsistency. The `setSliceStatus`/`setQuestStatus` bundling helpers are the correct pattern — any future entity type must have an equivalent helper from day one.
