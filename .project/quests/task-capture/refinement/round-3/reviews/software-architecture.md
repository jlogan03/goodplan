## Issues

**[IMPORTANT]** CONVERT_TASK epic creation spec omits required `epicSchema` fields
Phase 1 CONVERT_TASK handler step 5 specifies the epic JSON as `{ name, goal: task.title + description, status: "created", created: ts, updated: ts }`. However, `epicSchema` (in `src/schemas/entities/epic.ts`) requires four additional fields: `verifications: z.array(verificationSchema)`, `refinement: refinementSchema.nullable()`, `sliceSequence: z.array(z.string())`, and `activated: timestampSchema.nullable()`. The plan says "All required schema fields must be present" but then lists an incomplete set. Without `verifications: []`, `refinement: null`, `sliceSequence: []`, and `activated: null`, the created epic will fail Zod validation on `commitState` (INV-005). The plan already correctly lists the quest fields (including `refinement: null`), so this appears to be an oversight specific to the epic case. Add the four missing fields to the epic creation spec in step 5.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `mapToBeginPhase()` is in `src/core/rpc/paths.ts`, not `src/core/rpc/begin.ts`
Phase 1 task item for `BeginPhase` says "Add cases to `buildBeginEvent()`, `mapToBeginPhase()`, and `resolveForBeginPhase()` in `src/core/rpc/begin.ts` and `src/core/rpc/paths.ts`". The grouping is ambiguous. In actuality: `buildBeginEvent()` lives in `begin.ts`, while both `mapToBeginPhase()` and `resolveForBeginPhase()` live in `paths.ts`. The same task item also appears earlier (item 7 in the exhaustive switches list) saying `mapToBeginPhase()` is "in `src/core/rpc/begin.ts`" which is incorrect. Minor file path errors, but could cause implementer confusion. Correct item 7 to reference `src/core/rpc/paths.ts`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
All round 2 concerns have been thoroughly addressed: `addEpicToOverview` helper is now explicitly specified as a new addition to `helpers.ts`; `BeginPhase` names are entity-scoped (`"create-task"`, `"drop-task"`, `"convert-task"`) following the `"create-decision"` precedent; epic subdirectories are covered in step 6; `title` on overview schema has the conditional spread pattern documented; duplicate name guard is namespace-specific; human output uses input name; and test descriptions are corrected. The one remaining IMPORTANT issue is an incomplete field list for CONVERT_TASK epic creation that would cause a runtime schema validation failure. Fixing that brings the plan to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
