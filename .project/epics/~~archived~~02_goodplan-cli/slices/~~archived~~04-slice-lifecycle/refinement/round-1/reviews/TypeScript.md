## Issues

**[IMPORTANT]** `buildBeginResult` in `begin.ts` does not extract status for slice targets
Phase 3 extends `begin()` to handle slice phases but does not mention updating `buildBeginResult()` (lines 173-197 of `src/core/rpc/begin.ts`). Currently, that function only resolves `previousStatus`/`newStatus` for `project` and `epic` targets -- all other target types fall through to the defaults (`previousStatus: "none"`, `newStatus: "unknown"`). Every slice command that uses `begin()` (create, plan, refine-plan, implement, abandon) would return wrong status values in its `BeginResult`. Phase 3 tasks should explicitly include: "Update `buildBeginResult` to handle `target.type === 'slice'` by reading `Slice` from old/new state via `getJson<Slice>`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `buildCompleteResult` in `complete.ts` does not handle slice targets
Phase 3 says "Return CompleteResult with deferredRouted, architecturePaths, epicComplete, learningsRolledUp extracted from the new state" but does not mention that `buildCompleteResult()` (lines 81-107 of `src/core/rpc/complete.ts`) currently throws for non-epic targets. The function needs a `target.type === 'slice'` branch that extracts the new `CompleteResult` fields. Additionally, the `CompleteResult` type itself (line 90-94 of `types.ts`) lacks the `deferredRouted`, `architecturePaths`, `epicComplete`, and `learningsRolledUp` fields that the plan mentions returning. Phase 3 should include: "Extend `CompleteResult` in `types.ts` with optional fields matching `rpc-layer-api.md` spec: `deferredRouted?`, `architecturePaths?`, `epicComplete?`, `learningsRolledUp?`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Guard helper inconsistency: `slice-submit.ts` uses `StateError | null` pattern but plan says new handlers will use `Entity | StateError` pattern
The research file explicitly flags this as a key risk: `slice-submit.ts` local helpers (`getSlice`, `guardSliceStatus`, `setSliceJson`) use the `StateError | null` return pattern (line 34-55), while the established `Entity | StateError` pattern from `helpers.ts` (e.g., `guardEpicStatus` returns `Epic | StateError`) is the documented best practice per learnings. Phase 2 task 8 says "Add shared helpers to `helpers.ts`: `getSlice`, `guardSliceStatus`, `updateSliceOverviewStatus`, `setSliceJson`" using the `Entity | StateError` pattern. However, the plan does not address migrating the existing `slice-submit.ts` to use the new shared helpers. This creates two sets of duplicated helpers with different guard patterns -- the local ones in `slice-submit.ts` and the shared ones in `helpers.ts`. Phase 2 should include a task: "Refactor `slice-submit.ts` to import and use the new shared `getSlice`/`guardSliceStatus`/`setSliceJson` from `helpers.ts`, removing the local duplicates. Update `guardSliceStatus` callers to use `isStateError()` narrowing instead of `!== null`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `CREATE_SLICE` event type includes `goal` but architecture spec omits it
Phase 1 defines `CREATE_SLICE` as `(name, epic, goal, ts)`. The architecture's `state-machine-api.md` (line 53) defines it as `{ type: 'CREATE_SLICE'; name: string; epic: string; ts: string }` -- no `goal` field. Since `slice.json` has a required `goal` field (`z.string().min(1)`), the handler needs goal from somewhere. The plan's approach is correct (the arch spec appears incomplete), but Phase 1 should include a task or note: "Update `state-machine-api.md` to add `goal: string` to the `CREATE_SLICE` event payload, matching the `slice.json` schema requirement." This prevents future confusion about spec/code divergence.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `BeginPayloadMap` type expansion strategy is underspecified
Phase 3 discusses three options for the `create` key in `BeginPayloadMap` -- union, or optional `epic` field, or target-type-aware mapping. The task settles on `{name: string; goal: string; epic?: string}` where `epic` is runtime-validated. With `exactOptionalPropertyTypes: true` in tsconfig, this means callers must either omit `epic` entirely or provide a `string` -- they cannot pass `undefined`. This is fine for the runtime validation approach, but the type still allows calling `begin('create', {type:'slice'}, {name:'x', goal:'y'})` without `epic` at compile time, deferring the error to runtime. A type-safer approach would be to make `BeginPayloadMap` aware of target types via a generic or overload, but that's a larger refactor. The plan should at minimum note this tradeoff explicitly and ensure the runtime validation throws a clear `VALIDATION_INVALID_INPUT` error with a message like "epic is required when creating a slice".
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `COMPLETE_SLICE` epicComplete detection mechanism is vague
Task 4 step 7 says "return `epicComplete: true` in the result state (flag it via a marker in the state tree or a property the RPC layer can detect)." The state machine is pure and returns `ProjectState | StateError` -- there is no mechanism to return sideband data. The plan needs to specify the concrete mechanism. Options: (a) set a marker entry in the state tree (e.g., `setEntry(state, '_meta/epicComplete', {type:'json', content: true})`), (b) have the RPC layer independently check sibling slice statuses after reduce returns, or (c) add a `meta` field on the returned state. Option (b) is simplest and consistent with how the transition tables document it as an "implicit transition" detected by the RPC layer (see transition-tables.md "Implicit Transitions"). The plan should specify option (b) explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `slice:create` has conflicting input patterns
Phase 4 task 1 says the command "reads stdin JSON `{name, goal, epic}`" and also "Requires `--epic` flag to specify which epic." This creates ambiguity: does epic come from stdin or from `--epic` flag? The existing epic commands use `validateInput()` which merges flags and stdin (flag wins). The plan should clarify: "epic comes from `--epic` flag (merged with stdin via `validateInput`, flag wins), name and goal come from stdin." The stdin schema in `src/schemas/commands/slice.ts` should include `epic` as optional (since the flag provides it), matching the pattern in `completeEpicInputSchema` where `epic` comes from the flag.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 walkthrough step 11 tests sequential enforcement incorrectly
Step 11 says "attempt `goodplan slice:plan --slice 02-api` while 01-auth is in `planning`" should fail. But by the walkthrough flow, 01-auth was already completed in step 10. The sequential enforcement test should be done earlier in the walkthrough (between steps 6-9) or use a separate set of test slices. As written, the walkthrough cannot reproduce the described scenario.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 says "6 remaining slice event types" but only lists 6 total, some already exist
Phase 1 intro says "Add 6 remaining slice event types." The task body lists: CREATE_SLICE, BEGIN_PLAN, BEGIN_REFINEMENT, BEGIN_IMPLEMENTATION, COMPLETE_SLICE, ABANDON_SLICE. These are indeed 6 new events. However, the overview says "6 remaining" which is correct only if you exclude the 3 submit events already in the union (COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION). This is consistent but could be clearer -- it reads as if 6 events exist and 6 remain, when actually 3 exist and 6 are new, for 9 total slice events.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan demonstrates strong understanding of the codebase architecture and follows proven patterns (bottom-up phasing, same file organization as slice 03). However, it has two IMPORTANT gaps in RPC result-building functions that would cause all slice CLI commands to return incorrect status values, and the guard helper inconsistency (flagged by the research itself) is not resolved despite being mentioned. The `CompleteResult` type is not extended to carry the new fields the plan describes returning. These are not edge cases -- they affect every single slice command's output. Fixing the 4 IMPORTANT issues and specifying the epicComplete detection mechanism concretely would bring this to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
