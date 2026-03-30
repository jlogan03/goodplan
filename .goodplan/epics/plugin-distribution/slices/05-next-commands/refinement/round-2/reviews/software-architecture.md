# Software Architecture Review — Slice 05: Next Commands (Round 2)

## Issues

**[IMPORTANT]** Mutation file inventory contains phantom commands and missing real ones

The plan's "Mutation File Inventory" in Phase 2 lists commands that do not exist in the codebase and omits commands that do. Specifically:

- **Phantom entries** (not in `src/commands/`): `epic/refine-implementation.ts`, `slice/refine-implementation.ts`, `quest/explore.ts`, `decision/supersede.ts`. None of these files exist.
- **Missing entries**: `epic/define-slices.ts`, `epic/refine-architecture.ts`, `epic/refine-slices.ts`, `epic/activate.ts`, `epic/abandon.ts`, `slice/abandon.ts`, `quest/abandon.ts`, `quest/refine-plan.ts`.

Actual begin count: 25 files (excluding `learning/rollup.ts`). Actual submit count: 8. Actual complete count: 3. Total wired: 36 (not 35). The plan claims 36 total / 35 wired but the enumeration itself is wrong. The RPC-layer integration approach (3 integration points) means the exact command count is less critical for implementation, but the inventory is referenced by the fitness test's forward/reverse checks and must be accurate.

Fix: Replace the enumeration with the correct list derived from the codebase. The begin list should be:
- **epic (10)**: create, explore, define-architecture, define-slices, refine-architecture, refine-slices, activate, abandon, add-verification, update-verification
- **slice (5)**: create, plan, refine-plan, implement, abandon
- **quest (5)**: create, plan, refine-plan, implement, abandon
- **task (3)**: create, convert, drop
- **decision (2)**: create, update
- **submit (8)**: submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices, submit-plan, submit-refinement, submit-implementation
- **complete (3)**: epic/complete, slice/complete, quest/complete
- **Excluded (1)**: learning/rollup (returns RollupResult)

Total: 36 mutation files, 35 wired (excluding rollup).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `computeNextCommands` signature accepts `target: { type: Target["type"]; name: string }` but `Target` variants have different identifier shapes

Phase 1 Task 1.4 defines the signature as `computeNextCommands(target: { type: Target["type"]; name: string }, newStatus: string, parentEpic?: string)`. But `Target` is a discriminated union where decisions use `id` (not `name`), rollups use `from`/`to`, and slices have `epic`. The `{ type: Target["type"]; name: string }` shape doesn't align with the actual `Target` type.

The function should accept the real `Target` type and extract what it needs internally:
- For template interpolation, it can use `resolveEntityName(target)` (already exists in `types.ts`)
- For `parentEpic`, it can check `target.type === "slice"` and extract `target.epic`
- This eliminates the `parentEpic` parameter entirely

This is architecturally cleaner: the function depends on the same `Target` type the RPC layer already has, rather than requiring callers to destructure and re-package the target.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `epicVerifyTransitions` uses wildcard `from: "*(pre-activated)"` which complicates derivation logic

