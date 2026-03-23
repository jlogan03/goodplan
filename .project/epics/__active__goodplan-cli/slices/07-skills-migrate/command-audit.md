# Command Reference Audit

Snapshot of `goodplan` CLI command references found in `skills/` markdown files, cross-referenced against the implemented command surface in `src/commands/main.ts`.

Date: 2026-03-23

## Findings

**No `goodplan <command>` CLI invocations found in skill files.**

Skills are markdown prompts for Claude Code agents — they reference slash commands (`/create-plan`, `/implement-plan`, etc.) and project file paths, not the `goodplan` CLI binary. The only occurrence of "goodplan" in skill files is the phrase "goodplan structured development workflow" in `skills/project-status/SKILL.md`, which is a description, not a command invocation.

This is expected: skills orchestrate agent workflows via Claude Code's skill system, while the CLI is a separate interface for direct user invocation. The two surfaces will converge when skills are updated to call the CLI in a future consolidation epic.

## Implemented CLI Commands (54 total)

| Namespace | Commands |
|-----------|----------|
| (global) | `init`, `schema`, `status` |
| decision | `decision:create`, `decision:list`, `decision:show`, `decision:update` |
| epic | `epic:create`, `epic:list`, `epic:show`, `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices`, `epic:activate`, `epic:complete`, `epic:abandon`, `epic:add-verification`, `epic:update-verification` |
| learning | `learning:list`, `learning:rollup` |
| quest | `quest:create`, `quest:list`, `quest:show`, `quest:plan`, `quest:refine-plan`, `quest:implement`, `quest:complete`, `quest:abandon` |
| slice | `slice:create`, `slice:list`, `slice:show`, `slice:plan`, `slice:refine-plan`, `slice:implement`, `slice:complete`, `slice:abandon` |
| subagent | `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`, `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices` |

## Summary

- Commands referenced in skills: **0**
- Commands implemented: **54**
- Missing commands: **0** (no references to cross-check)

## Note for Future Work

When skills are consolidated to invoke the CLI directly (future epic), this audit should be re-run to verify that skill command references match the implemented surface. The subagent `start-*`/`submit-*` commands are the likely bridge — skills will invoke these to orchestrate workflows through the CLI rather than through Claude Code's slash command system.
