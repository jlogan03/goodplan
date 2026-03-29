# Phase 1: StateEvent Types & Status Enums

Extend the type foundation from slice 02 with all epic event types, slice/quest submit events, and error codes. Pure types — no logic, no I/O.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_EPIC" src/schemas/state-events.ts` — no match (only INIT_PROJECT exists)
- [ ] `grep "epicStatusSchema" src/schemas/entities/epic.ts` — no match (schema exists but no status values matching transition-tables.md)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union (~25 event types)
- [ ] `bun test tests/unit/schemas/state-events.test.ts` — all event type tests pass

### Tasks

- [ ] Extend `StateEvent` union in `src/schemas/state-events.ts` with all epic lifecycle events from transition-tables.md: `CREATE_EPIC`, `BEGIN_EXPLORE`, `COMPLETE_EXPLORE`, `BEGIN_ARCHITECTURE`, `COMPLETE_ARCHITECTURE`, `BEGIN_REFINE_ARCHITECTURE`, `COMPLETE_REFINE_ARCHITECTURE`, `BEGIN_SLICING`, `COMPLETE_SLICING`, `BEGIN_REFINE_SLICES`, `COMPLETE_REFINE_SLICES`, `ACTIVATE_EPIC`, `COMPLETE_EPIC`, `ABANDON_EPIC`, `ADD_VERIFICATION`, `UPDATE_VERIFICATION`. Each event carries `ts: string` plus its specific payload fields per transition-tables.md (e.g., `COMPLETE_EPIC` has `verificationResults`, `COMPLETE_REFINE_ARCHITECTURE` has `scores` and optional `override`, `ABANDON_EPIC` has `reason`).
- [ ] Add slice/quest submit events needed by submit commands: `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_QUEST_PLAN`, `COMPLETE_QUEST_REFINEMENT_ROUND`, `COMPLETE_QUEST_IMPLEMENTATION`. Each carries entity name + `ts` + specific payload (e.g., `COMPLETE_REFINEMENT_ROUND` has `scores` and optional `override`).
- [ ] Extend `StateErrorCode` union with new error codes: `STATE_EPIC_ALREADY_ACTIVE`, `STATE_MISSING_VERIFICATIONS`, `STATE_VERIFICATION_FAILED`, `STATE_SLICE_NOT_READY`, `STATE_CONTENT_MISSING`, `STATE_MAX_ROUNDS_REACHED`, `DATA_CONCURRENT_MODIFICATION`
- [ ] Update `epicStatusSchema` values in `src/schemas/entities/epic.ts` to include all statuses from transition-tables.md: created, exploring, explored, defining-architecture, architecture-defined, refining-architecture, architecture-refined, defining-slices, slices-defined, refining-slices, slices-refined, activated, completed, abandoned
- [ ] Update unit tests for StateEvent type coverage and isStateError with new error codes

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/schemas/` passes. All ~25 event types compile correctly in the discriminated union.
