## Issues

**[IMPORTANT]** `resolveEntityJsonPath` slice case update belongs in slice 02, not Phase 1

The plan (Phase 1, `Target` update task) says to update `resolveEntityJsonPath` in `src/core/rpc/types.ts` to return `epics/${target.epic}/slices/${target.name}/slice.json`. However, the plan's own scope boundary states that `src/core/rpc/` files are out of scope (deferred to slice 02). `resolveEntityJsonPath` is in `src/core/rpc/types.ts` at line 226 — this is an RPC layer file. The plan contradicts itself: the scope boundary says RPC files are slice 02, but the task says to update the RPC function in Phase 1.

Resolution: Clarify scope. Either (a) `resolveEntityJsonPath` is updated in Phase 1 because it lives alongside `Target` in types.ts and is a pure function with no I/O dependencies, or (b) it gets `@ts-expect-error` like `resolveEntityDir`. Option (a) is architecturally cleaner — `resolveEntityJsonPath` is a type-level helper co-located with `Target`, not workflow orchestration. The plan should explicitly state this exception to the scope boundary with justification.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `updateOverviewStatus` for epics does not set `completed` timestamp on terminal transitions

The current `updateOverviewStatus` (helpers.ts line 89) only sets `status` via spread. When an epic completes or is abandoned, the `completed` field in `epics/overview.json` is never set to the event timestamp. This is a pre-existing bug, but the plan's restructuring makes it load-bearing: the new `epicOverviewItemSchema` will have `completed: timestampSchema.nullable()`, and the `sliceOverviewItemSchema` will also have this field. `updateSliceOverviewStatus` (which the plan creates) will have the same gap. The plan should note this and either (a) fix it as part of the restructuring since the helper signatures are already changing, or (b) explicitly document it as a known gap deferred to a separate fix. Leaving it undocumented risks the same bug silently propagating to the new `updateSliceOverviewStatus`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `guardSliceStatus` unchanged but callers will need `epic` for error messages

`guardSliceStatus` (helpers.ts line 118) takes `sliceName` and includes it in error messages. After restructuring, a slice name alone is ambiguous (same name allowed in different epics per `affected-apis.md`). The plan updates `getSlice` to take `epic` but does not update `guardSliceStatus` to include epic context in its error messages. This is not blocking but will make debugging harder when per-epic name uniqueness is exercised.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `verifications: [] as string[]` type bug fix — verify correct type assertion

The plan correctly identifies that `buildInitialEpicJson` uses `[] as string[]` for `verifications`, which should be `[] as Verification[]`. However, `Verification` is defined as a Zod-inferred object type (`{ description, status, addedDuring, modifiedDuring }`), so the fix needs an import of `Verification` from `../../schemas/entities/epic.js`. The plan should note the required import to avoid a compile error during implementation.
Resolution: DIRECTLY_ACTIONABLE

No further issues found.

## Score: 9/10

Round 1 issues have been thoroughly addressed. The plan is architecturally sound: phase boundaries respect the 4-layer architecture, the atomicity constraint (schema registry + helper type changes) correctly prevents INV-005 silent data loss, `@ts-expect-error` strategy for cross-phase/cross-slice boundaries is appropriate, and dependency direction is maintained (state machine has no I/O imports). The `resolveEntityJsonPath` scope contradiction is the most significant remaining issue — it needs a one-line clarification. The `completed` timestamp gap is worth noting to prevent bug propagation. Both are straightforward fixes.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
