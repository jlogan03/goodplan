# implement-start fails after plan refinement circuit-break

## Problem

During E2E validation (2026-04-13), `slice:implement-start` fails after the plan was committed via `refine:stuck` (circuit breaker) rather than `refine:converge`.

The invariant `slice.plan-converged-before-implement` likely checks for a `refinement-converged` event but the plan refinement exited via `refinement-circuit-breaker-tripped` (refine:stuck). Since the plan WAS committed (slice:plan-commit succeeded, slice at P9), implementation should be allowed.

9 attempts at implement-start, all failed. The LLM spent significant budget spawning debugging subagents to grep CLI source code trying to understand the invariant.

## Expected Behavior

After `refine:stuck` + `slice:plan-commit`, the slice is at P9. `slice:implement-start` should succeed — the plan exists and was committed. The convergence gate already fired (via circuit breaker), which is a valid exit from the refinement loop.

## Root Cause Investigation

Check `src/engine/invariants/` for `slice.plan-converged-before-implement`. Does it check for:
- `refinement-converged` event only? (bug — should also accept circuit-breaker)
- `slice-plan-committed` event? (correct — this is the phase boundary)
- Some other precondition?

Also check whether `refine:stuck` emits the right event type that satisfies the precondition.

## Fix

The invariant should check for the plan being committed (P9 phase reached), not specifically how refinement ended. Both `refine:converge` and `refine:stuck` are valid exits that lead to `slice:plan-commit`.

## Files to Check

- `src/engine/invariants/` — find the implement-start precondition
- `src/commands/slice/implement-start.ts` — check what preconditions it validates
- `src/commands/refine/stuck.ts` — check what event it emits
- `src/commands/refine/converge.ts` — compare event types
