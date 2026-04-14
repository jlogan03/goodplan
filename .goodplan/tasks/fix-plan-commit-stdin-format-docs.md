# slice:plan-commit stdin format not documented in skills

## Problem

During E2E validation, `slice:plan-commit` was called 11+ times across 3 slices. The LLM struggled with the stdin format each time:
- First attempt: no stdin (failed)
- Second attempt: `cat plan.md | jq -Rs '{content: .}' | gp slice:plan-commit` (eventually worked)
- Each slice required 3-4 attempts before the format was discovered

The plan-slice skill doesn't clearly document the exact `slice:plan-commit` stdin format.

## Expected Stdin

```bash
cat plan.md | jq -Rs '{content: .}' | gp slice:plan-commit --epic $EPIC --slice $SLICE --json
```

The `{content: .}` wrapper (using jq -Rs to JSON-encode the markdown) is not obvious.

## Fix

Add the exact stdin format to:
1. `plugin/skills/plan-slice/SKILL.md` — in the commit step
2. `plugin/skills/_references/iteration-loop.md` — in the post-refinement commit section
3. Same for all other commit commands (epic:goal-commit, epic:architecture-commit, etc.)

## Related: slice:land also needs this treatment

During the same E2E run, `slice:land` was called with empty arrays `{"deferred":[],"learnings":[],"architectureDelta":[]}` even though the completion-slice agent had produced 4 cache files with real data. The land-slice skill didn't document HOW to construct the slice:land payload from the agent's output.

When fixing plan-commit docs, also review and fix:
- `slice:land` stdin format + how to extract arrays from `completion/learnings.cache`, `completion/architecture-delta.cache`, etc.
- `side-quest:land` stdin format
- Any other commit-style command that consumes agent output

This is the same class of problem: the skill tells the LLM *which* CLI command to call, but not *how* to construct the payload from agent cache files.
