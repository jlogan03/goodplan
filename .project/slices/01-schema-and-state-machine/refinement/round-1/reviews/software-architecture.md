# Software Architecture Review — Schema and State Machine Plan

## Issues

**[CRITICAL]** Plan omits `resolveEntityJsonPath` and `resolveEntityDir` from Phase 1 scope despite changing `Target`

Phase 1 changes the `Target` slice variant to `{ type: "slice"; name: string; epic: string }`. The plan lists this change explicitly. However, `resolveEntityJsonPath()` in `src/core/rpc/types.ts` (line 232) currently returns `slices/${target.name}/slice.json` for slices, and `resolveEntityDir()` in `src/core/rpc/paths.ts` (line 150) returns `nodePath.join(projectDir, "slices", target.name)`. Both must be updated to use the new nested path (`epics/${target.epic}/slices/${target.name}/...`). The plan mentions `resolveEntityJsonPath` and `resolveEntityDir` updates in the affected-apis research doc but does NOT include them as Phase 1 or Phase 2 tasks.

Since `resolveEntityJsonPath` and `resolveEntityDir` operate on the `Target` type (which gains `epic` in Phase 1), and since they are in the RPC layer (not state machine transition handlers), they belong in Phase 1 alongside the `Target` change. Without this, the compiler will accept the code (the new `epic` field is simply unused), but every runtime path resolution for slices will be wrong — `slices/foo/slice.json` instead of `epics/bar/slices/foo/slice.json`.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `entityDir` in `src/core/context/priorities.ts` returns `slices/${target.name}` — not covered by either phase

The context layer's `entityDir()` function (line 16-17) returns `slices/${target.name}` for slice targets. This is used to resolve plan paths, refined-plan paths, and implementation paths for context bundling. The plan does not mention `priorities.ts` in any task. The affected-apis research doc identifies three silent string-literal changes in `priorities.ts` (lines ~42, ~66, ~78), but these never made it into the plan's task list.

After Phase 1 changes `Target` to carry `epic`, `entityDir` needs to return `epics/${target.epic}/slices/${target.name}`. The `completeSources` array also references `slices/overview.json` (line 66) which must change to `epics/overview.json`. These are string literals — TypeScript will not catch them. Context bundling will silently return empty/missing content for all slice phases.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase boundary between schema/type changes and handler changes is not clean — `addEpicToOverview`, `updateOverviewStatus`, `buildInitialEpicJson`, and `addSliceToOverview` are in Phase 1 but they are handler-level code

Phase 1 is titled "Schemas, Types & Registry" but includes 5 tasks that modify `src/core/state/transitions/helpers.ts` (a handler-level file): updating `addEpicToOverview`, `updateOverviewStatus`, `buildInitialEpicJson`, and creating `addSliceToOverview`. It also includes modifying `init.ts` (a transition handler). These are Phase 2 concerns per the plan's own framing ("Phase 2: Handlers, Helpers & Tests"). The mixed phase boundary means Phase 1 cannot be verified in isolation — you cannot run `tsc --noEmit` successfully after Phase 1 without also updating callers that depend on these changed signatures.

Two options: (a) move these helper changes to Phase 2, accepting that Phase 1 is purely type/schema/registry; or (b) rename Phase 1 to acknowledge it includes foundational helper changes and adjust the Phase 1 verification to be more specific about which tests should pass.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `buildSliceCompleteResult` in `src/core/rpc/complete.ts` is not covered by either phase — 6 flat path references

`buildSliceCompleteResult` (lines 169-267) contains 6 references to `slices/${sliceName}/...` paths: two `slice.json` lookups (lines 175-176), one `slices/overview.json` lookup (line 187), two deferred-routing slice lookups (lines 207-208), and one `architecture-deltas.jsonl` lookup (line 258). The affected-apis research doc enumerates all 6 references. However, neither Phase 1 nor Phase 2 includes a task for `complete.ts` in the RPC layer. Phase 2 tasks cover `src/core/state/transitions/slice-complete.ts` (the state machine handler) but not `src/core/rpc/complete.ts` (the RPC result builder).

This function is in the RPC layer, not the state machine — it reads from the state tree post-reduce to build the `CompleteResult`. All 6 paths are string literals that TypeScript will not catch. After the state machine writes to nested paths, this function will read from old flat paths and get `undefined` for everything — `epicComplete` will be wrong, deferred routing counts will be zero, architecture paths will be missing.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `DeferredItem.targetEpic` should be optional per architecture doc but plan says "required"

The plan says: "Add `targetEpic: string` to `DeferredItem` type in `src/schemas/commands/submit.ts`". The architecture doc (`data-model-changes.md` line 149) specifies `targetEpic: z.string().min(1).optional()` — optional, with a default to the completing slice's epic. The plan's task description says "required" (no mention of optional), which contradicts the architecture. Also, `deferredItemSchema` is in `src/schemas/entities/slice.ts`, not `src/schemas/commands/submit.ts` — the plan has the wrong file path.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 does not account for the RPC `begin.ts` event construction — 7+ event builders need `epic`

The affected-apis research doc lists 7 functions in `src/core/rpc/begin.ts` that must include `epic` from `target` when constructing slice events: `buildBeginEvent`, `buildCreateEvent`, `buildAbandonEvent`, `buildPlanPhaseEvent`, `buildRefinePlanEvent`, `buildImplementEvent`, and `buildCompleteEvent` (in `complete.ts`). Phase 2 does not include any task for `src/core/rpc/begin.ts`. These are the functions that bridge `Target.epic` into `StateEvent.epic` — without updating them, the state machine will never receive `epic` on slice events.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification claims `tsc --noEmit` will pass but acknowledges it may not

The Phase 1 verification says: "`tsc --noEmit` — type check passes" but the Expected Behavior note says "exhaustive switches will error until Phase 2 updates handlers — use `// @ts-expect-error` or update simultaneously". This is contradictory. If `@ts-expect-error` comments are needed, the verification step should say so explicitly. If handlers are updated simultaneously, that blurs the phase boundary further (see IMPORTANT issue above).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `updateOverviewStatus` for epics currently uses `Overview` type — plan should note the spread-preservation concern

The plan says "Update `updateOverviewStatus` for epics to use `EpicOverview` type: Must preserve `slices` array when spreading/updating an epic overview item." The current implementation (helpers.ts line 89-105) uses `{ ...item, status: newStatus }` — this spread already preserves `slices` if present. The plan should note that the main change is the type parameter on the `getJson` call (from `Overview` to `EpicOverview`), not the spread logic. This avoids implementers creating unnecessary code changes.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan demonstrates thorough understanding of the schema and state machine changes but has significant coverage gaps in the RPC layer — `resolveEntityJsonPath`, `resolveEntityDir`, `buildSliceCompleteResult`, `begin.ts` event builders, and `priorities.ts` context paths are all missing from the task lists despite being identified in the research docs. These are not minor omissions: they represent the bridge between the new `Target.epic` field and the rest of the system. The state machine changes alone will not produce a working system.

To reach 9+: (1) Add RPC layer tasks for `resolveEntityJsonPath`, `resolveEntityDir`, `begin.ts` event builders, `complete.ts` result builder, and `priorities.ts` context paths. (2) Fix `DeferredItem.targetEpic` to be optional with correct file path. (3) Clean up the phase boundary or rename phases to match actual scope.

## Summary
- Critical: 2
- Important: 4
- Minor: 2
