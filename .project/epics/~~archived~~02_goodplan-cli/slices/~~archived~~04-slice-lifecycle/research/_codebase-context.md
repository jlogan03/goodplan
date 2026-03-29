# Codebase Context: Slice Lifecycle (04)

## Fresh Documentation

All architecture docs updated during slice 03 completion (2026-03-22) and match current code:

- `transition-tables.md` — Complete slice transition spec (source of truth for state machine)
- `state-machine-api.md` — Full StateEvent union including all slice events with typed payloads
- `rpc-layer-api.md` — Complete CompleteInput union with slice variant (deferred, learnings, architectureDelta)
- `commands-api.md` — Full slice:* command surface with stdin examples
- `data-model.md` — slice.json schema, learnings.jsonl, architecture-deltas.jsonl formats
- `invariants.md` — 7 invariants, all current
- `_overview.md` — 4-layer architecture with subsystem maturity levels
- `.project/learnings.md` — 30+ learnings. Key: "Overview.json must be synced by every status-changing handler", guard helpers return `Entity | StateError`, universal `ts` convention
- `.project/conventions.md` — Current tech stack, repo structure, test patterns

## Stale Documentation

None detected. All architecture files updated during slice 03 completion commit `f8d82df`.

## Recent Development Activity

All 20 recent commits from 2026-03-21/22. Slices 01-03 completed in ~2 days. Consistent bottom-up phasing: types → state machine → RPC → commands → integration.

## Key Patterns and Conventions

**State machine:** Reducer in `src/core/state/reduce.ts` uses `satisfies`-checked handler record. Handlers organized by domain (e.g., `epic-create.ts`). Helpers in `transitions/helpers.ts`: `getEpic`, `guardEpicStatus` (returns `Epic | StateError`), `setEpicStatus`, `updateOverviewStatus`, `appendActivityLog`, `evaluateRefinement`, `MAX_REFINEMENT_ROUNDS`.

**Existing slice code (from slice 03):** `slice-submit.ts` handles COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION. Has local helpers `getSlice`/`guardSliceStatus`/`setSliceJson` using older `StateError | null` pattern (diverges from `Entity | StateError` in learnings).

**StateEvent union:** Already includes submit events. Missing: CREATE_SLICE, BEGIN_PLAN, BEGIN_REFINEMENT, BEGIN_IMPLEMENTATION, COMPLETE_SLICE, ABANDON_SLICE. `SliceStatus` enum and `Slice` entity schema already complete. `DeferredItem` schema exists.

**RPC layer:** `begin()` switches on phase then target.type. Currently throws "not yet implemented" for slice-specific phases. `complete()` throws for `target.type === 'slice'`. `CompleteInput` has basic slice variant but lacks deferred/learnings/architectureDelta. `BeginPayloadMap` `create` entry needs expansion for slice creation (needs epic field).

**CLI commands:** `defineCommand` pattern with meta, args, setup, run. Input via `readStdin()` + `validateInput()`. Output via `output()` with json/quiet/default. Registration in `main.ts` as flat colon-namespaced keys.

**Tests:** State machine tests chain `reduce()` from `ZERO_STATE`. RPC tests use real filesystem (tmpDir). Slice submit tests use `setEntry()` fixtures (CREATE_SLICE doesn't exist yet).

## Key Risk Area

`slice-submit.ts` local helpers use `StateError | null` guard pattern. New slice handlers should use `Entity | StateError` pattern per learnings. Plan should address this inconsistency.

## Areas of Active Churn vs Stability

**Churn:** state-events.ts, reduce.ts, transitions/, begin.ts, complete.ts, types.ts, main.ts, new slice command files.
**Stable:** tree.ts, data/ layer, util/, entities/slice.ts, shared.ts schemas.
