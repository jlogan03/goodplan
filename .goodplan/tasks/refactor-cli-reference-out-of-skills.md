# Refactor CLI reference out of skills — move to standalone non-user-callable skill

## Problem

Currently `plugin/skills/_references/cli-interaction.md` is included (via `@` reference) in most skills and sub-agents. This dumps the entire CLI reference into every skill's context window, even though each skill only uses a small subset of commands.

This is wasteful:
- Bloats every skill's context with ~400 lines of CLI reference material
- The LLM has to parse through irrelevant commands to find the ones it needs
- When the reference is wrong (as we found with refine:synthesize/revise formats), every skill inherits the bug
- Skills that specify exact commands don't need the general reference at all

## Proposed Solution

### 1. Remove cli-interaction.md from skills that specify exact commands

If a skill says exactly:
```bash
echo '{"dimensions":[{"name":"holistic","score":8}],"findings":[]}' | $GP refine:score --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --reviewer holistic --json
```

...then it doesn't need the general CLI reference. The skill IS the reference for its commands.

### 2. Create a non-user-callable CLI reference skill

For cases where the LLM needs to interact with the CLI outside of a structured skill (e.g., user asks "what's the status of my epic?"), create a standalone skill:

```
plugin/skills/cli-reference/SKILL.md
```

With frontmatter:
```yaml
---
description: Internal CLI reference for goodplan commands. Not user-callable — loaded automatically when LLM needs to interact with the gp CLI outside of structured skills.
user_callable: false
---
```

This skill would contain:
- Complete command tree with all subcommands
- Exact stdin/stdout schemas for every command
- Exit code meanings
- Common patterns (ContentRef creation, event querying)

### 3. Skills reference only their own commands inline

Each skill should contain the complete CLI contract for every command it uses, inline in the skill body. No external reference needed. This means:
- `create-epic/SKILL.md` has the exact schemas for `epic:create`, `epic:goal-draft`, `epic:goal-commit`, `epic:architecture-draft`, etc.
- `plan-slice/SKILL.md` has the exact schemas for `slice:plan-draft`, `slice:plan-commit`, `refine:start`, `refine:score`, etc.
- `iteration-loop.md` (shared reference) has the exact schemas for `refine:*` commands

### Benefits

- **Smaller context per skill** — only the commands the skill uses
- **Single source of truth per command** — the skill that uses it owns the documentation
- **No stale cross-references** — when a command schema changes, you update the skill that uses it
- **Fallback for ad-hoc CLI use** — the non-user-callable skill covers edge cases

### Files to Change

- `plugin/skills/_references/cli-interaction.md` — extract content into per-skill inline docs, then reduce to minimal or remove
- `plugin/skills/cli-reference/SKILL.md` — new non-user-callable skill with complete CLI reference
- All skills that currently `@` reference cli-interaction.md — replace with inline command contracts
- All agent `.md` files that reference cli-interaction.md — remove reference, agents should get CLI context from the skill that spawned them

### Migration Strategy

1. Create the non-user-callable cli-reference skill first
2. Update iteration-loop.md with exact refine:* command schemas (highest ROI — fixes the E2E bugs)
3. Audit each skill for CLI interactions and add inline contracts
4. Remove `@` references to cli-interaction.md from skills that now have inline contracts
5. Slim down cli-interaction.md to just the non-user-callable skill content
