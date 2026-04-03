# Software Architecture Review — Round 4

## Issues

**[MINOR] `submit-implementation --phase` extends command with dual behavior — schema update not called out**
The plan resolves the round-3 `implementationPhase` guard issue well: guard semantics are now explicit (status must be `implementing`, monotonic increment, `BEGIN_IMPLEMENTATION` initializes to 0, field is historical). The CLI surface change is sound — reusing `submit-implementation` with `--phase` rather than a new command keeps the subagent namespace coherent.

However, Phase 2 task 4 does not mention updating `submitImplementationInputSchema` in `src/schemas/commands/submit.ts`. The existing command uses this schema for input validation (verified via codebase read). Adding `--phase` to the command arguments without updating the schema will either silently ignore the flag or cause a validation error at runtime. This is a narrow implementation gap.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a sub-task to Phase 2 task 4: "Update `submitImplementationInputSchema` in `src/schemas/commands/submit.ts` to add an optional `phase` integer field, and update `src/commands/subagent/submit-implementation.ts` to emit `UPDATE_IMPLEMENTATION_PHASE` when `--phase` is provided."

**[MINOR] `UPDATE_IMPLEMENTATION_PHASE` event not added to `StateEvent` union**
The plan correctly specifies adding the transition handler and guard logic, but does not explicitly call out adding the new event to the `StateEvent` discriminated union in `src/schemas/state-events.ts`. Every event type must appear in this union for the state machine to accept it (verified: the union is the single source of truth for all events). Omitting this step would cause a TypeScript compile error, but it's better to make it explicit in the plan.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add to Phase 2 task 4: "Add `{ type: 'UPDATE_IMPLEMENTATION_PHASE'; epic: string; slice: string; phase: number; ts: string }` to the `StateEvent` union in `src/schemas/state-events.ts`."

## Round-3 Fix Verification

All round-3 IMPORTANT issues are correctly resolved:

- **Guard semantics**: Phase 2 task 4 now specifies all four required guard conditions (status guard, monotonic increment, initialization at 0, historical preservation). Correct.
- **Completion-phase reference cleanup**: Phase 1 task 4 now includes `grep -r "completion-phase" agents/ skills/` with expected 0 hits. Correct.

All round-3 MINOR issues are correctly resolved:

- **reviewer-registry directory**: Phase 3 explicitly states "Create `skills/implement/references/` directory and copy `reviewer-registry.md`." Correct.
- **`cp -n` artifact promotion**: Phase 5 Step 6 now uses `cp -n` with explicit idempotency note. Correct.
- **Re-entry test CLI dependency**: Phase 6 re-entry fixture now includes dependency note and verify-first instruction. Correct.

## Score: 9/10

The plan is architecturally sound. Module boundaries are clean (orchestrator/agent/CLI/schema layers all addressed), dependency direction is correct throughout, and all round-3 issues have been properly resolved. The two remaining MINOR items are narrow implementation gaps in the data model change — the new `StateEvent` union entry and the input schema update are both required but easy to miss since they sit in different files from the transition handler. Neither represents a design problem; both are straightforward additions that belong in Phase 2 task 4. The overall architecture — orchestrator context discipline, split completion agents, monotonic phase tracking, git-based changed-file accumulation — is well-designed and correctly specified.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
