# slice:abandon should require explicit user confirmation

## Problem

During E2E validation (2026-04-13), the LLM abandoned slices twice without any user confirmation:
1. Abandoned slice 03-cli-integration to "start implementation in dependency order"
2. During complete-epic, abandoned slices 01 and 02 because they weren't landed

While the LLM had reasons, abandoning a slice is a significant decision that destroys planned work. It should require user confirmation unless explicitly authorized.

## Expected Behavior

`slice:abandon` should either:
1. **Require an explicit `--confirmed` flag** that the LLM can only set after user confirmation via AskUserQuestion, OR
2. **Emit a shape-checkpoint-style event** that pauses for user approval before the abandon takes effect

This matches the v2 pattern of using shape checkpoints for high-consequence decisions.

## Impact

- A slice can represent hours of planning + refinement work
- Abandoning it should be deliberate, not a workaround for other issues
- In the E2E run, slice 03 was abandoned because the LLM wanted to implement slice 01 first — but this could have been achieved via sequencing, not abandonment

## Files

- `src/commands/slice/abandon.ts` — add confirmation requirement
- `plugin/skills/implement-slice/SKILL.md` — document when abandonment is appropriate
- `plugin/skills/complete-epic/SKILL.md` — pattern for handling unfinished slices (abandon vs leave open)
