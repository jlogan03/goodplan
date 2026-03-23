---
name: create-epic
description: >
  Create a new epic. Mode A: set up .project/ and first epic for a new project.
  Mode B: add a new epic to an existing project. Common triggers: 'start project',
  'new project', 'new epic', 'create epic', 'add epic', 'start fresh',
  'I have a new idea'.
---

# Create Epic

Two modes based on whether `.project/` already exists:

- **Mode A** — New project: creates `.project/` directory structure, captures idea, creates `epics/__active__initial/` with `goal.md`.
- **Mode B** — Existing project: captures a new epic goal, creates `epics/<name>/` (not active).

## Step 0 — Read Epic Conventions

Use the Read tool to load `~/.claude/skills/_shared/references/epic-conventions.md`. This is the single source of truth for epic directory structure, the `__active__` prefix convention, and the epic state machine.

## Step 1 — Mode Detection

Check if `.project/` already exists:

```bash
ls -la .project/ 2>/dev/null
```

- **If `.project/` does not exist** → proceed with **Mode A** (Step 2).
- **If `.project/` exists** → proceed with **Mode B** (Step 10).

---

## Mode A — New Project Setup + First Epic

### Step 2 — Create Directory Structure

Run:

```bash
mkdir -p .project/{research,brainstorm,prototypes,side-quests,retrospectives,activity-log,decisions,epics/__active__initial}
```

This creates the top-level directories and the first epic directory. Do NOT create a top-level `slices/` — slices live inside epics.

### Step 3 — Gitignore

Check if `.project/state.md` is already covered in `.gitignore`:

```bash
grep -qF '.project/state.md' .gitignore 2>/dev/null
```

If the grep fails (file missing or no match), ensure `.project/state.md` is added:

- If `.gitignore` does not exist, create it with `.project/state.md` as the only line.
- If `.gitignore` exists, check if it ends with a newline. If not, prepend one before appending. Then append `.project/state.md` on its own line.

```bash
# Create or append — handles missing trailing newline
if [ ! -f .gitignore ]; then
  echo '.project/state.md' > .gitignore
elif ! grep -qF '.project/state.md' .gitignore; then
  # Ensure trailing newline before appending
  [ -n "$(tail -c1 .gitignore)" ] && echo '' >> .gitignore
  echo '.project/state.md' >> .gitignore
fi
```

### Step 4 — Idea Capture

Start an open conversation to understand what the user wants to build. Begin with a question like:

- "What are you trying to build?"
- "What problem are you solving?"

Then follow threads naturally. Ask one or two follow-up questions at a time — not a list. Listen for what excites the user and dig into that.

**Internal coverage checklist** (track mentally, do NOT show to the user):

1. Problem — what's broken or missing today
2. Desired outcome — what success looks like
3. Scope — what's in and what's explicitly out
4. Constraints — technical, timeline, resource, or other
5. Open questions — unknowns to resolve

**Wrap-up heuristic**: If 3 or more exchanges have passed without substantive new information AND all five areas have been touched, offer to wrap up: "I think I have a good picture. Ready for me to write this up, or is there more?"

If the user signals they want to wrap up early ("that's enough", "just write what you have", etc.), proceed immediately — all five areas need not be covered.

Continue the conversation until the user confirms the idea is well-captured.

### Step 4b — Expertise Calibration

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

1. Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the expertise tracking protocol.
2. Check if `~/.claude/CLAUDE.md` has an existing `## Expertise` section.
3. Identify domains the project idea touches (from the conversation so far) that aren't already covered in the expertise section.
4. If there are uncovered domains, use AskUserQuestion: "This project involves [X] and [Y] — how familiar are you with those areas?" Adjust question depth based on how many domains are uncovered.
5. Write/update `## Expertise` section in `~/.claude/CLAUDE.md` with the new information.
6. Write/update auto memory files (`expertise_<domain>.md`) with detailed observations, following the recording protocol in `expertise-tracking.md`.
7. If the expertise section already covers all relevant domains, skip silently — don't re-ask.

### Transition — Load Formats and Decisions

Before writing any files, read the shared formats reference, local templates, and decisions format:

```
Read file: ~/.claude/skills/_shared/references/state-and-activity-formats.md
Read file: ~/.claude/skills/_shared/references/decisions-format.md
Read file: references/templates.md
```

Use the `Read` tool to load `~/.claude/skills/_shared/references/state-and-activity-formats.md` (state.md and activity-log.jsonl formats), `~/.claude/skills/_shared/references/decisions-format.md` (decisions format and Loading Protocol), and `references/templates.md` (idea.md template and CLAUDE.md Project Context section). The formats loaded here are used in Steps 5 through 8 below.

Load `.project/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. This is relevant when re-running `/create-epic` on an existing project — active decisions provide context for the conversation.

### Step 5 — Write idea.md

Using the idea.md template from the formats reference, write `.project/idea.md` with substantive content synthesized from the conversation. Every section should contain real content reflecting what the user said — never placeholder text.

Use the Write tool to create `.project/idea.md`.

### Step 5b — Write First Epic goal.md

Derive a goal statement from the idea conversation. Write `.project/epics/__active__initial/goal.md` with:

```markdown
# Epic Goal: initial

