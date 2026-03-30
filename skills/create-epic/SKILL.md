---
name: create-epic
description: >
  Create a new epic. Mode A: initialize project and first epic for a new project.
  Mode B: add a new epic to an existing project. Common triggers: 'start project',
  'new project', 'new epic', 'create epic', 'add epic', 'start fresh',
  'I have a new idea'.
requires: gp >= 1.0.0
---

# Create Epic

Two modes based on project state:

- **Mode A** — New project: initializes `.goodplan/` via CLI, captures idea, creates first epic with `goal.md`.
- **Mode B** — Existing project: captures a new epic goal, creates epic via CLI.

## Step 1 — Version Check

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

Verify the reported version satisfies `requires: gp >= 1.0.0`. If the CLI is not found or the version is too old:

> The `gp` CLI is required (>= 1.0.0) but was not found or is incompatible. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check.

**Stop the skill.** Do not fall back to direct file access.

For all CLI commands in this skill, follow error handling patterns in `../_shared/references/cli-interaction.md` (section 10: Error Handling). Key points: exit code 1 = internal/unexpected error (present to user and stop), exit code 2 = validation/usage error (fix invocation — likely a skill bug), exit code 3 = state machine error (parse error code from JSON, apply recovery pattern).

## Step 2 — Detect Mode

```bash
gp status --json
```

- **Success** → Mode B (existing project). Check `.activeEpic` in the response.
- **Exit 1 with `DATA_NO_PROJECT`** → Mode A (fresh project). This is the expected "no project yet" signal — not an unexpected error. Overrides the general exit-1 guidance in Step 1.
- **Exit 1 with any other error** → present to user and stop (per Step 1 rules).

---

## Mode A — New Project Setup + First Epic

### Step 3 — Idea Capture

Start an open conversation to understand what the user wants to build. Begin with:

- "What are you trying to build?"
- "What problem are you solving?"

Follow threads naturally. Ask one or two follow-up questions at a time — not a list. Listen for what excites the user and dig into that.

**Internal coverage checklist** (track mentally, do NOT show to the user):

1. Problem — what's broken or missing today
2. Desired outcome — what success looks like
3. Scope — what's in and what's explicitly out
4. Constraints — technical, timeline, resource, or other
5. Open questions — unknowns to resolve

**Wrap-up heuristic**: If 3+ exchanges passed without substantive new information AND all five areas touched, offer to wrap up: "I think I have a good picture. Ready for me to write this up, or is there more?"

If the user signals they want to wrap up early ("that's enough", "just write what you have", etc.), proceed immediately without completing the remaining coverage areas.

### Step 3b — Expertise Calibration

Follow calibration depth guidance in `../_shared/references/expertise-tracking.md`.

1. Read `../_shared/references/expertise-tracking.md` for the expertise tracking protocol.
2. Check if `~/.claude/CLAUDE.md` has an existing `## Expertise` section.
3. Identify domains the project idea touches that aren't already covered.
4. If uncovered domains exist, use AskUserQuestion: "This project involves [X] and [Y] — how familiar are you with those areas?"
5. Write/update `## Expertise` section in `~/.claude/CLAUDE.md` and auto memory files per the protocol.
6. If all relevant domains are already covered, skip silently.

### Step 4 — Initialize Project

Derive a project name from the conversation (kebab-case, 2-4 words). If unclear, ask.

```bash
gp init --name <project-name> --json
```

This creates `.goodplan/`, `project.json`, and all standard directories.

### Step 5 — Write idea.md

Read `references/templates.md` for the idea.md template. Write `.goodplan/idea.md` with substantive content synthesized from the conversation — never placeholder text.

### Step 6 — Create First Epic

```bash
echo '{"name":"initial","goal":"<goal-summary>"}' | gp epic:create --json
```

The response includes an `entity` field with the epic name. Use this to derive the goal.md path via the fixed convention: `.goodplan/epics/<entity>/goal.md`.

### Step 7 — Write goal.md

Write `.goodplan/epics/initial/goal.md`:

```markdown
# Epic Goal: initial

<1-3 paragraph summary of the epic's goal, derived from the idea conversation. This is the first epic — it covers the full scope of the project idea.>
```

### Step 8 — Confirm

```bash
gp epic:show --epic initial --json
```

Verify the response includes `name`, `status`, and `goal` fields. Check `status === "created"`.

### Step 9 — Update CLAUDE.md

Read `references/templates.md` for the Project Context section format. Update `CLAUDE.md` in the project root:

**Case 1 — No CLAUDE.md exists**: Create it with the Project Context section.

**Case 2 — CLAUDE.md exists but no `## Project Context` section**: Append the section at the end with a blank line before the header.

**Case 3 — `## Project Context` already exists**: Check if `.goodplan/idea.md` already appears. If yes, skip. If no, add `- \`.goodplan/idea.md\` — project goal, scope, constraints` under the section header.

### Done (Mode A)

> Project planning is set up. Here's what was created:
>
> - `.goodplan/idea.md` — your project idea
> - `.goodplan/epics/initial/goal.md` — first epic goal
> - `CLAUDE.md` — updated with project context
>
> **Next**: Run `/explore` or `/create-architecture` to begin working on the initial epic.

---

## Mode B — New Epic on Existing Project

If `.activeEpic` is non-null in the `status` response, inform the user before proceeding:

> There's currently an active epic: **`<activeEpic>`**. Creating a new epic won't affect it — you can have multiple epics, but only one is active at a time. The new epic will start in `created` status.

### Step B1 — Interactive Goal Capture

Start a conversation to understand the new epic:

- "What's this epic about?"
- "What do you want to achieve with this new body of work?"

Follow threads naturally. Ask one or two follow-up questions at a time. Cover:

1. Goal — what the epic aims to accomplish
2. Motivation — why now, what prompted it
3. Rough scope — what's in, what's explicitly out

**Wrap-up heuristic**: Same as Mode A Step 3.

### Step B2 — Detect Epic Name

Auto-detect a kebab-case name (2-4 words) from the conversation. If unclear, ask: "What should we call this epic? I'm thinking `<suggestion>` — does that work?"

### Step B3 — Create Epic

```bash
echo '{"name":"<name>","goal":"<goal-summary>"}' | gp epic:create --json
```

The response includes an `entity` field. Use the fixed convention `.goodplan/epics/<entity>/goal.md` for the goal path.

### Step B4 — Write goal.md

Write `.goodplan/epics/<name>/goal.md`:

```markdown
# Epic Goal: <name>

<1-3 paragraph summary of the epic's goal, derived from the conversation.>
```

### Step B5 — Confirm

```bash
gp status --json
```

Verify the new epic appears in the response.

### Done (Mode B)

> New epic created:
>
> - `.goodplan/epics/<name>/goal.md` — epic goal
>
> **Next**: Run `/explore` to research and brainstorm, or `/create-architecture` to propose architecture changes.
