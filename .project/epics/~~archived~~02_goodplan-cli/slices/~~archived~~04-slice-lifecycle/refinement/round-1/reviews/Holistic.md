## Issues

**[IMPORTANT] Phase 1 proposes creating `src/schemas/shared-records.ts` but Learning and ArchitectureDelta schemas already exist**
Phase 1 task 2 says: "Create `src/schemas/shared-records.ts` (or extend existing file) with Zod schemas for CompleteInput payload types: `learningSchema` ... `architectureDeltaSchema`". These already exist at `src/schemas/records/learning.ts` (`learningEntrySchema`) and `src/schemas/records/architecture-delta.ts` (`architectureDeltaSchema`). The plan should import from those existing files rather than creating duplicates. The parenthetical "(or extend existing file)" partially acknowledges this but the primary instruction is misleading. The task should say: "Verify existing `learningEntrySchema` in `src/schemas/records/learning.ts` and `architectureDeltaSchema` in `src/schemas/records/architecture-delta.ts` match architecture spec. Create a `learningInputSchema` (without `source` and `ts` fields that are injected by the RPC layer) if needed for CompleteInput validation."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 task 3 says `learnings?: Learning[]` but the existing `learningEntrySchema` has `source` and `rollup` fields that shouldn't come from stdin**
The `LearningEntry` type includes `source: string` (populated from slice scope) and `rollup: boolean`. The plan's CompleteInput for slice should accept a *input* schema (without `source`, without `rollup` since `rollupTo` implies it) and the RPC layer should inject `source` and derive `rollup`. Phase 1 should define a `learningInputSchema` (category, summary, detail, tags, rollupTo) separate from the storage schema, and Phase 3 should map input to storage format. Similarly, `architectureDeltaSchema` includes `ts` which the plan correctly says is injected by RPC — so an `architectureDeltaInputSchema` (without `ts`) is needed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 `guardSliceStatus` pattern inconsistency not addressed as a concrete task**
The research file flags that `slice-submit.ts` local helpers use `StateError | null` pattern while learnings say to use `Entity | StateError`. Phase 2 task 8 says "Add shared helpers to `helpers.ts`" with `guardSliceStatus(state, name, validStatuses) returning Slice | StateError`. This is correct for the new helpers, but there is no task to migrate the existing `slice-submit.ts` local helpers to use the shared ones. The existing `getSlice`, `setSliceJson`, and `guardSliceStatus` in `slice-submit.ts` (lines 22-55) should be removed and replaced with imports from `helpers.ts`. Without this, there will be two competing implementations.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3 `BeginPayloadMap` `create` key expansion is underspecified**
Phase 3 task 3 proposes making `epic?: string` optional on the `create` payload, but this is type-unsafe — it allows callers to omit `epic` for slices at compile time. The codebase uses `exactOptionalPropertyTypes: true`, so this is a real concern. A better approach: use a discriminated union or an overloaded `buildCreateEvent` that checks `target.type` at runtime (which the plan does mention) but also tighten the type. Consider: `create: { name: string; goal?: string; epic?: string }` is acceptable if `buildCreateEvent` validates, but document that the compile-time contract is intentionally loose here, with runtime enforcement in `buildCreateEvent`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4 `slice:create` command uses `--epic` flag but also reads `epic` from stdin JSON**
Phase 4 task 1 says: "reads stdin JSON `{name, goal, epic}`, calls `begin('create', ...)`. Requires `--epic` flag to specify which epic the slice belongs to." This is contradictory — `epic` appears in both stdin and as a flag. Looking at the epic:create pattern, it reads everything from stdin. The plan should pick one: either `epic` comes from stdin (matching the expected behavior in Phase 5 step 4: `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic`) or from a flag. The Phase 5 walkthrough suggests `--epic` flag + stdin for name/goal. Reconcile: stdin should be `{name, goal}`, `--epic` is a required flag, and the command merges them.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `COMPLETE_SLICE` deferred routing: "skip silently" for nonexistent target may violate INV-007**
INV-007 says "No silent errors." Phase 2 task 4 step 2 says "If target doesn't exist -> skip silently." A deferred item targeting a nonexistent slice could be a user error. Consider logging a warning in the activity log or returning a `deferredSkipped` count in the result rather than silently dropping.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `epicComplete` detection mechanism is vague**
Phase 2 task 4 step 7 says "return `epicComplete: true` in the result state (flag it via a marker in the state tree or a property the RPC layer can detect)." This is too vague for implementation. The state machine is pure and returns `ProjectState | StateError`. It cannot add arbitrary properties. Specify the mechanism: e.g., the RPC layer checks the new state after COMPLETE_SLICE to determine if all sibling slices are completed/abandoned, rather than the state machine returning a flag. This aligns with the architecture's "Implicit Transitions" section in transition-tables.md which says detection happens in the RPC layer.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 walkthrough step 11 has an ordering error**
Step 11 says "attempt `goodplan slice:plan --slice 02-api` while 01-auth is in `planning` -> STATE_SLICE_NOT_READY. After 01-auth completes -> succeeds." But the walkthrough completes 01-auth in step 10 (before step 11). The sequential enforcement test should be inserted earlier in the walkthrough — e.g., between steps 6 and 7, attempt `slice:plan --slice 02-api` while 01-auth is in `planning`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 walkthrough references `goodplan submit-explore`, `submit-plan`, etc. without `--epic`/`--slice` flags**
Step 3 says `goodplan epic:explore --epic my-epic`, `goodplan submit-explore --epic my-epic`, etc. — this is fine. But step 7 says `goodplan submit-plan --slice 01-auth` and step 8 says `goodplan submit-refinement --slice 01-auth`. Verify these subagent commands accept `--slice` flags — looking at the existing `submit-plan.ts`, it likely already does, but the walkthrough should be explicit about all required flags and stdin payloads for submit commands.
Resolution: CODEBASE_EXPLORATION

**[MINOR] No explicit task for updating `src/schemas/commands/slice.ts` Zod input schemas to validate `--epic` flag**
Phase 4 task 9 says "Create `src/schemas/commands/slice.ts` — Zod schemas for slice command stdin inputs (createSliceInput, completeSliceInput)." But `createSliceInput` schema validation needs to account for `--epic` being a flag (not in stdin). The `validateInput` utility merges args and stdin — confirm the schema handles this correctly, with `epic` potentially coming from args rather than stdin.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with correct bottom-up phasing matching the proven pattern from slices 02-03. All referenced files exist and the plan correctly identifies the "not yet implemented" stubs to replace. However, there are several important gaps: the existing Learning/ArchitectureDelta schemas are not acknowledged (risking duplication), the input vs. storage schema distinction for CompleteInput is missing, the `slice-submit.ts` helper migration is not explicit, the `BeginPayloadMap` typing is underspecified, and the `--epic` flag vs. stdin inconsistency needs resolution. Fixing these 5 IMPORTANT issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
