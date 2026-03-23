## Issues

**[IMPORTANT]** Phase 1 proposes creating `src/schemas/shared-records.ts` but `learningEntrySchema` and `architectureDeltaSchema` already exist

Phase 1 task 2 says "Create `src/schemas/shared-records.ts` (or extend existing file) with Zod schemas for CompleteInput payload types: `learningSchema` [...], `architectureDeltaSchema`". However, the codebase already has `src/schemas/records/learning.ts` (with `learningEntrySchema`) and `src/schemas/records/architecture-delta.ts` (with `architectureDeltaSchema`). These are already wired into the schema registry at `src/core/data/schema-registry.ts`.

The plan needs to distinguish between:
1. The **stored/persisted** record schemas (`LearningEntry` with `source` and `rollup` fields) that already exist.
2. The **input** schemas (`Learning` per rpc-layer-api.md, which omits `source` and `rollup` because the RPC layer injects those during persistence).

The `architectureDeltaSchema` already exists and matches the architecture spec. For `Learning`, the plan should create an **input** variant (e.g., `learningInputSchema`) that matches the `Learning` interface from rpc-layer-api.md (category enum, summary, detail, tags, rollupTo -- no `source`, no `rollup`), not duplicate the existing storage schema. The `DeferredItem` schema already exists in `src/schemas/entities/slice.ts` as the plan correctly notes.

Fix: Rewrite Phase 1 task 2 to (a) reuse existing `architectureDeltaSchema` and `deferredItemSchema`, (b) create a `learningInputSchema` (the input variant without `source`/`rollup`) in `src/schemas/records/learning.ts` alongside the existing `learningEntrySchema`, and (c) drop the `shared-records.ts` file creation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `guardSliceStatus` should return `Slice | StateError` per learnings, but plan says both patterns

The research file explicitly flags this: "slice-submit.ts local helpers use `StateError | null` guard pattern. New slice handlers should use `Entity | StateError` pattern per learnings." The plan's Phase 2 task list correctly mentions creating `guardSliceStatus(state, name, validStatuses)` returning `Slice | StateError` in helpers.ts, matching the `guardEpicStatus` pattern. However, the plan does not explicitly address migrating the existing `slice-submit.ts` local helpers to the new pattern. Currently `slice-submit.ts` has its own `getSlice`, `setSliceJson`, and `guardSliceStatus` that return `StateError | null` (lines 22-55 of slice-submit.ts).

If Phase 2 creates new versions of these helpers in `helpers.ts` with the `Slice | StateError` return type, the existing `slice-submit.ts` will still have its own local copies with the old pattern. This creates two competing helper sets for the same entity -- callers must know which to use. The plan should include a sub-task to refactor `slice-submit.ts` to use the new shared helpers from `helpers.ts` and remove its local duplicates. This also applies to `getSlice` and `setSliceJson`.

