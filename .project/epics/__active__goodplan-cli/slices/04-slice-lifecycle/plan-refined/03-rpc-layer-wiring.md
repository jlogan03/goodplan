# Phase 3: RPC Layer Wiring

Wire the remaining slice BeginPhase values through begin() and extend complete() with full CompleteInput payload support.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts` with `begin(projectDir, 'create', {type:'slice', name}, payload)` in a test → throws "not yet implemented"
- [ ] `bun run src/index.ts` with `complete(projectDir, {type:'slice', name}, input)` in a test → throws "not yet implemented"

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/rpc/` — all RPC tests pass (existing + new)
- [ ] `npx tsc --noEmit` — passes

### Tasks

- [x] Extend `begin()` in `src/core/rpc/begin.ts` to handle slice-specific BeginPhase values that currently throw "not yet implemented": `create` for `{type:'slice'}` → CREATE_SLICE (payload includes `{name, goal, epic}`), `plan` for `{type:'slice'}` → BEGIN_PLAN, `refine-plan` for `{type:'slice'}` → BEGIN_REFINEMENT, `implement` for `{type:'slice'}` → BEGIN_IMPLEMENTATION, `abandon` for `{type:'slice'}` → ABANDON_SLICE (payload includes `{reason}`). Add the corresponding entries in `BeginPayloadMap` in types.ts — `create` for slice needs `{name: string; goal: string; epic: string}` payload.
- [x] Extend `complete()` in `src/core/rpc/complete.ts` to handle `{type:'slice'}` targets. Build COMPLETE_SLICE event from CompleteInput: coerce undefined arrays to `[]` for deferred, learnings, architectureDelta (per rpc-layer-api.md). The state machine injects `ts` on each ArchitectureDelta entry from the event timestamp. Return CompleteResult with deferredRouted, architecturePaths, epicComplete, learningsRolledUp extracted from the new state.
- [x] Update `BeginPayloadMap` in `src/core/rpc/types.ts` — add optional `epic` to the `create` key: `{ name: string; goal?: string; epic?: string }`. Keep `goal` as `goal?: string` (changing it to required would break `INIT_PROJECT` which doesn't use `goal`). Add runtime validation in `buildCreateEvent` (matching the existing pattern at `begin.ts:119` that throws for epic creation when `goal === undefined`): when `target.type === 'slice'`, throw `VALIDATION_INVALID_INPUT` with a user-facing message naming the `--epic` flag (e.g., "slice:create requires --epic <name>") if `epic` is absent, and also validate `goal` presence. This is a deliberate type-safety tradeoff: entity-specific phase keys (e.g., `create-slice`) would be a larger refactor outside this slice's scope.
- [x] Extend `buildBeginResult` in `src/core/rpc/begin.ts` to handle `target.type === 'slice'` — currently only handles `project` and `epic` targets; slice targets fall through to defaults (`previousStatus: "none"`, `newStatus: "unknown"`). Read old/new `Slice` from state tree to derive correct status values.
- [x] Extend `buildCompleteResult` in `src/core/rpc/complete.ts` to handle `target.type === 'slice'` — currently throws for non-epic targets. All count derivation lives here (the state machine only writes data, never counts). Must derive: (a) `epicComplete` by checking all sibling slices in the epic (via `slices/overview.json` in the new state); (b) `deferredRouted` by counting deferred items whose `targetSlice` exists in the new state's `slices/overview.json`; (c) `deferredSkipped` = total deferred - deferredRouted; (d) `learningsRolledUp` by comparing old vs new `learnings.jsonl` at epic/project levels (count new entries added).
- [x] Extend `CompleteResult` type in `src/core/rpc/types.ts` with optional fields: `deferredRouted?: DeferredItem[]` (each `DeferredItem` already contains `targetSlice: string`, so no separate `target` field is needed), `architecturePaths?: { currentArchitecture: string; targetArchitecture?: string }`, `epicComplete?: boolean`, `learningsRolledUp?: { epic: number; project: number }`. These are already defined in `rpc-layer-api.md` but missing from the implementation type.
- [x] Write unit tests: `begin(projectDir, 'create', {type:'slice', name}, {name, goal, epic})` creates slice, `begin(projectDir, 'plan', {type:'slice', name})` transitions, `begin(projectDir, 'abandon', {type:'slice', name}, {reason})` with reason, `complete(projectDir, {type:'slice', name}, input)` with full payload (deferred, learnings, architectureDelta), complete with verificationPassed:false → error

### Verification
`bun test tests/unit/rpc/` passes. `bun test` full suite passes. Slice lifecycle exercisable through RPC functions.
