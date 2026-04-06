---
name: task
description: This skill should be used when the user wants to quickly capture a bug, idea, or improvement without breaking flow. Creates a lightweight task. For quick notes only, not for research (/gp:explore) or large-scope work (/gp:create-epic). Common triggers: 'capture', 'quick note', 'bug', 'idea', 'todo', 'task', 'note this'.
user-invocable: true
requires: gp >= 1.0.0
---

# Task

## Step 0 — Version Check

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Collect Context

Gather context automatically — do not ask the user for any of this:

```bash
$GP status --json
```

Extract from the response:
- `activeSlice` → name and status
- `activeQuest` → name and status
- `activeEpic` → name and status

```bash
git branch --show-current
```

Derive `capturedDuring` — a short phrase describing what the user is currently doing, combining the active entity name with conversation context (e.g., "implementing slice foo-bar", "planning quest task-capture"). Priority order for active entity: quest > slice > epic (most specific scope first). Use the active entity's name and status from `gp status --json` to inform this — do not read `goal.md` separately. If no entity is active, derive from conversation context alone (e.g., "ad-hoc work on main branch") or omit the field.

## Step 2 — Create Task

### Path A: User provided description inline

If the user said something like "/task the error handling in migrate.ts needs fixing":

1. **Derive title**: Extract the core idea as a concise title (e.g., "Fix error handling in migrate.ts")
2. **Derive name**: Slugify the title — lowercase, replace spaces and non-alphanumeric characters with hyphens, collapse consecutive hyphens, strip leading/trailing hyphens, truncate to 50 chars
3. **Build context**: Populate from Step 1 data:
   ```json
   {
     "activeSlice": "<name or omit>",
     "activeQuest": "<name or omit>",
     "activeEpic": "<name or omit>",
     "gitBranch": "<branch>",
     "capturedDuring": "<derived from active work>"
   }
   ```
4. **Create immediately** — JSON-escape all string values (quotes, backslashes, newlines) before constructing the payload:
   ```bash
   echo '{"name":"<slug>","title":"<title>","description":"<user's original text>","context":{...}}' | $GP task:create --json
   ```
   Expected response: `{ "entity": "<slug>", "phase": "create-task", "previousStatus": "none", "newStatus": "open", "paths": {}, "nextCommands": [...] }`. Confirm creation succeeded by checking `newStatus` is `"open"`. Note: `title` is not in the response — use the title you derived in step 1.
5. **Present result**: One-liner summary using your derived title and the CLI's confirmation:
   > Captured: **<title>** (while working on <active entity>, branch: <branch>)

### Path B: Bare `/task` with no description

1. Ask "What did you notice?" via AskUserQuestion
2. Based on the answer:
   - If clear and actionable → derive title, create immediately (follow Path A steps 1-5)
   - If vague → ask one follow-up: "What should be done about it?"
3. **Never ask more than 2 questions.** If 2 questions haven't produced enough context, create with what you have — something captured is better than nothing.

## Important Behaviors

- **Speed over perfection**: Capture quickly and get back to work. Don't over-think the title or description.
- **Context is auto-populated**: Never ask the user for branch, active slice, or other system state — collect it programmatically.
- **Use `--json`** for all CLI calls.
- **Omit empty context fields**: Use conditional spread — don't include fields with undefined/null values.
- **Name collisions**: If `task:create` returns an error about duplicate names, append `-2` to the slug and retry once.
