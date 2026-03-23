# Phase 3: RPC Layer Wiring

Wire the remaining slice BeginPhase values through begin() and extend complete() with full CompleteInput payload support.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts` with `begin('create', {type:'slice'})` in a test → throws "not yet implemented"
- [ ] `bun run src/index.ts` with `complete({type:'slice'}, ...)` in a test → throws "not yet implemented"

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/rpc/` — all RPC tests pass (existing + new)
- [ ] `npx tsc --noEmit` — passes

### Tasks

- [ ] Extend `begin()` in `src/core/rpc/begin.ts` to handle slice-specific BeginPhase values that currently throw "not yet implemented": `create` for `{type:'slice'}` → CREATE_SLICE (payload includes `{name, goal, epic}`), `plan` for `{type:'slice'}` → BEGIN_PLAN, `refine-plan` for `{type:'slice'}` → BEGIN_REFINEMENT, `implement` for `{type:'slice'}` → BEGIN_IMPLEMENTATION, `abandon` for `{type:'slice'}` → ABANDON_SLICE (payload includes `{reason}`). Add the corresponding entries in `BeginPayloadMap` in types.ts — `create` for slice needs `{name: string; goal: string; epic: string}` payload.
- [ ] Extend `complete()` in `src/core/rpc/complete.ts` to handle `{type:'slice'}` targets. Build COMPLETE_SLICE event from CompleteInput: coerce undefined arrays to `[]` for deferred, learnings, architectureDelta (per rpc-layer-api.md). Inject `ts` on each ArchitectureDelta entry. Return CompleteResult with deferredRouted, architecturePaths, epicComplete, learningsRolledUp extracted from the new state.
- [ ] Update `BeginPayloadMap` in `src/core/rpc/types.ts` — the `create` key currently maps to `{name: string; goal: string}` (epic only). This needs to become a union or the mapping needs to account for target type. Option: keep `create` payload as `{name: string; goal: string; epic?: string}` where `epic` is required for slice targets and absent for epic targets. The RPC layer validates `epic` presence when `target.type === 'slice'`.
- [ ] Write unit tests: begin('create', {type:'slice'}) creates slice, begin('plan', {type:'slice'}) transitions, begin('abandon', {type:'slice'}) with reason, complete({type:'slice'}) with full payload (deferred, learnings, architectureDelta), complete with verificationPassed:false → error

### Verification
`bun test tests/unit/rpc/` passes. `bun test` full suite passes. Slice lifecycle exercisable through RPC functions.
