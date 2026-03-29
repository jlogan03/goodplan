# Brainstorm: How Skill Prompts Reference the CLI

## Approach

Skill files contain concrete CLI commands that the LLM executes directly. The `goodplan schema` command serves as a fallback for edge cases where the LLM encounters unexpected input/output formats or needs to recover from errors.

## Why This Approach

- **LLMs follow system-level instructions (skill prompts) faithfully.** Putting the workflow and exact commands in the skill prompt means the LLM knows exactly what to call.
- **LLMs are trained to treat tool output as data, not directives.** Having the CLI return behavioral instructions via `goodplan schema --format=skill-prompt` would risk the LLM not following them (prompt injection skepticism).
- **Schema as escape hatch, not primary path.** If the LLM hits an unexpected error or format mismatch, it can call `goodplan schema <command>` to check the current API shape and self-correct.

## Skill Prompt Structure

```markdown
## Phase: Plan Creation

1. Call `goodplan build:plan begin --slice <name> --json` to enter plan mode
2. Call `goodplan build:plan context --slice <name> --json` to load working context
3. Interview the user using the context (goal, architecture, conventions, learnings)
4. Write the plan
5. Submit via stdin:
   cat <<'EOF' | goodplan build:plan complete --slice <name> --json
   { "stdin": { "planContent": "...", "decisions": [...] } }
   EOF
6. Check the response — `nextActions` tells you what comes next

If you encounter an unexpected error or format issue, call:
  `goodplan schema build:plan complete`
to check the current expected input/output format.
```

## Keeping Skills and CLI in Sync

**This epic (now):** Skills are written by hand against the CLI we build. Concrete commands in the skill match the CLI implementation.

**Distribution epic (future):** The CLI generates and installs skill files into `~/.claude/skills/`. Since the CLI is the source of truth for both the command surface and the skill content, drift is eliminated by construction. `goodplan update` regenerates skills from the current CLI version.

## Open Questions

- Should the skill prompt include the full stdin JSON schema inline, or just the key fields and rely on `goodplan schema` for the complete shape?
- How much workflow context does the orchestrator skill need vs. can it discover from `goodplan status`?
