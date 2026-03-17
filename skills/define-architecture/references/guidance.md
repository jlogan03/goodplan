# Guidance

## CLAUDE.md Project Context Format

When writing/updating CLAUDE.md, use this format for the Project Context section. HTML comments below are instructions to you — do not include them in the output.

```markdown
## Project Context

Read these before doing any significant work in this repo:

- `.project/idea.md` — project goal, scope, constraints
- `.project/conventions.md` — tech stack, repo structure, coding style
- `.project/architecture/_overview.md` — system architecture
- `.project/architecture/conventions.md` — architectural patterns
<!-- Add a line for each architecture file actually written (e.g. data-model.md, flows.md, ui-ux.md) -->
<!-- Add learnings.md line only if that file exists -->
<!-- Add sequencing.md line only if that file exists (written by /define-slices, not this skill) -->

Also check if relevant to your task:
<!-- Add lines below only for directories that exist AND contain files -->
- `.project/brainstorm/` — project-level brainstorming output
- `.project/research/` — project-level research findings
- `.project/prototypes/` — exploratory prototypes
- `.project/side-quests/` — deferred and in-progress side quests
```

Only include files/directories that actually exist. For each architecture file written, add a reference line with a brief description (e.g., `- .project/architecture/data-model.md — entities, relationships, storage`).

## Conversation Guidance

### Conventions Phase

- If idea.md exists but is thin (fewer than 3 substantive sections or reads as a stub), ask the user a few targeted questions to fill gaps before drafting. Suggest `/start-project` to flesh it out, but don't require it — proceed if the user provides enough context inline.
- Present a full draft of conventions.md based on idea.md and exploration output first.
- Ask targeted questions inline (open-ended, not AskUserQuestion) only for gaps the draft couldn't infer.
- Iterate until user approves.
- Stopping signal: after iterating, present for final approval using AskUserQuestion with options "Looks good — write it" and "I have more corrections".
- If user gives corrections, apply and re-present only the changed sections.
- If user gives corrections AND approval in the same message, apply corrections, re-present changed sections, then write — no additional confirmation needed.

### Architecture Phase

- At the start, briefly explain the "broad to specific" ordering: overview first, then conventions, then domain-specific files, then subsystem APIs.
- When presenting the file list, include a one-line description of each file's purpose and relevance to this project.
- If unsure about file applicability (e.g., does the system have a frontend?), ask directly before committing to the file list.
- For each architecture file, present a draft first. Ask "What needs correcting or adding?" Iterate until user says it's good.
- Write each file with the Write tool before moving to the next area — do not batch writes.
- After writing each file, show progress: "Written 3 architecture files so far: _overview.md, conventions.md, data-model.md. Next: flows.md."
- Distinguish the two conventions files when presenting drafts: `.project/conventions.md` is project-level (tech stack, style); `.project/architecture/conventions.md` is architectural (patterns, boundaries).

### Early Stop

If the user says "that's enough" or "stop here" at any point, handle based on what has been written so far:

- **(a) No files written yet** (stopped during conventions draft before approval): don't update state.md. Tell the user nothing was written and state.md is unchanged.
- **(b) conventions.md written but no architecture files**: update state.md Current Phase to `define-architecture in-progress — stopped after writing conventions.md`. Update CLAUDE.md Project Context to reference only conventions.md.
- **(c) One or more architecture files written** (with or without conventions.md): update state.md Current Phase to `define-architecture in-progress — stopped after writing <comma-separated list of all files written>` (include conventions.md if written). Update CLAUDE.md Project Context to reference only the files actually written before stopping.

In stop cases (b) and (c), append to flow-log.jsonl with `"status":"started"` (not `"complete"`). Case (a) (no files written) does not append to flow-log.jsonl.