<1-3 paragraph summary of the epic's goal, derived from the idea conversation. This is the first epic — it covers the full scope of the project idea.>
```

This file anchors the epic in the state machine (see `epic-conventions.md` → First Epic Special Cases).

### Step 6 — Initialize activity-log.jsonl

Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Using the activity-log entry format from the formats reference, **append** one JSONL line to `.project/activity-log.jsonl`. Always append — never overwrite. Use:

```bash
echo '{"ts":"<timestamp>","phase":"capture-idea","scope":"project","status":"complete","summary":"<summary>"}' >> .project/activity-log.jsonl
```

Replace `<timestamp>` with the generated value and `<summary>` with a concise one-sentence description of the project idea. This is a routine completion — do NOT create a detail file in `.project/activity-log/`.

### Step 7 — Write state.md

Using the state.md format from the formats reference, write `.project/state.md` with:

- **Current Phase**: `capture-idea complete — idea documented`
- **Active Slice**: `epics/__active__initial`
- **Work Stack**: `(empty)`
- **Next Step**: `Run /explore or /create-architecture to begin working on the initial epic.`

Use the Write tool to create `.project/state.md`.

### Step 8 — Update CLAUDE.md

Using the Project Context section format from the formats reference, update `CLAUDE.md` in the project root. Handle three cases:

**Case 1 — No CLAUDE.md exists**: Create `CLAUDE.md` with the Project Context section as its only content.

**Case 2 — CLAUDE.md exists but has no `## Project Context` section**: Read the file, then append the Project Context section at the end. Ensure there is a blank line before the new section header.

**Case 3 — `## Project Context` section already exists**: Read the file and check if `.project/idea.md` already appears in the section. If it does, skip (idempotent). If it does not, add the line `- \`.project/idea.md\` — project goal, scope, constraints` under the existing section header, after the introductory text and before any other list items.

To detect the section, search for a line starting with `## Project Context`. To detect the idea reference, search for `.project/idea.md` in the file content.

### Done (Mode A)

Tell the user:

> Project planning is set up. Here's what was created:
>
> - `.project/idea.md` — your project idea
> - `.project/epics/__active__initial/goal.md` — first epic goal
> - `.project/activity-log.jsonl` — activity log (1 entry)
> - `.project/state.md` — current phase tracker
> - `CLAUDE.md` — updated with project context
> - `.gitignore` — updated to exclude state.md
>
> **Next**: Run `/explore` or `/create-architecture` to begin working on the initial epic.

---

## Mode B — New Epic on Existing Project

### Step 10 — Check for Established Project

Check whether `.project/` looks like an established project — look for `.project/idea.md`, `.project/activity-log.jsonl`, `.project/state.md`, or subdirectories like `.project/epics/` or `.project/architecture/`.

**If it does NOT look like an established project** (e.g., it's an unrelated directory): Show the user its contents and ask whether they want to set up a new project here (which would switch to Mode A) or add files alongside existing content.

**If it IS an established project**: Proceed to Step 11.

### Step 11 — Interactive Goal Capture

Start a conversation to understand the new epic. Begin with a question like:

- "What's this epic about?"
- "What do you want to achieve with this new body of work?"

Follow threads naturally. Ask one or two follow-up questions at a time. Cover:

1. Goal — what the epic aims to accomplish
2. Motivation — why now, what prompted it
3. Rough scope — what's in, what's explicitly out

**Wrap-up heuristic**: Same as Mode A Step 4. Offer to wrap up when coverage is sufficient.

### Step 12 — Detect Epic Name

Auto-detect a kebab-case name (2-4 words) from the conversation. If unclear, ask via AskUserQuestion: "What should we call this epic? I'm thinking `<suggestion>` — does that work?"

### Step 13 — Check for Active Epic

```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```

If an `__active__` epic exists, extract its name and notify the user:

> Note: Epic '<name>' is currently active. Your new epic can be explored and proposed, but won't be buildable until the active epic completes or is abandoned.

This is informational — do NOT block. Multiple epics can coexist in exploration/proposal states.

### Step 14 — Create Epic Directory

```bash
mkdir -p .project/epics/<name>
```

Do NOT use the `__active__` prefix — that is applied by `/start-epic` (future skill) upon approval.

### Step 15 — Write goal.md

Write `.project/epics/<name>/goal.md`:

```markdown
# Epic Goal: <name>

<1-3 paragraph summary of the epic's goal, derived from the conversation.>
```

### Step 16 — Load Formats and Update State

Read the shared formats reference:

```
Read file: ~/.claude/skills/_shared/references/state-and-activity-formats.md
```

Generate a UTC timestamp and append a activity-log entry:

```bash
echo '{"ts":"<timestamp>","phase":"create-epic","scope":"epics/<name>","status":"complete","summary":"<summary>"}' >> .project/activity-log.jsonl
```

Update `.project/state.md` Next Step to: `Run /explore epics/<name> or /create-architecture epics/<name> to begin working on the new epic.`

Do NOT change Active Slice — the new epic is not active.

### Done (Mode B)

Tell the user:

> New epic created:
>
> - `.project/epics/<name>/goal.md` — epic goal
> - `.project/activity-log.jsonl` — updated with creation entry
> - `.project/state.md` — Next Step updated
>
> **Next**: Run `/explore epics/<name>` to research and brainstorm, or `/create-architecture epics/<name>` to propose architecture changes.