Fix: Add a task in Phase 2 to refactor `slice-submit.ts` to import and use the shared helpers from `helpers.ts`, removing its local `getSlice`, `guardSliceStatus`, and `setSliceJson` functions. Update the guard call sites in `handleCompletePlan`, `handleCompleteRefinementRound`, and `handleCompleteImplementation` to use the `Slice | StateError` pattern (narrowing with `isStateError()` instead of `!== null`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `CompleteInput` slice variant in `src/core/rpc/types.ts` already exists but is incomplete -- plan's description of the change is imprecise

Phase 1 task 3 says "Extend `CompleteInput` in `src/core/rpc/types.ts` -- the slice variant should include the full optional fields." The current code already has `| { type: "slice"; verificationPassed: boolean }` in the union. The plan should be explicit that this is a modification of the existing union member (adding `deferred?`, `learnings?`, `architectureDelta?`), not adding a new variant.

More importantly, the types for these fields need to come from the right schemas: `DeferredItem` from `src/schemas/entities/slice.ts` (already exists), `ArchitectureDelta` from `src/schemas/records/architecture-delta.ts` (already exists), and `Learning` (the input type, to be created in Phase 1). The plan should specify these exact import paths to avoid creating duplicate types.

Fix: Clarify Phase 1 task 3 to specify: modify the existing `{ type: "slice"; verificationPassed: boolean }` variant by adding the optional fields, importing `DeferredItem` from `src/schemas/entities/slice.ts`, `ArchitectureDelta` from `src/schemas/records/architecture-delta.ts`, and the new `LearningInput` type from wherever the input schema is created.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `BeginPayloadMap["create"]` expansion strategy needs clearer specification

Phase 3 task 3 identifies the problem: `create` payload is currently `{name: string; goal?: string}` and needs an `epic` field for slice creation. The plan offers an option ("keep `create` payload as `{name: string; goal: string; epic?: string}` where `epic` is required for slice targets") but doesn't commit to a decision.

This matters architecturally because it affects type safety. If `epic` is optional at the type level but required at runtime for slices, the type system doesn't prevent callers from omitting it. A cleaner approach that preserves the existing pattern: use a type that's a union based on what the caller actually passes. Since the `begin` function already switches on `target.type` inside `buildCreateEvent`, the runtime validation is already there. The loosened payload type is acceptable given the runtime guard, but the plan should commit to the specific approach rather than leaving it as "Option:".

Also, `goal` is currently `goal?: string` (optional), but for slices it's required per the architecture spec. The plan should address this -- the create payload union needs `goal: string` (required) for both epic and slice targets.

Fix: Commit to the specific `BeginPayloadMap["create"]` shape in Phase 3. Recommended: `{ name: string; goal: string; epic?: string }` (make `goal` required, add optional `epic` that the RPC layer validates is present for slice targets). Document this decision in the task rather than leaving it as an open option.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 `slice:create` command spec conflicts with epic:create pattern on `--epic` flag vs stdin

Phase 4 task 1 says: "reads stdin JSON `{name, goal, epic}`, calls `begin('create', ...)`. Requires `--epic` flag to specify which epic the slice belongs to." This is contradictory -- is `epic` passed via stdin JSON or via `--epic` flag? The existing `epic:create` pattern reads all input from stdin JSON (name, goal). For consistency, `slice:create` should either (a) take all input from stdin JSON `{name, goal, epic}` or (b) take `--epic` as a flag with `{name, goal}` from stdin.

Looking at the e2e walkthrough in Phase 5, step 4 uses: `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic`. This suggests `epic` is a flag, not in stdin. But the Phase 4 Expected Behavior section shows: `echo '{"name":"01-auth","goal":"Auth","epic":"my-epic"}' | bun run src/index.ts slice:create --json` with `epic` in the stdin JSON.

These are inconsistent. The `--epic` flag approach is better because it matches INV-004 (explicit target flags) and is consistent with `--slice` flags on other slice commands. But the plan must be internally consistent.

Fix: Standardize Phase 4 on `--epic` flag for the epic name, with stdin carrying `{name, goal}` only. Update Phase 4's Expected Behavior and task description to be consistent. Update Phase 5 walkthrough steps if needed (step 4 already uses the flag pattern, which is correct).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `buildBeginResult` doesn't handle slice targets -- plan doesn't mention extending it

The current `buildBeginResult` in `begin.ts` only handles `target.type === "project"` and `target.type === "epic"` for extracting previous/new status. When Phase 3 wires slice phases through `begin()`, the result builder needs to handle `target.type === "slice"` too (reading `Slice` from the state tree). The plan's Phase 3 tasks focus on `buildBeginEvent` and `buildCompleteEvent`/`buildCompleteResult` but don't mention updating `buildBeginResult` to extract slice status from the new state.

Fix: Add a sub-task in Phase 3 to extend `buildBeginResult` to handle `target.type === "slice"` (and eventually `"quest"`) by reading `Slice` from old/new state to extract previous/new status.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 epicComplete detection mechanism is underspecified

Phase 2 task for COMPLETE_SLICE says: "epicComplete detection: [...] return `epicComplete: true` in the result state (flag it via a marker in the state tree or a property the RPC layer can detect)." This is vague -- "a marker in the state tree or a property" are two different approaches with different implications. The state machine is pure and returns `ProjectState | StateError`, so it can't add arbitrary properties to `ProjectState` without a defined location.

Two clean options: (1) The state machine checks all sibling slices and the RPC layer re-derives the same check from the returned state (duplicated logic but pure). (2) The state machine writes a transient flag somewhere in the state tree that `commitState` knows to ignore (e.g., a well-known path like `_meta/epicComplete`).

The plan should pick one approach. Option 1 is simpler and aligns with how `buildCompleteResult` already works -- it reads entity status from the new state. The RPC layer can check all sibling slices via `slices/overview.json` after reduce returns.

Fix: Specify the approach: the RPC layer's `buildCompleteResult` checks all sibling slices in the epic (via `slices/overview.json` in the new state) to derive `epicComplete`. The state machine does NOT need to flag this -- it just needs to correctly update the completing slice's status and overview. This keeps the state machine simpler.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice-submit.ts` quest helpers should also be consolidated

Phase 2 focuses on consolidating slice helpers into `helpers.ts`, but `slice-submit.ts` also has local quest helpers (`getQuest`, `setQuestJson`, `guardQuestStatus`) using the same old `StateError | null` pattern. These should be consolidated alongside the slice helpers for consistency, especially since quest lifecycle (slice 05) will need them.

Fix: Note in Phase 2 that quest helpers should also be moved to `helpers.ts` with the `Quest | StateError` pattern, or flag it as deferred work for slice 05.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates strong architectural awareness -- it correctly follows the bottom-up phasing pattern, respects the layered architecture, and identifies the right modules to modify. The COMPLETE_SLICE handler complexity is well-decomposed. However, several tasks contain inaccuracies about what already exists in the codebase (the schema files), internal inconsistencies (stdin vs flag for epic), and underspecified design decisions (epicComplete mechanism, BeginPayloadMap shape). These would cause implementation friction and potentially incorrect code. Fixing the 5 IMPORTANT issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
