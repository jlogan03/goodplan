# Slice Lifecycle

## What We're Building
Full slice entity lifecycle: create, plan, refine-plan, implement, complete, list, show, abandon. This is the core development workflow — the most complex lifecycle with sequential enforcement (can't start slice N+1 until N is done), refinement circuit breaker (maxRounds), deferred work routing (completing a slice can add items to another slice), and learnings append at completion.

## Behavior
1. `goodplan slice:create --name 01-data-layer --epic my-epic --goal "..."` creates slice.json within the epic's slices collection, updates slices/overview.json, adds to epic.json sliceSequence.
2. `goodplan slice:plan --slice 01-data-layer` transitions to `planning`. Guard: previous slice must be complete/abandoned or this is the first slice.
3. Plan → refine → implement lifecycle: plan-created → refining → plan-refined → implementing → implementation-complete → completed.
4. Refinement circuit breaker: maxRounds enforcement, override flag to bypass.
5. `goodplan slice:complete --slice 01-data-layer` (with stdin): verificationPassed gate, deferred work routing to target slices, learnings appended to slice-level and optionally rolled up.
6. Sequential enforcement: attempting to plan slice 02 while slice 01 is still in progress returns STATE_SLICE_NOT_READY.
7. Implicit transition detection: completing last slice flags epicComplete in response.

## Success Criteria
- [ ] `goodplan slice:create --name 01-auth --epic my-epic --goal "Auth" --json` — creates slice.json, updates overview.json, updates epic.json sliceSequence
- [ ] `goodplan slice:list --json` — returns items array
- [ ] `goodplan slice:show --slice 01-auth --json` — returns full slice entity
- [ ] `goodplan slice:plan --slice 01-auth` — transitions to `planning`
- [ ] Plan → refine → implement → complete lifecycle succeeds for a single slice
- [ ] Refinement circuit breaker: submit maxRounds refinement rounds without passing scores — returns STATE_MAX_ROUNDS_REACHED. Then submit with `--override` — bypasses and advances.
- [ ] `goodplan slice:complete` with `verificationPassed: false` — returns error, stays in `implementation-complete`
- [ ] `goodplan slice:complete` with deferred items — deferred items appear in target slice's slice.json
- [ ] Sequential enforcement: create two slices, attempt slice:plan on second while first is in `planning` — returns STATE_SLICE_NOT_READY
- [ ] Complete all slices in epic — response includes `epicComplete: true`
- [ ] `goodplan slice:abandon --slice 01-auth --reason "test"` — transitions to abandoned from any non-terminal state
- [ ] Binary: compile and run key slice lifecycle commands

## Verification
1. Initialize project, create and activate epic.
2. Create two slices (01-auth, 02-api).
3. Walk 01-auth through full lifecycle: plan → refine (2 rounds) → implement → complete (with deferred item targeting 02-api).
4. Verify deferred item appears in 02-api's slice.json.
5. Attempt to plan 02-api while 01-auth is still active — verify sequential guard.
6. Complete 01-auth, then plan 02-api — succeeds.
7. Test circuit breaker: create a slice, start refinement, submit maxRounds rounds without passing — verify rejection. Override — verify bypass.
8. Compile binary and repeat key commands.

## Scope Boundaries
**In scope:** Slice entity transitions (all SliceStatus values), slice CRUD commands, plan/refine/implement/complete/abandon commands, sequential enforcement guard, refinement circuit breaker + override, deferred work routing, learnings append at completion, implicit epicComplete detection. All slice-related state machine transition rows.
**Out of scope:** Sub-agent commands start-*/submit-* (slice 05), context bundling (slice 05), quest lifecycle (slice 05), decisions (slice 06), learnings rollup command (slice 06), full status (slice 06).
