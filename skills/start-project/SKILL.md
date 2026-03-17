---
name: start-project
description: >
  Set up structured project planning for a new development project. Creates the
  .project/ directory structure, captures the project idea through conversation,
  and initializes tracking files. Use at the very start of a new project, before
  any exploration or architecture work.
---

# Start Project

Initialize a project's `.project/` planning filesystem and capture the project idea through conversation.

## Step 1 — Pre-Flight Check

Check if `.project/` already exists:

```bash
ls -la .project/ 2>/dev/null
```

If the directory exists, check whether it looks like an established project using this planning workflow — look for any of these files: `.project/idea.md`, `.project/flow-log.jsonl`, `.project/state.md`, or subdirectories like `.project/vertical-slices/` or `.project/architecture/`.

**If it looks like an established project**: Stop immediately and tell the user something like:

> This repo already has a `.project/` directory that looks like it's using this planning workflow. Running `/start-project` again would start completely fresh — it would replace your existing `idea.md` with a new one, reset `state.md`, and begin a new log entry in `flow-log.jsonl`. Your existing files in `architecture/`, `vertical-slices/`, `research/`, etc. would NOT be deleted, but your project idea document would be replaced and your phase tracking reset to the very beginning.
>
> If you want to continue working on this project, run `/project-status` instead to see where things stand.
>
> Do you want to discard the existing project setup and start fresh?

Do NOT proceed until the user explicitly confirms they want to start fresh. If they decline or are unsure, stop.

**If `.project/` exists but shows no signs of this workflow** (e.g., it's an unrelated directory): Show the user its contents and ask whether to proceed, noting that this skill will add planning files inside it.

If the directory does not exist, proceed immediately.

## Step 2 — Create Directory Structure

Run:

```bash
mkdir -p .project/{research,brainstorm,prototypes,architecture,side-quests,retrospectives,flow-log,vertical-slices}
```

This creates only the top-level directories. Nested subdirectories (e.g. `architecture/ui-mock/`) are created by later skills — do not create them here.

## Step 3 — Gitignore

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

## Step 4 — Idea Capture

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

## Step 4b — Expertise Calibration

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

1. Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the expertise tracking protocol.
2. Check if `~/.claude/CLAUDE.md` has an existing `## Expertise` section.
3. Identify domains the project idea touches (from the conversation so far) that aren't already covered in the expertise section.
4. If there are uncovered domains, use AskUserQuestion: "This project involves [X] and [Y] — how familiar are you with those areas?" Adjust question depth based on how many domains are uncovered.
5. Write/update `## Expertise` section in `~/.claude/CLAUDE.md` with the new information.
6. Write/update auto memory files (`expertise_<domain>.md`) with detailed observations, following the recording protocol in `expertise-tracking.md`.
7. If the expertise section already covers all relevant domains, skip silently — don't re-ask.

## Transition — Load Formats and Decisions

Before writing any files, read the shared formats reference, local templates, and decisions format:

```
Read file: ~/.claude/skills/_shared/references/state-and-flow-formats.md
Read file: ~/.claude/skills/_shared/references/decisions-format.md
Read file: references/templates.md
```

Use the `Read` tool to load `~/.claude/skills/_shared/references/state-and-flow-formats.md` (state.md and flow-log.jsonl formats), `~/.claude/skills/_shared/references/decisions-format.md` (decisions format and Loading Protocol), and `references/templates.md` (idea.md template and CLAUDE.md Project Context section). The formats loaded here are used in Steps 5 through 8 below.

Load `.project/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. This is relevant when re-running `/start-project` on an existing project — active decisions provide context for the conversation.

## Step 5 — Write idea.md

Using the idea.md template from the formats reference, write `.project/idea.md` with substantive content synthesized from the conversation. Every section should contain real content reflecting what the user said — never placeholder text.

Use the Write tool to create `.project/idea.md`.

## Step 6 — Initialize flow-log.jsonl

Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Using the flow-log entry format from the formats reference, **append** one JSONL line to `.project/flow-log.jsonl`. Always append — never overwrite. Use:

```bash
echo '{"ts":"<timestamp>","phase":"capture-idea","scope":"project","status":"complete","summary":"<summary>"}' >> .project/flow-log.jsonl
```

Replace `<timestamp>` with the generated value and `<summary>` with a concise one-sentence description of the project idea. This is a routine completion — do NOT create a detail file in `.project/flow-log/`.

## Step 7 — Write state.md

Using the state.md format from the formats reference, write `.project/state.md` with:

- **Current Phase**: `capture-idea complete — idea documented`
- **Active Slice**: `none (working at project level)`
- **Work Stack**: `(empty)`
- **Next Step**: `Run /explore to brainstorm and research, or /define-architecture to jump straight to architecture decisions.`

Use the Write tool to create `.project/state.md`.

## Step 8 — Update CLAUDE.md

Using the Project Context section format from the formats reference, update `CLAUDE.md` in the project root. Handle three cases:

**Case 1 — No CLAUDE.md exists**: Create `CLAUDE.md` with the Project Context section as its only content.

**Case 2 — CLAUDE.md exists but has no `## Project Context` section**: Read the file, then append the Project Context section at the end. Ensure there is a blank line before the new section header.

**Case 3 — `## Project Context` section already exists**: Read the file and check if `.project/idea.md` already appears in the section. If it does, skip (idempotent). If it does not, add the line `- \`.project/idea.md\` — project goal, scope, constraints` under the existing section header, after the introductory text and before any other list items.

To detect the section, search for a line starting with `## Project Context`. To detect the idea reference, search for `.project/idea.md` in the file content.

## Done

Tell the user:

> Project planning is set up. Here's what was created:
>
> - `.project/idea.md` — your project idea
> - `.project/flow-log.jsonl` — activity log (1 entry)
> - `.project/state.md` — current phase tracker
> - `CLAUDE.md` — updated with project context
> - `.gitignore` — updated to exclude state.md
>
> **Next**: Run `/explore` to brainstorm and research, or `/define-architecture` to jump straight to architecture decisions.
