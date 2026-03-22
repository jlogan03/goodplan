# Phase 5: End-to-End Integration

Full lifecycle walkthrough matching goal.md success criteria. Sequential enforcement, circuit breaker, deferred routing, epicComplete detection, binary regression.

### Expected Behavior

**Before implementation** (N/A — this phase is integration testing of already-implemented features):
- All commands already work from Phase 4. This phase verifies the integrated whole.

**After implementation** (should all pass):
- [ ] Full lifecycle walkthrough completes without errors (see walkthrough below)
- [ ] Binary: `bun run build && ./goodplan slice:create --json` (with piped input) works in compiled binary

### Tasks

- [ ] Run full test suite: `bun test` — all tests pass
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] End-to-end verification walkthrough in temp dir (matches goal.md Verification section):
  1. `goodplan init --name test-project`
  2. `echo '{"name":"my-epic","goal":"Build"}' | goodplan epic:create` → create epic
  3. Set up epic for activation (every command listed):
     - `goodplan epic:explore --epic my-epic` → exploring
     - Write explore output files, then `echo '{}' | goodplan submit-explore --epic my-epic` → explored
     - `goodplan epic:architecture --epic my-epic` → architecting
     - Write architecture files, then `echo '{}' | goodplan submit-architecture --epic my-epic` → architecture-complete
     - `goodplan epic:slices --epic my-epic` → slicing
     - Write slice definitions, then `echo '{}' | goodplan submit-slices --epic my-epic` → slices-complete
     - `goodplan epic:refine-slices --epic my-epic` → refining-slices
     - `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refine-slices --epic my-epic` → slices-refined (or use `--override` if scores below threshold)
     - `goodplan epic:add-verification --epic my-epic` → add verification criteria
     - `goodplan epic:activate --epic my-epic` → activated
  4. `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic` → creates slice (stdin carries `{name, goal}`, `--epic` flag specifies target epic)
  5. `echo '{"name":"02-api","goal":"API"}' | goodplan slice:create --epic my-epic` → creates second slice
  6. `goodplan slice:plan --slice 01-auth` → planning
  7. Write a plan.md file to `.project/slices/01-auth/plan.md`, then `echo '{}' | goodplan submit-plan --slice 01-auth` → plan-created (submit-plan takes `--slice` flag and empty stdin — no content payload, pure state trigger)
  8. `goodplan slice:refine-plan --slice 01-auth` → transitions to refining. Write `plan-refined.md` to `.project/slices/01-auth/plan-refined.md`, then `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth` → plan-refined (submit-refinement takes `--slice` flag and `{scores}` stdin)
  9. Write plan-refined.md, `goodplan slice:implement --slice 01-auth` → implementing. `goodplan submit-implementation --slice 01-auth` → implementation-complete
  10. **Sequential enforcement**: attempt `goodplan slice:plan --slice 02-api` while 01-auth is still in progress (before completion) → STATE_SLICE_NOT_READY (exit 3).
  11. Complete 01-auth: `echo '{"verificationPassed":true,"deferred":[{"description":"Add retry","targetSlice":"02-api"}],"learnings":[{"category":"worked","summary":"Test","detail":"Detail","tags":[],"rollupTo":["epic"]}],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json` → completed. Verify deferred appears in 02-api's slice.json. Then `goodplan slice:plan --slice 02-api` → succeeds (sequential enforcement passes now that 01-auth is complete).
  12. **Circuit breaker**: create a test slice, begin refinement, submit maxRounds (10) rounds with below-threshold scores → STATE_MAX_ROUNDS_REACHED. Submit with `--override` → bypasses.
  13. **epicComplete**: complete both slices → verify final response includes `epicComplete: true`
  14. **Abandon**: create another slice, abandon it → abandoned status, activeSlice cleared
  15. `goodplan slice:list --json` and `slice:show --slice 01-auth --json` → correct output
  16. Verify activity-log.jsonl has entries for all transitions
- [ ] Binary regression: `bun run build && cd $(mktemp -d) && ./goodplan init --name bin-test && echo '{"name":"bin-epic","goal":"test"}' | ./goodplan epic:create --json && ... epic activation ... && echo '{"name":"01-bin","goal":"test"}' | ./goodplan slice:create --epic bin-epic --json && ./goodplan slice:list --json` (use `./goodplan` output path from `bun build --compile`)
- [ ] Verify `state-machine-api.md` is updated with all 6 new slice events (CREATE_SLICE, BEGIN_PLAN, BEGIN_REFINEMENT, BEGIN_IMPLEMENTATION, COMPLETE_SLICE, ABANDON_SLICE) including their full payload shapes and return types.
- [ ] Update `.project/conventions.md` repo structure: add `src/commands/slice/` (create, list, show, plan, refine-plan, implement, complete, abandon), `src/core/state/transitions/` (slice-create, slice-plan, slice-implement, slice-complete, slice-abandon), `src/schemas/commands/slice.ts`

### Verification
1. Full end-to-end walkthrough in temp dir covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles slice create + list.
4. Sequential enforcement verified (STATE_SLICE_NOT_READY).
5. Circuit breaker verified (STATE_MAX_ROUNDS_REACHED + override bypass).
6. Deferred routing verified (item appears in target slice).
7. epicComplete flag verified (all slices done → true).
