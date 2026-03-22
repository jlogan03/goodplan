# Phase 1: StateEvent Types & Supporting Schemas

Add the remaining slice event types to the discriminated union and create Zod schemas for the complex CompleteInput payload types (Learning, ArchitectureDelta).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "CREATE_SLICE" src/schemas/state-events.ts` — no match (only epic + submit events exist)
- [ ] `grep "learningInputSchema" src/schemas/` — no match (Learning exists as TS interface in architecture but no Zod schema)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes with full StateEvent union including all slice events
- [ ] `bun test tests/unit/schemas/` — all tests pass

### Tasks

- [ ] Extend `StateEvent` union in `src/schemas/state-events.ts` with 6 slice lifecycle events per state-machine-api.md: `CREATE_SLICE` (name, epic, goal, ts), `BEGIN_PLAN` (slice, ts), `BEGIN_REFINEMENT` (slice, ts), `BEGIN_IMPLEMENTATION` (slice, ts), `COMPLETE_SLICE` (slice, ts, verificationPassed, deferred, learnings, architectureDelta), `ABANDON_SLICE` (slice, ts, reason). All carry `ts: string` per universal convention. Note: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION already exist from slice 03. Also update `state-machine-api.md` to add `goal: string` to `CREATE_SLICE` event payload (currently missing from the spec but required by `slice.json` schema).
- [ ] Create input schemas for CompleteInput payload types (reuse existing storage schemas, do NOT create `shared-records.ts`): (a) Create `learningInputSchema` in `src/schemas/records/learning.ts` alongside existing `learningEntrySchema` — includes category as `z.enum(["domain", "worked", "didnt-work", "do-differently"])` (validated at input boundary per INV-005/INV-007; the storage `learningEntrySchema` keeps `z.string().min(1)` for forward-compatibility), summary, detail, tags, rollupTo array but omits `source` and `rollup` fields (those are injected by the RPC layer). (b) Create `architectureDeltaInputSchema` in `src/schemas/records/architecture-delta.ts` alongside existing `architectureDeltaSchema` — omits `ts` field (injected by RPC). (c) Reuse existing `deferredItemSchema` from `src/schemas/entities/slice.ts` as-is — verify it matches architecture spec.
- [ ] Modify the existing slice variant of `CompleteInput` in `src/core/rpc/types.ts` — it currently has only `{ type: "slice"; verificationPassed: boolean }`. Add optional fields: `deferred?: DeferredItem[]`, `learnings?: LearningInput[]`, `architectureDelta?: ArchitectureDeltaInput[]`. Import `DeferredItem` from `src/schemas/entities/slice.ts`, `LearningInput` (inferred type from `learningInputSchema`) from `src/schemas/records/learning.ts`, and `ArchitectureDeltaInput` (inferred type from `architectureDeltaInputSchema`) from `src/schemas/records/architecture-delta.ts`.
- [ ] Add optional `epic?: string` field to `overviewItemSchema` in `src/schemas/overview.ts` — needed by CREATE_SLICE to store the parent epic name for `slice:list --epic` filtering. Existing project/epic overview items won't have this field. Also ensure `overviewItemSchema` is exported (or add `export type OverviewItem = z.infer<typeof overviewItemSchema>`) so downstream phases can reference the item type in a type-safe way when filtering by epic.
- [ ] Update the `satisfies` handler record in `reduce.ts` — add placeholder entries for the 6 new event types pointing to `handleNotImplemented` (a stub that returns STATE_INVALID_TRANSITION with message "not yet implemented — see slice 04 Phase 2"). This preserves compile-time exhaustiveness while Phase 2 implements the real handlers.
- [ ] Update unit tests for StateEvent type coverage (extend the exhaustiveness array and count)

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/schemas/` passes. The discriminated union includes all slice events with correct payloads.
