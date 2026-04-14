# Slice 11: Supporting Skills

## Goal

Build the supporting skills for v2: `create-side-quest`, `implement-side-quest`, `land-side-quest` (side-quest lifecycle), and `audit` (project quality auditing). These complete the full skill set.

## In Scope

- `plugin/skills/create-side-quest/SKILL.md` -- rewrite for v2 `gp side-quest:*` commands
- `plugin/skills/implement-side-quest/SKILL.md` -- new skill for side-quest implementation
- `plugin/skills/land-side-quest/SKILL.md` -- new skill for side-quest landing
- `plugin/skills/audit/SKILL.md` -- rewrite for v2 audit commands
- Integration with v2 CLI commands for all side-quest lifecycle operations

## Out of Scope

- Core skills (slice 08 -- already done)
- Epic creation skills (slice 09 -- already done)
- Slice execution skills (slice 10 -- already done)
- Migration (slice 12)

## Dependencies

- Slice 08 (core-skills) -- core skill patterns

## Verification

1. `create-side-quest` skill orchestrates side-quest creation using v2 `gp side-quest:create` command
2. `implement-side-quest` skill manages side-quest implementation with `gp side-quest:implement-start`
3. `land-side-quest` skill completes side-quests with `gp side-quest:land`
4. `audit` skill dispatches to mode-specific agents and presents structured findings
5. Side-quest lifecycle end-to-end: create -> implement -> land
6. All skills follow patterns established in slice 08

## Verification Tier

**Tier: Agent SDK harness tests**

Create or extend `tools/dogfood/test-supporting-skills-v2.ts` exercising side-quest and audit skills through the Agent SDK harness.

At minimum, cover:
- `create-side-quest` skill creates a side quest via v2 `gp side-quest:*` commands
- Side-quest lifecycle: create -> implement -> land through skills
- `audit` skill dispatches to agents and produces structured findings

## Estimated Sessions

1-2
