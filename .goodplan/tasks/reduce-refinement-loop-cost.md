# Refinement loops are expensive — review whether thresholds and reviewer counts are calibrated

## Problem

During E2E validation (2026-04-13), the refinement loops dominated the run cost:
- Architecture refinement: multiple rounds with 4 reviewers, hit round cap
- Slice-set refinement: 2 rounds, circuit-broken
- Plan refinement (each slice): 6+ rounds with 6 reviewers, circuit-broken
- Code refinement: 2-3 rounds with 3 reviewers

The refinement loops consumed most of the $69.70 total cost. Each reviewer is an Opus call ($3-5 per reviewer per round).

## Questions

1. **Is threshold 9/10 appropriate?** The rubrics require scores of 9 across ALL reviewers to converge. In practice, scores stall at 7-8 and the circuit breaker fires. Is this actually better than a lower threshold with fewer rounds?

2. **Are all reviewers needed every round?** The plan-slice skill spawns 6 reviewers (holistic, plan, typescript, verification-plausibility, context-transport, invariant-checker) for every artifact. Could we route more selectively?

3. **Should synthesis/edit happen every round?** Maybe some rounds should be review-only (no edit) to see if scores stabilize.

4. **Is parallel review worth the cost?** Spawning 6 Opus sub-agents in parallel is expensive. Sequential review might be cheaper if earlier reviewers surface issues that make later reviews redundant.

## Approach

1. Analyze the transcript to see actual time/cost per round
2. Compare final artifact quality across rounds — did late rounds actually improve things, or did scores just oscillate?
3. Consider: lower threshold (7 instead of 9), fewer reviewers (3 instead of 6), or allowing convergence with "majority at threshold" instead of "all at threshold"

## Files

- `plugin/rubrics/*.yaml` — threshold configuration
- `plugin/skills/_references/iteration-loop.md` — loop parameters
- `src/trust/reviewers/routing.ts` — reviewer selection logic

## Impact

Current cost per plan-slice: ~$20. At scale, this is prohibitive for normal use. Target should be <$5 per slice plan.
