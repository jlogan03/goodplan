---
name: define-architecture
description: >
  Drives architecture decisions through structured Q&A, writing `.project/conventions.md`
  and `architecture/` files. Run after `/start-project` and optionally `/explore`. Common
  triggers: 'let's define the architecture', 'what's our tech stack', 'I want to start on
  architecture', 'define architecture', 'set up conventions', 'help me set up project
  conventions', 'what coding standards should we use', 'define project conventions'.
---

# Define Architecture

Interactive dialogue that drives architecture decisions from project idea to a fully populated `architecture/` directory. Two phases: conventions (tech stack, style, tooling) then architecture (system design, subsystems, APIs). Re-entrant — detects existing files and focuses on gaps.

## Step 1 — Load References

Use the Read tool to load these files (paths relative to this skill's directory):

- `references/architecture-logic.md` — file applicability table
- `references/architecture-logic-templates.md` — file templates for conventions.md and all architecture files
- `references/guidance.md` — CLAUDE.md Project Context format and conversation guidance
- `~/.claude/skills/_shared/references/decisions-format.md` — decisions format and Loading Protocol

Use the applicability table (from architecture-logic.md) to decide which files to write. Use the templates (from architecture-logic-templates.md) as the structure for each file. Follow the conversation guidance throughout.

## Step 2 — Load Context

Read the following project files to understand what exists:

1. Read `.project/idea.md`. If it does not exist, use the AskUserQuestion tool to tell the user: "No idea.md found -- run /start-project first to capture your project idea." Then stop. If idea.md exists but is thin (fewer than 3 substantive sections or reads as a stub), ask the user a few targeted questions to fill gaps before drafting any files. Suggest running `/start-project` to flesh it out, but do not require it -- proceed if the user provides enough context inline.

2. Check for exploration output by running: `ls .project/brainstorm/ .project/research/ .project/prototypes/ 2>/dev/null`. If any exist, read `.project/explore-complete.md` (or `.project/explore-skipped.md`) first as the summary. Then read individual exploration files only if the summary references something needing more detail. If there are more than 5 files across those directories, read only the first 50 lines of each.

3. Check for existing architecture files by running: `ls .project/conventions.md .project/architecture/ 2>/dev/null`.

4. Load `.project/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions inform architecture choices.

Present a one-line summary to the user: "Found: idea.md [+ N brainstorm files, M research files, K active decisions]. Existing architecture files: [list or 'none']."

## Step 3 — Re-entry Check

Handle four cases based on what Step 2 found:

**Case A — No existing files**: Proceed directly to Step 4.

**Case B — conventions.md exists but no architecture/ files**: Tell the user conventions are done and proceed directly to the architecture phase (Step 5).

**Case C — architecture/ files exist but conventions.md does NOT**: Treat conventions as incomplete. Write conventions.md first (Step 4) before proceeding to architecture files. (The architecture/ directory already exists in this case. The `mkdir -p` in Step 5b handles both cases safely.)

**Case D — Both conventions.md and architecture/ files exist**: List what was found. Use the AskUserQuestion tool with two options to ask: "Want to continue where we left off, or revisit all areas? (Existing files won't be deleted either way.)"
- If "Continue": batch the revisit prompt into one question using AskUserQuestion: "These files exist: [list]. Want to revisit any? (List them, or say 'none' to skip to gaps.)"
- If "Start fresh": treat all areas as incomplete and proceed to Step 4.

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

## Step 4 — Conventions Phase

Goal: produce `.project/conventions.md`. Skip this step if conventions.md already exists and the user chose "Continue" in Step 3.

1. Before drafting, identify the candidate tools, libraries, frameworks, and runtimes the project will likely use (from idea.md, exploration output, and your own knowledge). Spawn a sub-agent using the Agent tool to research current versions and recommendations. The sub-agent prompt should include the candidate list and instruct it to use WebSearch to verify for each item: (a) the latest stable version number, (b) whether it has been superseded by a better-maintained or more popular alternative for this use case, and (c) any recent breaking changes or deprecations worth noting. Wait for the sub-agent to return before proceeding.

2. Using the `conventions.md` template from architecture-logic-templates.md, draft content based on idea.md, exploration output, and the research results from step 1. Use the researched version numbers — not your training data — for all tools and libraries. Fill in every section with substantive content inferred from the project context.

3. Present the full draft to the user. Ask targeted questions inline (open-ended, not AskUserQuestion) only for gaps the draft could not infer. Reserve AskUserQuestion for the final approval prompt.

4. If the user gives corrections, apply them and re-present only the changed sections.

5. When the draft is ready, present it for final approval using the AskUserQuestion tool with two options: "Looks good -- write it" and "I have more corrections".
   - If the user picks "I have more corrections", apply corrections and re-present. Then ask again with the same AskUserQuestion.
   - If the user picks "Looks good -- write it" (or gives corrections AND approval in the same message), apply any final corrections, re-present the changed sections, then write `.project/conventions.md` using the Write tool. No additional confirmation needed.

Distinguish this file from `architecture/conventions.md`: this file is project-level (tech stack, repo structure, coding style). The architecture one covers architectural patterns and boundaries.

### Decision writing during Conventions and Architecture phases

Throughout Steps 4 and 5, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Run `mkdir -p .project/decisions/` before the first write. Write in the format specified by `decisions-format.md`. Track all decisions written during this run and summarize them in Step 8 (Done Summary).

## Step 5 — Architecture Phase

At the start of this phase, briefly explain the "broad to specific" ordering to the user: overview first, then architectural conventions, then domain-specific files (data model, flows, etc.), then subsystem APIs.

### 5a. Propose file list

Based on idea.md and the applicability table from architecture-logic.md, propose which architecture files to write. Do NOT include subsystem API files yet -- those are decided after `_overview.md` is written. For uncertain cases (e.g., does the project have a frontend? persistent storage?), use the AskUserQuestion tool to clarify before finalizing the list.

Present the file list with a one-line description of each file's purpose and relevance to this project. Use the AskUserQuestion tool to confirm: "I'll write these files: [list with descriptions]. Add or remove anything?"

### 5b. Write files in order

Process files in this order: `_overview.md` first, then `conventions.md`, then optional files in applicability table order (data-model.md, flows.md, information-architecture.md, ui-ux.md), then subsystem API files.

Before writing any files, run: `mkdir -p .project/architecture/`

For each file:

1. Skip if the file already exists and the user chose "Continue" in Step 3. Offer to revisit if relevant.
2. Draft content based on idea.md, exploration output, and conventions decisions from Step 4. For `architecture/conventions.md` specifically, synthesize decisions from `.project/conventions.md` into architectural patterns.
3. Present the draft and ask: "What needs correcting or adding?"
4. Iterate until the user is satisfied.
5. Write the file using the Write tool before moving to the next one.
6. After writing each file, show progress: "Written N architecture files so far: [list]. Next: [next file]."

### 5c. Subsystem APIs

After `_overview.md` is written (or already exists from a re-entry), derive subsystem candidates from its Subsystems section. Use the AskUserQuestion tool to ask: "These look like your main subsystems: [list]. Which ones have non-trivial API contracts that need documenting?"

Acknowledge the selection: "Got it -- I'll write X-api.md and Y-api.md. Anything to add or remove?"

Write one `<subsystem>-api.md` per confirmed subsystem using the subsystem API template.

After confirming API files, check whether `_overview.md`'s Subsystems section needs revision. If subsystems were added or removed during this conversation, update `_overview.md` once before continuing. Do not re-evaluate the subsystem list after this one-time fixup.

Focus subsystem API content on what the subsystem exposes and its key invariants. Detailed signatures will be refined during `/create-plan`.

### 5d. Custom files

If the user requests a file type not in the applicability table (e.g., `architecture/security.md`), accept it and draft it using the generic subsystem API template format as a starting point. Include it in the file list and progress tracking.

### 5e. Graceful stop

If the user says "that's enough" or "stop here" at any point during this phase, handle based on what has been written:

- **No files written yet** (stopped during conventions draft before approval): do not update state.md and do not append to flow-log.jsonl. Tell the user nothing was written and state.md is unchanged. Stop.
- **conventions.md written but no architecture files**: load `~/.claude/skills/_shared/references/state-and-flow-formats.md` for the state.md and flow-log.jsonl formats. Update state.md Current Phase to `define-architecture in-progress -- stopped after writing conventions.md`. Before updating CLAUDE.md, re-load `references/guidance.md` (relative to this skill's directory) to get the Project Context format. Update CLAUDE.md Project Context to reference only conventions.md (Step 6). Append to flow-log.jsonl with `"status":"started"` using the format from the shared formats reference. Stop.
- **One or more architecture files written** (with or without conventions.md): load `~/.claude/skills/_shared/references/state-and-flow-formats.md` for the state.md and flow-log.jsonl formats. Update state.md Current Phase to `define-architecture in-progress -- stopped after writing [comma-separated list of all files written, including conventions.md if written]`. Before updating CLAUDE.md, re-load `references/guidance.md` (relative to this skill's directory) to get the Project Context format. Update CLAUDE.md Project Context to reference only the files actually written (Step 6). Append to flow-log.jsonl with `"status":"started"` using the format from the shared formats reference. Stop.

## Step 6 — CLAUDE.md Update

Use the Read tool to re-load `references/guidance.md` (relative to this skill's directory) to get the current Project Context section format. (Re-reading here rather than relying on Step 1's load ensures the format is in context after a long interactive session.)

Using the Project Context section format from `references/guidance.md` (the HTML comments in the format are instructions, not content to write into CLAUDE.md):

1. Check which optional files actually exist by running: `ls .project/brainstorm/ .project/research/ .project/prototypes/ .project/learnings.md .project/sequencing.md 2>/dev/null`. Note: `sequencing.md` and `learnings.md` are written by later skills -- only reference them if they already exist.

2. For "Also check" entries, only include directories that exist AND contain files (not empty directories).

3. Build the Project Context section content, including only entries for files that exist. For each architecture file written in Step 5, add a reference line under the "Read these before doing any significant work" block with a brief description (e.g., `- .project/architecture/data-model.md -- entities, relationships, storage`). Only include files that actually exist.

4. Use the Read tool to read CLAUDE.md (to avoid overwriting unrelated content).

5. Update CLAUDE.md based on what exists:
   - **No CLAUDE.md**: create it using the Write tool with the Project Context section as the only content.
   - **CLAUDE.md exists but has no `## Project Context` section**: use the Edit tool to append the section at the end. Ensure there is a blank line before the new section header.
   - **CLAUDE.md exists with a `## Project Context` section**: Read CLAUDE.md fully. Extract the exact text from `## Project Context` through (but not including) the next `## ` heading. The old_string MUST include the `## Project Context` heading line itself for unique matching, and must preserve trailing whitespace/newlines exactly as they appear in the file. If no subsequent `## ` heading exists, use the text from `## Project Context` through end of file as old_string. Replace with the new section content using the Edit tool. If the Edit tool fails to match (e.g., due to trailing whitespace differences), fall back: read the full file, construct the replacement, and rewrite the entire CLAUDE.md with the Write tool.

6. After updating, tell the user: "Updated CLAUDE.md so future sessions and sub-agents will automatically load your architecture files."

## Step 6b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 7 — Write Back State

Use the Read tool to load `~/.claude/skills/_shared/references/state-and-flow-formats.md` for state.md and flow-log.jsonl formats. (This is the normal completion path. The graceful stop cases in Step 5e exit before reaching Step 7, so the double load never occurs in practice.)

Generate a UTC timestamp by running: `date -u +%Y-%m-%dT%H:%M:%SZ`

Update `.project/state.md` using the 4-section format from the shared formats reference. If state.md does not exist, create it using the Write tool. Set:
- Current Phase: `define-architecture complete -- conventions and architecture/* written`
- Active Slice: unchanged from before (or `none (working at project level)` if project-level)
- Work Stack: unchanged
- Next Step: `/define-slices`

Append to `.project/flow-log.jsonl` by running:

```bash
echo '{"ts":"<timestamp>","phase":"define-architecture","scope":"project","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
```

Replace `<timestamp>` with the generated UTC timestamp and `<summary>` with a concise description of what was written.

## Step 8 — Done Summary

Present a closing summary listing:

- All files written (conventions.md and each architecture file)
- All decisions written during this run (if any) — list each decision file path and title
- CLAUDE.md update confirmation
- Recommend `/define-slices` as the next step

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with the remaining files.
