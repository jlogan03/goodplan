# Phase 1: StateEvent Types & Status Enums

Extend the type foundation from slice 02 with all epic event types, slice/quest submit events, and error codes. Pure types — no logic, no I/O.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_EPIC" src/schemas/state-events.ts` — no match (only INIT_PROJECT exists)
- [ ] `grep "refinementSchema\|refinement:" src/schemas/entities/epic.ts` — no match (no refinement tracking field)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union (~25 event types)
- [ ] `bun test tests/unit/schemas/state-events.test.ts` — all event type tests pass

### Tasks

- [ ] Amend `state-machine-api.md`: add `ts: string` to `CREATE_EPIC` and `ACTIVATE_EPIC` event definitions in the canonical StateEvent union (currently only INIT_PROJECT has `ts`). This must be done before implementing event types in `state-events.ts` so the architecture doc remains the source of truth.
- [ ] Extend `StateEvent` union in `src/schemas/state-events.ts` with all **in-scope** epic lifecycle events from transition-tables.md: `CREATE_EPIC`, `BEGIN_EXPLORE`, `COMPLETE_EXPLORE`, `BEGIN_ARCHITECTURE`, `COMPLETE_ARCHITECTURE`, `BEGIN_REFINE_ARCHITECTURE`, `COMPLETE_REFINE_ARCHITECTURE`, `BEGIN_SLICING`, `COMPLETE_SLICING`, `BEGIN_REFINE_SLICES`, `COMPLETE_REFINE_SLICES`, `ACTIVATE_EPIC`, `COMPLETE_EPIC`, `ABANDON_EPIC`, `ADD_VERIFICATION`, `UPDATE_VERIFICATION` (16 epic events). Per state-machine-api.md, `ts: string` is NOT universal — only events that set timestamp fields carry `ts`. Specifically: `CREATE_EPIC` (sets `created`, `updated`) and `ACTIVATE_EPIC` (sets `activated`) need `ts` (as amended above). Other events carry only their specific payload fields per the canonical union (e.g., `COMPLETE_EPIC` has `verificationResults`, `COMPLETE_REFINE_ARCHITECTURE` has `scores` and optional `override`, `ABANDON_EPIC` has `reason`). The `updated` field is set only by CREATE_EPIC and ACTIVATE_EPIC — not on every transition. **Deferred to slices 04-05:** `CREATE_SLICE`, `BEGIN_PLAN`, `BEGIN_REFINEMENT`, `BEGIN_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE`, `CREATE_QUEST`, `BEGIN_QUEST_PLAN`, `BEGIN_QUEST_REFINEMENT`, `BEGIN_QUEST_IMPLEMENTATION`, `COMPLETE_QUEST`, `ABANDON_QUEST`, and cross-cutting events (`ROLLUP_LEARNINGS`, `CREATE_DECISION`, `UPDATE_DECISION`).
- [ ] Add slice/quest submit events pulled forward from slices 04-05 because in-scope submit commands require them: `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_IMPLEMENTATION`, `COMPLETE_QUEST_PLAN`, `COMPLETE_QUEST_REFINEMENT_ROUND`, `COMPLETE_QUEST_IMPLEMENTATION` (6 submit events). Each carries entity name + specific payload per state-machine-api.md (e.g., `COMPLETE_REFINEMENT_ROUND` has `scores` and optional `override`). No universal `ts` on these events.
- [ ] Extend `StateErrorCode` union with new error codes: `STATE_EPIC_ALREADY_ACTIVE`, `STATE_MISSING_VERIFICATIONS`, `STATE_VERIFICATION_FAILED`, `STATE_SLICE_NOT_READY`, `STATE_CONTENT_MISSING`, `STATE_MAX_ROUNDS_REACHED`, `DATA_CONCURRENT_MODIFICATION`
- [ ] Verify `epicStatusSchema` values in `src/schemas/entities/epic.ts` already include all 14 statuses from transition-tables.md (created, exploring, explored, defining-architecture, architecture-defined, refining-architecture, architecture-refined, defining-slices, slices-defined, refining-slices, slices-refined, activated, completed, abandoned). If already correct, no change needed.
- [ ] Extend `epicSchema` in `src/schemas/entities/epic.ts` with a `refinement` field for circuit breaker state: `refinement: refinementSchema.nullable()`, reusing the existing `refinementSchema` from `src/schemas/shared.ts` (already imported by `sliceSchema` and `questSchema`). Do NOT define an inline schema — the shared schema ensures consistent refinement tracking across all entity types. Defaults to `null`. This field is required by Phase 3's epic-refine.ts handler to persist round counts and score history.
- [ ] Update unit tests for StateEvent type coverage and isStateError with new error codes

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/schemas/` passes. All ~25 event types compile correctly in the discriminated union.
