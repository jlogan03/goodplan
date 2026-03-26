---
name: capture
requires: goodplan >= 1.0.0
description: >
  Quick capture of a bug, idea, or improvement noticed during current work —
  creates a lightweight task without breaking flow. For quick lightweight notes
  only, not for research (/explore) or large-scope work (/create-epic).
---

# Capture

Quickly capture a thought, bug, or idea as a task without breaking your current flow.

**Triggers**: `/capture`, "capture this", "note this"

## Step 0 — Version Check

```bash
goodplan --version --json
```

If the command fails: "The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `>= 1.0.0`: "This skill requires goodplan >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 1 — Load References

Read `../_shared/references/cli-interaction.md` (relative to this skill's directory) for CLI interaction conventions.

## Step 2 — Collect Context

Gather context automatically — do not ask the user for any of this:

```bash
goodplan status --json
```

Extract from the response:
- `activeSlice` → name and status
- `activeQuest` → name and status
- `activeEpic` → name and status

```bash
git branch --show-current
```

If an active entity exists (slice, quest, or epic), read its `goal.md` for a one-line summary to use as `capturedDuring` context.

Derive `capturedDuring` from conversation context and the active entity (e.g., "implementing slice foo-bar", "planning quest task-capture").

## Step 3 — Create Task

### Path A: User provided description inline

If the user said something like "/capture the error handling in migrate.ts needs fixing":

1. **Derive title**: Extract the core idea as a concise title (e.g., "Fix error handling in migrate.ts")
2. **Derive name**: Slugify the title — lowercase, replace spaces and non-alphanumeric characters with hyphens, collapse consecutive hyphens, strip leading/trailing hyphens, truncate to 50 chars
3. **Build context**: Populate from Step 2 data:
   ```json
   {
     "activeSlice": "<name or omit>",
     "activeQuest": "<name or omit>",
     "activeEpic": "<name or omit>",
     "gitBranch": "<branch>",
     "capturedDuring": "<derived from active work>"
   }
   ```
4. **Create immediately**:
   ```bash
   echo '{"name":"<slug>","title":"<title>","description":"<user's original text>","context":{...}}' | goodplan task:create --json
   ```
5. **Present result**: One-liner summary:
   > Captured: **<title>** (while working on <active entity>, branch: <branch>)

### Path B: Bare `/capture` with no description

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
- **Name collisions**: If `task:create` returns an error about duplicate names, append a numeric suffix and retry once.