The plan describes a straightforward `(entityType, toStatus) -> commands[]` derivation from transition tables. But `epicVerifyTransitions` uses the special `from: "*(pre-activated)"` wildcard (meaning any pre-activation status), and `to: "(same)"` (meaning status doesn't change). The derivation logic in Phase 1 Task 1.3 acknowledges `(same)` transitions but doesn't address wildcard `from` statuses.

For `*(pre-activated)`, the derivation needs to expand this wildcard to all actual pre-activation epic statuses (created, exploring, explored, defining-architecture, architecture-defined, refining-architecture, architecture-refined, defining-slices, slices-defined, refining-slices, slices-refined) so that `add-verification` and `update-verification` appear as available commands for each of those statuses.

The plan's Phase 1 Task 1.3 says: "Status-preserving events produce entries under their `from` status (since `from === to`)." This is correct for `(same)`, but the `from` value is `*(pre-activated)`, not an actual status. The derivation code must handle this expansion.

Fix: Add explicit handling in the derivation logic for wildcard `from` values. Document which wildcards exist and how they map to actual status sets. This could be a small lookup table or a convention-based expansion.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Decision entity has no transition table export for derivation

The plan assumes all entity types have exported `*Transitions` arrays. But `src/core/state/transitions/decision.ts` does not export a transitions array -- it only exports handler functions (`handleCreateDecision`, `handleUpdateDecision`). Decision transitions are status-based (the valid `from -> to` map is defined inline in `DECISION_VALID_TRANSITIONS`), but this constant is not exported.

The derivation logic cannot build `(decision, toStatus) -> commands[]` without access to this data. Either:
1. Export `DECISION_VALID_TRANSITIONS` from `decision.ts`, or
2. Add a `decisionTransitions` export matching the `ReadonlyArray<{from, event, to}>` pattern used by other entity types, or
3. Handle decisions as a special case in the derivation (less desirable -- breaks the uniform pattern).

Resolution: CODEBASE_EXPLORATION

Research: Read `src/core/state/transitions/decision.ts` fully to understand `DECISION_VALID_TRANSITIONS` shape. Check if the decision state machine is simple enough (3 statuses: active, revisiting, superseded) that option 2 is trivial to add. Also check `reduce.ts` to see how decision handlers are routed.

---

**[MINOR]** Phase 1 fitness test's transition reachability check needs to handle non-standard transition table shapes

The fitness test (Phase 1 Task 4) verifies that every derived registry entry corresponds to a valid transition. But transition tables have non-uniform shapes: standard `{from: Status, event, to: Status}`, wildcard `{from: "*(pre-activated)", event, to: "(same)"}`, and missing tables (decisions). The fitness test must handle all three cases. The plan doesn't mention this complexity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Module depth is appropriate but the "other" section could be deeper

The plan correctly places `next-commands.ts` in the RPC layer as a deep module: callers (begin/submit/complete) make a single call and get a complete result. The "other" section (cross-entity creation commands) is acknowledged as a pragmatic exception to the derivation constraint (good). However, the hardcoded "other" list could be derived from the `commandToEvent` entries where `event` matches a `CREATE_*` pattern, which would make the module deeper and more self-maintaining. This is a minor improvement, not a structural issue.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 doesn't address `epic/activate.ts` as an edge case

`epic/activate.ts` calls `begin(projectDir, "activate", ...)` which produces `ACTIVATE_EPIC`. This is a mutation that changes status from `slices-refined` to `activated`. The plan's edge case list in Phase 2 covers `submit-plan.ts` (dual entity), `task/convert.ts` (new entity), `add-verification`/`update-verification` (same status), and `decision/create`/`update`. But `activate` is semantically distinct -- it's the only begin phase that isn't about "starting work" but about "enabling the entity." The nextCommands after activation should include `epic:complete` and entity-scoped read commands. This is handled automatically by the derivation (the transition table maps `slices-refined + ACTIVATE_EPIC -> activated`, so `commandMappings.get("epic")?.get("activated")` will include `epic:complete`), but it's worth verifying in Phase 1 unit tests.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan addressed all round-1 critical issues well: the registry is now derived from transition tables (C1), integration is at the RPC layer not command files (C2), and types use `Target["type"]` (I2). The overall architecture is sound -- `next-commands.ts` as a deep RPC-layer module with derived mappings and 3 integration points is the right design.

However, the mutation file inventory is materially wrong (4 phantom files, 8 missing files), the `Target` parameter shape doesn't match the actual discriminated union, and two data-model assumptions are incorrect (wildcard `from` in verify transitions, missing decision transition table). These would cause implementation failures or incomplete coverage.

To reach 9+: fix the inventory, accept the real `Target` type instead of a simplified shape, handle wildcard transitions and the decision entity's non-standard transition table in the derivation logic.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
