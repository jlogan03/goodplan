# Schema and State Machine

## What We're Building

The foundation for nested slice paths: new `epicOverviewSchema` with embedded slices array, `Target` type with `epic` field on slices, `epic` field on all 9 slice state events, updated transition handler paths (`epics/${epic}/slices/${name}`), and updated helper signatures. Remove `sliceSequence` from `epicSchema`. Remove `slices/overview.json` creation from `init.ts`.

## Behavior

1. `epicOverviewSchema` validates `{ items: [{ name, status, created, completed, slices: [...] }] }`
2. `Target` slice variant is `{ type: "slice"; name: string; epic: string }`
3. All 9 slice events carry `epic: string` field
4. Transition handlers construct paths as `epics/${event.epic}/slices/${event.slice}/...`
5. `getSlice`, `setSliceJson`, `setSliceStatus`, `updateSliceOverviewStatus` take `epic` parameter
6. `addSliceToOverview` appends to the epic's embedded `slices` array
7. `epicSchema` no longer has `sliceSequence` field
8. `init.ts` creates `epics/overview.json` with items having `slices: []` but does NOT create `slices/overview.json`
9. All existing unit tests pass (with updated fixture data)

## Verification

- [ ] `tsc --noEmit` — type check passes with new Target type and event shapes
- [ ] `bun test tests/unit/state/` — all state machine tests pass with nested paths
- [ ] `bun test tests/unit/schemas/` — schema tests pass with new epicOverviewSchema
- [ ] `grep -r "slices/overview.json" src/core/state/` — no matches (eliminated from state machine)
- [ ] `grep "sliceSequence" src/schemas/entities/` — no matches (removed from epicSchema)

Build and run unit tests. Verify `reduce()` produces state trees with slices nested under `epics/<epic>/slices/<name>/` by checking a test case output. The fitness tests may need fixture updates — fix any that break.

## Scope Boundaries

**In scope**: Zod schemas, Target type, state events, all `src/core/state/transitions/` handler files, helpers.ts, init.ts, unit tests for state machine and schemas, fitness test fixtures
**Out of scope**: RPC layer, CLI commands, context layer, skills, migration
