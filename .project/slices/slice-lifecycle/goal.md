# Slice Lifecycle

## What We're Building
Full slice entity lifecycle: create, plan, refine-plan, implement, complete, list, show, abandon. This is the core development workflow — the most complex lifecycle with sequential enforcement (can't start slice N+1 until N is done), refinement circuit breaker (maxRounds), deferred work routing (completing a slice can add items to another slice), and learnings append at completion.

## Behavior
1. `echo '{"name":"01-data-layer","goal":"..."}' | goodplan slice:create --epic my-epic` creates slice.json within the epic's slices collection, updates slices/overview.json, adds to epic.json sliceSequence. Entity creation uses stdin JSON per commands-api.md; `--epic` is a target flag.
2. `goodplan slice:plan --slice 01-data-layer` transitions to `planning`. Guard: previous slice must be complete/abandoned or this is the first slice.
3. Plan → refine → implement lifecycle: plan-created → refining → plan-refined → implementing → implementation-complete → completed. `goodplan slice:refine-plan --slice 01-data-layer` triggers BEGIN_REFINEMENT, transitioning to `refining`.
4. Refinement circuit breaker: maxRounds enforcement, override flag to bypass.
5. `goodplan slice:complete --slice 01-data-layer` (with stdin JSON): verificationPassed gate, deferred work routing to target slices, learnings appended to slice-level and optionally rolled up. Learnings-at-completion is handled by the state machine's apply function — the COMPLETE_SLICE handler writes learnings with `rollupTo`-based targeting. This is distinct from the manual `learning:rollup` command (slice 06).
6. Sequential enforcement: attempting to plan slice 02 while slice 01 is still in progress returns STATE_SLICE_NOT_READY.
7. Implicit transition detection: completing last slice flags epicComplete in response.

## Success Criteria
- [ ] `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic --json` — creates slice.json, updates overview.json, updates epic.json sliceSequence
- [ ] `goodplan slice:list --json` — returns items array
- [ ] `goodplan slice:show --slice 01-auth --json` — returns full slice entity
- [ ] `goodplan slice:plan --slice 01-auth` — transitions to `planning`
- [ ] Plan → refine → implement → complete lifecycle succeeds for a single slice — complete step 3 walkthrough without errors (plan.md written, submit-plan advances status, refine-plan + submit-refinement above threshold advances to plan-refined, implement + submit-implementation advances to implementation-complete, slice:complete with verificationPassed:true returns completed status)
- [ ] Refinement circuit breaker: submit maxRounds refinement rounds without passing scores — returns STATE_MAX_ROUNDS_REACHED. Then submit with `--override` — bypasses and advances.
- [ ] `goodplan slice:complete` with `verificationPassed: false` — returns error, stays in `implementation-complete`
- [ ] `goodplan slice:complete` with deferred items — deferred items appear in target slice's slice.json
- [ ] Sequential enforcement: create two slices, attempt slice:plan on second while first is in `planning` — returns STATE_SLICE_NOT_READY
- [ ] Complete all slices in epic — response includes `epicComplete: true`. Verification: create two slices, complete both using `echo '{"verificationPassed":true,"deferred":[],"learnings":[],"architectureDelta":[]}' | goodplan slice:complete --slice <name> --json`, verify final response has `epicComplete: true`
- [ ] `goodplan slice:abandon --slice 01-auth --reason "test"` — transitions to abandoned from any non-terminal state
- [ ] Binary: compile and run key slice lifecycle commands

## Verification
1. Initialize project, create and activate epic.
2. Create two slices: `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic` and similarly for 02-api.
3. Walk 01-auth through full lifecycle: `slice:plan --slice 01-auth`, manually write plan.md, `submit-plan --slice 01-auth`, `goodplan slice:refine-plan --slice 01-auth` (triggers BEGIN_REFINEMENT), `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth --json` (above threshold — advances to plan-refined), manually write plan-refined.md, `slice:implement --slice 01-auth`, `submit-implementation --slice 01-auth`, then complete with `echo '{"verificationPassed":true,"deferred":[{"description":"Add retry","targetSlice":"02-api"}],"learnings":[{"category":"worked","summary":"Test","detail":"...","tags":[],"rollupTo":["epic"]}],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json`.
4. Verify deferred item appears in 02-api's slice.json.
5. Attempt to plan 02-api while 01-auth is still active — verify sequential guard.
6. Complete 01-auth using `echo '{"verificationPassed":true,"deferred":[],"learnings":[],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json`, then plan 02-api — succeeds.
7. Test circuit breaker: create a slice, `goodplan slice:refine-plan --slice <name>`, submit maxRounds rounds with below-threshold scores (`echo '{"scores":{"clarity":7,"depth":6}}' | goodplan submit-refinement --slice <name> --json`) — verify STATE_MAX_ROUNDS_REACHED rejection. Override with `--override` — verify bypass.
8. Complete both slices — verify final response includes `epicComplete: true`.
9. Compile binary and repeat key commands.

## Scope Boundaries
**In scope:** Slice entity transitions (all SliceStatus values), slice CRUD commands, plan/refine-plan/implement/complete/abandon commands, sequential enforcement guard, refinement circuit breaker + override, deferred work routing, learnings-at-completion (state machine apply function handles rollupTo-based writes during COMPLETE_SLICE — distinct from manual `learning:rollup` command in slice 06), implicit epicComplete detection. All slice-related state machine transition rows. Uses submit-plan, submit-refinement, submit-implementation from slice 03. Minimal dependency on slice 03: requires only epic:create and epic:activate. Full phase chain not needed for slice 04 verification. Slice 04 can begin once epic:create + epic:activate are working.
**Out of scope:** Sub-agent commands start-* (slice 05), context bundling (slice 05), quest lifecycle (slice 05), submit-explore/submit-architecture/submit-slices/submit-refine-* (slice 05), decisions (slice 06), learnings rollup command (slice 06), full status (slice 06).
