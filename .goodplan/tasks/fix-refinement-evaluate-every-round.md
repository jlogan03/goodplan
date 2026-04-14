# Refinement loop must evaluate convergence every round

## Problem

During the E2E validation run (2026-04-13), the plan-slice skill ran 6 refinement rounds but only called `refine:evaluate` 4 times. The LLM is launching new review rounds without checking convergence after each round.

This means:
- Rounds 5 and 6 ran unnecessarily — convergence might have been reached but was never checked
- The circuit breaker (`max_rounds: 8`) can't fire if `refine:evaluate` isn't called
- Each unnecessary round costs $5-10 in reviewer + editor + synthesis Opus calls
- The loop only exits via budget cap ($50) instead of the designed convergence gate

## Root Cause

The `iteration-loop.md` skill reference describes the evaluate step but doesn't enforce it as mandatory after every round. The LLM sometimes skips evaluate and goes straight to the next round of reviews, especially when it "knows" scores are below threshold and decides to iterate instead.

The convergence evaluator is a **read-only** command (`refine:evaluate`) — it doesn't emit events. So skipping it has no state consequences, but it means the circuit breaker logic never runs.

## Expected Behavior

After every round of review → synthesis → edit:
1. Call `refine:evaluate` (mandatory, not optional)
2. If CONVERGED → call `refine:converge` → exit loop
3. If CIRCUIT-BROKEN → call `refine:stuck` → exit loop  
4. If CONTINUE → proceed to next round

The LLM should NEVER start a new review round without calling `refine:evaluate` first.

## Fix Options

### Option A: Make it a skill instruction (soft fix)
Add explicit language to `iteration-loop.md`:
```
**MANDATORY**: After recording all reviewer scores and synthesis for a round, 
you MUST call `refine:evaluate` before starting the next round. Do not skip 
this step even if you believe scores are below threshold. The evaluate command 
runs the circuit breaker which can terminate the loop on stuck findings or 
reviewer disagreement — conditions you cannot detect by looking at scores alone.
```

### Option B: Make the CLI enforce it (hard fix)
Have `refine:start` (which begins a new round) check that `refine:evaluate` was called for the previous round. If not, return an error:
```
Error: Previous round was not evaluated. Call `gp refine:evaluate` before starting a new round.
```
This makes skipping evaluate impossible.

### Option C: Both
Soft fix in the skill (immediate), hard fix in the CLI (prevents regression).

## Impact

- Plan-slice ran 6 rounds instead of potentially 4 (if evaluate had detected convergence or circuit-break)
- Extra ~$20 wasted on unnecessary rounds
- Circuit breaker conditions (stuck-finding, reviewer-disagreement) go undetected
- Budget cap becomes the de facto exit mechanism instead of the designed convergence gate

## Files to Change

- `plugin/skills/_references/iteration-loop.md` — add mandatory evaluate instruction (Option A)
- `src/commands/refine/start.ts` — add previous-round-evaluated check (Option B)
- `src/engine/invariants/` — consider adding an invariant rule for evaluate-before-next-round
