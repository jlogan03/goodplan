# implement-slice skill should not plan slices

## Problem

During E2E validation (2026-04-13), the implement-slice skill (step 5) was given a slice to implement but instead:
1. Decided the slices should be implemented in a different order
2. Abandoned slice 03-cli-integration (`slice:abandon`)
3. Planned slice 01-sr-engine-and-review-store from scratch (spawned plan-phase agent, ran refinement)
4. Then implemented slice 01

The implement-slice skill should only implement a slice that already has a committed plan (P9). It should not make ordering decisions, abandon other slices, or plan new ones.

## Why It Happened

The implement-slice skill prompt included the epic name but the harness didn't specify which exact slice to implement. The LLM read the epic state, saw multiple slices, decided that slice 01 (SR engine) was a dependency of slice 02 (quiz integration), and took initiative to reorder.

This is partly a harness issue (should specify exact slice) and partly a skill boundary issue (implement-slice shouldn't have the ability to abandon/plan).

## Fix

1. **Skill boundary**: implement-slice skill should explicitly state it does NOT plan, abandon, or reorder slices. It receives a specific slice name and implements it.
2. **Harness improvement**: The harness prompt should specify `--slice <name>` explicitly, not let the LLM choose.
3. **CLI guard**: Consider having `slice:abandon` require a more explicit confirmation when called from within an implement session.

## Files

- `plugin/skills/implement-slice/SKILL.md` — add boundary constraints
- `tools/dogfood/validate-consolidated.ts` — stepImplement should pass specific slice name
