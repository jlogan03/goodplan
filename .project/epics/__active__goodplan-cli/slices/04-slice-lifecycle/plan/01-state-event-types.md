# Phase 1: StateEvent Types & Supporting Schemas

Add the remaining slice event types to the discriminated union and create Zod schemas for the complex CompleteInput payload types (Learning, ArchitectureDelta).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_SLICE" src/schemas/state-events.ts` — no match (only epic + submit events exist)
- [ ] `grep "learningSchema" src/schemas/` — no match (Learning exists as TS interface in architecture but no Zod schema)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union including all slice events
- [ ] `bun test tests/unit/schemas/` — all tests pass

### Tasks

- [ ] Extend `StateEvent` union in `src/schemas/state-events.ts` with 6 slice lifecycle events per state-machine-api.md: `CREATE_SLICE` (name, epic, goal, ts), `BEGIN_PLAN` (slice, ts), `BEGIN_REFINEMENT` (slice, ts), `BEGIN_IMPLEMENTATION` (slice, ts), `COMPLETE_SLICE` (slice, ts, verificationPassed, deferred, learnings, architectureDelta), `ABANDON_SLICE` (slice, ts, reason). All carry `ts: string` per universal convention. Note: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION already exist from slice 03.
- [ ] Create `src/schemas/shared-records.ts` (or extend existing file) with Zod schemas for CompleteInput payload types: `learningSchema` (category enum, summary, detail, tags, rollupTo array), `architectureDeltaSchema` (subsystem, type enum, description — `ts` is injected by RPC, not in input schema). `DeferredItem` already has `deferredItemSchema` in `src/schemas/entities/slice.ts` — verify it matches the architecture spec and reuse it.
- [ ] Extend `CompleteInput` in `src/core/rpc/types.ts` — the slice variant should include the full optional fields: `deferred?: DeferredItem[]`, `learnings?: Learning[]`, `architectureDelta?: ArchitectureDelta[]`. Import the inferred types from the new Zod schemas.
- [ ] Update the `satisfies` handler record in `reduce.ts` — add placeholder entries for the 6 new event types pointing to `handleNotImplemented` (a stub that returns STATE_INVALID_TRANSITION with message "not yet implemented — see slice 04 Phase 2"). This preserves compile-time exhaustiveness while Phase 2 implements the real handlers.
- [ ] Update unit tests for StateEvent type coverage (extend the exhaustiveness array and count)

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/schemas/` passes. The discriminated union includes all slice events with correct payloads.
