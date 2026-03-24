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
<!-- Add a line for each architecture file actually written (e.g. data-model.md, flows.md, ui-ux.md, invariants.md) -->
<!-- Add learnings.md line only if that file exists -->
<!-- Add sequencing.md line only if that file exists (written by /create-slices, not this skill) -->

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

- If idea.md exists but is thin (fewer than 3 substantive sections or reads as a stub), ask the user a few targeted questions to fill gaps before drafting. Suggest `/create-epic` to flesh it out, but don't require it — proceed if the user provides enough context inline.
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

If the user says "that's enough" or "stop here" at any point, leave filesystem artifacts in place and stop. The CLI status stays `defining-architecture` (no CLI mutation on graceful stop). On re-entry, detect progress via `epic:show --json` status + file existence:

- **(a) No files written yet**: Tell the user nothing was written. Stop.
- **(b) Q&A complete, design tree not started**: Q&A notes exist, no `_overview.md`. Resume from design tree.
- **(c) Design tree in progress**: partial `_overview.md` exists. Resume design tree.
- **(d) Design tree complete, conventions research not started**: `_overview.md` complete, no `conventions.md`. Start conventions.
- **(e) Conventions research in progress**: partial `conventions.md`. Resume conventions.
- **(f) All content written, not submitted**: all architecture files present. Proceed to `submit-architecture`.

In all stop cases, update CLAUDE.md Project Context to reference files written so far. Re-entry detection uses `epic:show --json` (status = `defining-architecture` means resume) combined with file existence checks.

### Maturity, Invariants, and Fitness Functions

After all architecture files are written (Steps 8b-8d), three additional steps create maturity/invariant/fitness artifacts. These are lightweight — the goal is to establish the structure and initial content, not produce exhaustive specifications.

**Maturity Table (Step 8f):**

- Every subsystem with an architecture file gets a row. All start at Experimental.
- Derive dependents from the subsystem dependency graph established during architecture writing. If subsystem A's Dependencies section lists subsystem B, then B's Dependents column includes A.
- Fitness Functions column starts as "—" and is updated to "candidate" after Step 8h identifies candidates.
- Reference `../../_shared/references/maturity-conventions.md` for the exact table format.

**Invariants (Step 8g):**

- Invariants are system-wide constraints, not subsystem-specific. Think categories: error handling, data integrity, security, performance.
- If the user has ideas, draft full invariant entries (Statement, Rationale, Scope, Verification).
- If the user has nothing yet, create a stub with the format header and examples — this is fine for a new project. Invariants emerge during development.
- The `architecture/` directory already exists at this point, so no `mkdir` needed.

**Fitness Function Candidates (Step 8h):**

- These are architectural properties worth testing eventually, not test specifications. Keep entries brief.
- Good candidates: boundary enforcement (no cross-layer imports), contract compliance (all endpoints validate input), performance guarantees (response time limits), data integrity rules (all mutations audited).
- Add candidates to each subsystem's `## Fitness Functions` section in its `<subsystem>-api.md` file.
- Accept after one round of user feedback. This is a starting point that `/refine-architecture` and `/audit-architecture` will evaluate later.
