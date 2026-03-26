# Schema and State Machine

## What We're Building

The foundation for nested slice paths: new `epicOverviewSchema` with embedded slices array, `Target` type with `epic` field on slices, `epic` field on all 9 slice state events, updated transition handler paths (`epics/${epic}/slices/${name}`), and updated helper signatures. Remove `sliceSequence` from `epicSchema`. Remove `slices/overview.json` creation from `init.ts`. Update schema registry to map new nested path patterns. Add epic overview helpers (`updateOverviewStatus`, `addEpicToOverview`, new `addSliceToOverview`). Add required `targetEpic` field to `DeferredItem` type (defaults to completing slice's epic). Update activity log scope strings in transition handlers.

## Behavior

1. `epicOverviewSchema` validates `{ items: [{ name, status, created, completed, slices: [...] }] }`
2. `Target` slice variant is `{ type: "slice"; name: string; epic: string }`
3. All 9 slice events carry `epic: string` field
4. Transition handlers construct paths as `epics/${event.epic}/slices/${event.slice}/...`
5. `getSlice`, `setSliceJson`, `setSliceStatus`, `updateSliceOverviewStatus` take `epic` parameter
6. `updateOverviewStatus` operates on `EpicOverview` type (preserves `slices` array on spread)
7. `addEpicToOverview` creates entries with `slices: []`
8. `addSliceToOverview` appends to the epic's embedded `slices` array; `CREATE_SLICE` handler uses it
9. Schema registry: `epics/overview.json` → `epicOverviewSchema`, `epics/[^/]+/slices/[^/]+/slice.json` → `sliceSchema`, remove old flat `slices/` patterns
10. `epicSchema` no longer has `sliceSequence` field; `buildInitialEpicJson` drops `sliceSequence`
11. `init.ts` creates `epics/overview.json` with items having `slices: []` but does NOT create `slices/overview.json`
12. `DeferredItem` type gains `targetEpic: string` field (required) for slice-scoped deferred items — defaults to the completing slice's own epic (same-epic routing). Transition handlers populate it from `event.epic` at creation time. Existing deferred items in persisted data are backfilled during migration (slice 05)
13. Activity log scope strings in transition handlers use nested format (`epics/${epic}/slices/${name}`)
14. `slice-submit.ts` path references updated (5 flat path references → nested)
15. `slice-complete.ts` path references updated for nested layout (~10 flat references): learnings.jsonl read/write, architecture-deltas.jsonl read/write, deferred routing (`getSlice`/`setSliceJson` with epic param), and activity log scope strings — all use `epics/${epic}/slices/${name}` format
16. All existing unit tests pass (with updated fixture data)
17. All fitness tests pass (fixture updates included in this slice)

Note: Updated helper signatures (e.g., `getSlice(epic, name)`) are exercised only through unit tests in this slice. Full CLI integration deferred to slice 02.

## Verification

- [ ] `tsc --noEmit` — type check passes with new Target type and event shapes
- [ ] `bun test tests/unit/state/` — all state machine tests pass with nested paths
- [ ] `bun test tests/unit/schemas/` — schema tests pass with new epicOverviewSchema
- [ ] `bun test tests/fitness/` — all fitness tests pass with updated fixtures
- [ ] `bun test` — full test suite (confirms no regressions from schema registry or helper changes)
- [ ] Verify `reduce()` produces state trees with slices under `epics/<epic>/slices/` — run a test case and inspect output
- [ ] `grep -r '"slices/' src/core/state/transitions/` — no flat slice path references remain in transition handlers (covers slice-complete.ts, slice-submit.ts, and all others)
- [ ] `grep -r "slices/overview.json" src/core/state/` — no matches (eliminated from state machine)
- [ ] `grep -r "slices/overview.json" src/core/data/` — no matches (schema registry updated)
- [ ] `grep "sliceSequence" src/schemas/entities/` — no matches (removed from epicSchema)

Build and run full test suite. Verify `reduce()` produces state trees with slices nested under `epics/<epic>/slices/<name>/` by checking a test case output.

Update architecture docs affected by this slice: `data-model.md` (schema shapes), `state-machine-api.md` (helper signatures, event fields).

## Scope Boundaries

**In scope**: Zod schemas, Target type, DeferredItem type, state events, all `src/core/state/transitions/` handler files, helpers.ts, init.ts, schema registry (`src/core/data/schema-registry.ts`), epic overview helpers (`updateOverviewStatus`, `addEpicToOverview`, `addSliceToOverview`), activity log scope strings, `slice-submit.ts`, unit tests for state machine and schemas, fitness test fixtures
**Out of scope**: RPC layer (except schema registry — that's Data Layer), CLI commands, context layer, skills, migration
