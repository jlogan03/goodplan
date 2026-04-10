# Slice 09: Epic Creation Skills

## Goal

Rewrite the epic creation and exploration skills for v2: `create-epic` (design-tree interviewing, pressure-test, shape checkpoints), `start-epic` (P6 activation), and `explore` (collaborative mode awareness).

## In Scope

- `plugin/skills/create-epic/SKILL.md` -- rewrite for P1+P3+P4+P5 (design-tree interviewing, pressure-test, shape checkpoints)
- `plugin/skills/start-epic/SKILL.md` -- extend for P6 (epic activation with user approval)
- `plugin/skills/explore/SKILL.md` -- update for collaborative mode awareness
- Related agent definitions for pressure-test phase

## Out of Scope

- Slice execution skills (slice 10)
- Supporting skills (slice 11)
- Core skills already done in slice 08

## Dependencies

- Slice 08 (core-skills) -- depends on `workflow-guide` and `status` patterns

## Verification

1. `create-epic` skill orchestrates the full P1+P3+P4+P5 flow using v2 `gp epic:*` commands
2. Shape checkpoint commands emit `architecture-shape-checkpoint-reached` event and refuse refinement without `shape-approved` event
3. Pressure-test phase dispatches reviewers and handles convergence/circuit-break
4. `start-epic` skill activates an epic (P6) with user confirmation
5. `explore` skill correctly handles collaborative mode (waits for user input)
6. Dogfood harness exercises the create-epic pipeline end-to-end

## Verification Tier

**Tier: Agent SDK harness tests**

Create or extend `tools/dogfood/test-create-epic-v2.ts` exercising the create-epic pipeline through the Agent SDK harness.

At minimum, cover:
- `create-epic` skill produces an epic with goal, architecture, and slices via v2 `gp epic:*` commands
- Shape checkpoint commands are called during the flow
- `start-epic` skill activates the epic
- Event log contains expected event sequence (verified via `gp events:tail --json`)

## Estimated Sessions

1-2
