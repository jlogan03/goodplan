---
name: create-architecture
description: >
  Drives architecture decisions through structured Q&A, writing `.goodplan/conventions.md`
  and architecture files. When an active epic exists, writes to the epic's
  architecture directory (first epic: `architecture/`, subsequent: `architecture-proposal/`).
  Falls back to `.goodplan/architecture/` when no active epic. Common triggers: 'let's
  define the architecture', 'what's our tech stack', 'I want to start on architecture',
  'define architecture', 'create architecture', 'set up conventions', 'help me set up project conventions', 'what
  coding standards should we use', 'define project conventions'.
requires: gp >= 1.0.0
---

# Define Architecture

Interactive dialogue that drives architecture decisions from project idea to a fully populated architecture directory. Phases: conventions (tech stack, style, tooling), design tree exploration (broad pass to surface structure, deep pass to resolve details), then architecture file writing (system design, subsystems, APIs). Re-entrant — detects existing files and focuses on gaps.

When an active epic exists, architecture output is scoped to the epic (see Step 0 for path resolution).

## Step 0 — Version Check and Architecture Path Resolution

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
gp --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found." If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with a version mismatch message.

Also load `../_shared/references/epic-conventions.md` for epic directory structure.

### Resolve architecture path

Query current state:

```bash
gp status --json
```

Check `.activeEpic` in the response to determine the architecture output path:

- **Active epic with name `initial`** (first epic): Begin the architecture phase via CLI:

  ```bash
  stdin: "" | gp epic:define-architecture --epic initial --json
  ```

  Use `paths.architecture` from the response as `$ARCH_DIR`. Also create a top-level scaffold at `.goodplan/architecture/_overview.md` containing:
  ```markdown
  <!-- scaffold -->
  # Architecture Overview

  Architecture is being defined in the active epic. See `epics/initial/architecture/` for the current target.

  ## Subsystem Maturity

  | Subsystem | Maturity | Dependents | Fitness Functions | Notes |
  |---|---|---|---|---|
  ```
  Run `mkdir -p .goodplan/architecture/` before writing the scaffold (skill-owned LLM artifact directory). No maturity data is populated until the first slice completes via `/complete`.

- **Active epic with a different name** (subsequent epic): Begin the architecture phase:

  ```bash
  stdin: "" | gp epic:define-architecture --epic <name> --json
  ```

  Use `paths.architecture` from the response as `$ARCH_DIR`. This writes to the epic's `architecture-proposal/` directory.

- **No active epic**: defaults to `.goodplan/architecture/` (legacy/side-quest-only projects). No CLI phase transition — no epic to transition.

If `epic:define-architecture` returns `STATE_INVALID_TRANSITION` (exit 3), check `epic:show --json` for current status. If the epic is already in `defining-architecture` or later, this is a re-entry — proceed with the existing architecture path.

Store the resolved `$ARCH_DIR` path for use throughout subsequent steps. Also store the epic name (if applicable) for use in `submit-architecture` at Step 10.

Note: `start-architecture` exists as a CLI command but no sub-agents in create-architecture need its context bundling — the conventions research sub-agent (Step 4.1) does web research only, and all other work is orchestrator-level.

### Detect exploration output

Check for exploration artifacts at the epic level when applicable:

```bash
ls .goodplan/epics/<epic-name>/brainstorm/ .goodplan/epics/<epic-name>/research/ .goodplan/epics/<epic-name>/prototypes/ 2>/dev/null
```

## Step 1 — Load References

Use the Read tool to load these files (paths relative to this skill's directory):

- `references/architecture-logic.md` — file applicability table
- `references/architecture-logic-templates.md` — file templates for conventions.md and all architecture files
- `references/guidance.md` — CLAUDE.md Project Context format and conversation guidance
- `../_shared/references/decisions-format.md` — decisions format and Loading Protocol

On-demand references (loaded at their respective steps, not here):
- `references/design-tree.md` — loaded at Step 5 (broad pass) and Step 7 (deep pass)
- `references/design-it-twice.md` — loaded at Step 6 (when it exists)

Use the applicability table (from architecture-logic.md) to decide which files to write. Use the templates (from architecture-logic-templates.md) as the structure for each file. Follow the conversation guidance throughout.

## Step 2 — Load Context

Read the following project files to understand what exists:

1. Read `.goodplan/idea.md`. If it does not exist, use the AskUserQuestion tool to tell the user: "No idea.md found -- run /create-epic first to capture your project idea." Then stop. If idea.md exists but is thin (fewer than 3 substantive sections or reads as a stub), ask the user a few targeted questions to fill gaps before drafting any files. Suggest running `/create-epic` to flesh it out, but do not require it -- proceed if the user provides enough context inline.

2. Check for exploration output. When an active epic was detected in Step 0, check the epic's exploration directories first:
   ```bash
   ls $EPIC_DIR/brainstorm/ $EPIC_DIR/research/ $EPIC_DIR/prototypes/ 2>/dev/null
   ```
   Also check project-level: `ls .goodplan/brainstorm/ .goodplan/research/ .goodplan/prototypes/ 2>/dev/null`. Use `$EPIC_DIR` as resolved from `paths.architecture` in Step 0 (stripping the `/architecture` suffix gives the epic directory). If any exist, read the relevant `explore-complete.md` (or `explore-skipped.md`) first as the summary. Then read individual exploration files only if the summary references something needing more detail. If there are more than 5 files across those directories, read only the first 50 lines of each.

3. Check for existing architecture files by running: `ls .goodplan/conventions.md $ARCH_DIR/ 2>/dev/null` (where `$ARCH_DIR` is the resolved path from Step 0).

4. Load `.goodplan/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions inform architecture choices.

Present a one-line summary to the user: "Found: idea.md [+ N brainstorm files, M research files, K active decisions]. Existing architecture files: [list or 'none']."

## Step 3 — Re-entry Check

Handle four cases based on what Step 2 found:

**Case A — No existing files**: Proceed directly to Step 4.

**Case B — conventions.md exists but no architecture/ files**: Tell the user conventions are done and proceed directly to the design tree broad pass (Step 5).

**Case C — architecture/ files exist but conventions.md does NOT**: Treat conventions as incomplete. Write conventions.md first (Step 4) before proceeding to the design tree. (The architecture/ directory already exists in this case. The `mkdir -p` in Step 8b handles both cases safely.)

**Case D — Both conventions.md and architecture/ files exist**: List what was found. Use the AskUserQuestion tool with two options to ask: "Want to continue where we left off, or revisit all areas? (Existing files won't be deleted either way.)"
- If "Continue": batch the revisit prompt into one question using AskUserQuestion: "These files exist: [list]. Want to revisit any? (List them, or say 'none' to skip to gaps.)"
- If "Start fresh": treat all areas as incomplete and proceed to Step 4.

Follow calibration depth guidance in `../_shared/references/expertise-tracking.md`.

## Step 4 — Conventions Phase

Goal: produce `.goodplan/conventions.md`. Skip this step if conventions.md already exists and the user chose "Continue" in Step 3.

1. Before drafting, identify the candidate tools, libraries, frameworks, and runtimes the project will likely use (from idea.md, exploration output, and your own knowledge). Spawn a sub-agent using the Agent tool to research current versions and recommendations. The sub-agent prompt should include the candidate list and instruct it to use WebSearch to verify for each item: (a) the latest stable version number, (b) whether it has been superseded by a better-maintained or more popular alternative for this use case, and (c) any recent breaking changes or deprecations worth noting. Wait for the sub-agent to return before proceeding.

2. Using the `conventions.md` template from architecture-logic-templates.md, draft content based on idea.md, exploration output, and the research results from step 1. Use the researched version numbers — not your training data — for all tools and libraries. Fill in every section with substantive content inferred from the project context.

3. Present the full draft to the user. Ask targeted questions inline (open-ended, not AskUserQuestion) only for gaps the draft could not infer. Reserve AskUserQuestion for the final approval prompt.

4. If the user gives corrections, apply them and re-present only the changed sections.

5. When the draft is ready, present it for final approval using the AskUserQuestion tool with two options: "Looks good -- write it" and "I have more corrections".
   - If the user picks "I have more corrections", apply corrections and re-present. Then ask again with the same AskUserQuestion.
   - If the user picks "Looks good -- write it" (or gives corrections AND approval in the same message), apply any final corrections, re-present the changed sections, then write `.goodplan/conventions.md` using the Write tool. No additional confirmation needed.

Distinguish this file from `architecture/conventions.md`: this file is project-level (tech stack, repo structure, coding style). The architecture one covers architectural patterns and boundaries.

### Decision writing during Conventions and Architecture phases

Throughout Steps 4 through 8, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing.

Create decisions via CLI:

```bash
echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>"}' | gp decision:create --json
```

The CLI handles directory creation and state management. Track all decisions written during this run and summarize them in Step 11 (Done Summary).

## Step 5 — Design Tree: Broad Pass

Load `references/design-tree.md` (relative to this skill's directory) for the full interaction protocol.

Goal: surface enough architectural structure for design-it-twice to generate meaningfully different options.

1. **Identify top-level questions** — from idea.md and conventions, what are the subsystems, communication patterns, data model shape, and hard constraints?
2. **Depth-first Q&A** — ask one question at a time; pursue follow-ups immediately before moving to the next branch.
3. **Track progress** — maintain in-memory resolved/open/deferred status; show progress table periodically (see protocol in reference file).
4. **Calibrate depth** — match explanation detail to user expertise level.
5. **Write decisions** — when a durable decision emerges, propose and write to `.goodplan/decisions/` (check for deduplication per reference file).
6. **Check stopping criteria** — stop when subsystem boundaries, communication patterns, key constraints, and data ownership are all resolved.
7. **Summarize for design-it-twice** — "Here's what we've established: [summary]. These are the major architectural areas where we have choices: [list]. Next: I'll generate multiple design options for each."

## Step 6 — Design-It-Twice

_Placeholder — will be implemented in Phase 3 of the architecture-quality plan. For now, skip this step and proceed to Step 7._

## Step 7 — Design Tree: Deep Pass

Load `references/design-tree.md` if not already in context.

Goal: resolve every remaining detail branch for the chosen design until the architecture is fully specified.

1. **Start from chosen design** — take the output of design-it-twice (Step 6) as the baseline.
2. **Walk detail branches** — API contracts, error handling, data flow specifics, edge cases deferred from the broad pass.
3. **Same interaction pattern** — depth-first Q&A, track resolved/open/deferred, write decisions.
4. **Handle unresolvable branches** — if a branch needs implementation experience, mark as "deferred to implementation" with a note for the implementing agent.
5. **Summarize** — "Architecture fully specified. [N] decisions recorded. [M] details deferred to implementation. Ready to write files."

## Step 8 — Architecture Phase

At the start of this phase, briefly explain the "broad to specific" ordering to the user: overview first, then architectural conventions, then domain-specific files (data model, flows, etc.), then subsystem APIs.

### 8a. Propose file list

Based on idea.md and the applicability table from architecture-logic.md, propose which architecture files to write. Do NOT include subsystem API files yet -- those are decided after `_overview.md` is written. For uncertain cases (e.g., does the project have a frontend? persistent storage?), use the AskUserQuestion tool to clarify before finalizing the list.

Present the file list with a one-line description of each file's purpose and relevance to this project. Use the AskUserQuestion tool to confirm: "I'll write these files: [list with descriptions]. Add or remove anything?"

### 8b. Write files in order

Process files in this order: `_overview.md` first, then `conventions.md`, then optional files in applicability table order (data-model.md, flows.md, information-architecture.md, ui-ux.md), then subsystem API files.

Before writing any files, run: `mkdir -p $ARCH_DIR/` (using the resolved architecture path from Step 0).

For each file:

1. Skip if the file already exists and the user chose "Continue" in Step 3. Offer to revisit if relevant.
2. Draft content based on idea.md, exploration output, and conventions decisions from Step 4. For `architecture/conventions.md` specifically, synthesize decisions from `.goodplan/conventions.md` into architectural patterns.
3. **Present file context first**: State the file name, its purpose, and what decisions informed it before showing the draft. Example: "**File: data-model.md** — Defines the core data entities and relationships based on our earlier discussion of [topic]. Here's the draft:" Then ask: "What needs correcting or adding?"
4. Iterate until the user is satisfied.
5. Write the file using the Write tool before moving to the next one.
6. After writing each file, show progress: "Written N architecture files so far: [list]. Next: [next file]."

### 8c. Subsystem APIs

After `_overview.md` is written (or already exists from a re-entry), derive subsystem candidates from its Subsystems section. Use the AskUserQuestion tool to ask: "These look like your main subsystems: [list]. Which ones have non-trivial API contracts that need documenting?"

Acknowledge the selection: "Got it -- I'll write X-api.md and Y-api.md. Anything to add or remove?"

Write one `<subsystem>-api.md` per confirmed subsystem using the subsystem API template.

After confirming API files, check whether `_overview.md`'s Subsystems section needs revision. If subsystems were added or removed during this conversation, update `_overview.md` once before continuing. Do not re-evaluate the subsystem list after this one-time fixup.

Focus subsystem API content on what the subsystem exposes and its key invariants. Detailed signatures will be refined during `/create-plan`.

### 8d. Custom files

If the user requests a file type not in the applicability table (e.g., `architecture/security.md`), accept it and draft it using the generic subsystem API template format as a starting point. Include it in the file list and progress tracking.

### 8e. Graceful stop

If the user says "that's enough" or "stop here" at any point, leave filesystem artifacts in place and stop. The CLI status stays `defining-architecture` (no CLI mutation on graceful stop). On re-entry, the skill detects progress via `epic:show --json` status + file existence (see Step 3 re-entry check).

Handle based on current progress:

- **(a) No files written yet** (stopped during conventions draft before approval): Tell the user nothing was written. Stop.
- **(b) conventions.md written but no architecture files**: Before updating CLAUDE.md, re-load `references/guidance.md` to get the Project Context format. Update CLAUDE.md Project Context to reference only conventions.md (Step 9). Stop.
- **(c) Design tree in progress**: Q&A notes exist but no `_overview.md`. Update CLAUDE.md to reference conventions.md. Stop.
- **(d) Design tree complete, conventions research not started**: `_overview.md` complete, no `conventions.md`. Update CLAUDE.md to reference `_overview.md`. Stop.
- **(e) Conventions research in progress**: partial `conventions.md` exists. Update CLAUDE.md to reference files written so far. Stop.
- **(f) All content written, not submitted**: all architecture files present. Update CLAUDE.md to reference all files (Step 9). Tell the user to run `/create-architecture` again to submit. Stop.

### 8f. Create Maturity Table

After all architecture files are written (Steps 8b-8d), populate the `## Subsystem Maturity` section in `_overview.md`.

1. Read `../_shared/references/maturity-conventions.md` for the maturity table format and column definitions.
2. For each subsystem defined in the architecture (from `_overview.md`'s Subsystems section and any `<subsystem>-api.md` files written), create a row. If a Subsystem Maturity table already has content (from a previous run), merge: add rows for new subsystems, update existing rows if the dependency graph changed, and leave unchanged rows intact.
   - **Maturity:** Experimental (all subsystems start here during initial architecture definition)
   - **Dependents:** derive from the architecture's dependency graph (each subsystem's Dependencies section). Use "—" if no other subsystems depend on it.
   - **Fitness Functions:** "—" (will be populated in Step 8h)
   - **Notes:** brief description of the subsystem's current state
3. Present the completed maturity table to the user for review using AskUserQuestion.
4. Apply any corrections and update `_overview.md` with the final table.

**Graceful stop:** If the user stops during this step, add a partial marker to `_overview.md`'s Subsystem Maturity section: `<!-- partial — interrupted during maturity table creation — completed: [list of subsystems added] -->`. Update CLAUDE.md Project Context to reference all files written so far, following the same process as Step 9 but scoped to files written so far. Stop.

### 8g. Create Invariants

After the maturity table, interactively define system-wide invariants.

1. Read `../_shared/references/maturity-conventions.md` for the invariants format and examples.
2. Ask the user using AskUserQuestion: "What constraints must hold across all future work? Think about error handling, data integrity, security, performance. Or say 'none yet' and I'll create a stub."
3. **If the user provides invariants:** Draft `architecture/invariants.md` with each invariant in the format from `maturity-conventions.md` (Statement as heading, Rationale, Scope, Verification fields). Present the draft and use AskUserQuestion for approval. Iterate until the user approves. Write the file.
4. **If the user has nothing yet:** Create a stub `architecture/invariants.md` with the format header, an examples section showing the format, and a note: "Add invariants as the project matures. Good candidates: error handling rules, data integrity constraints, security requirements, performance guarantees." Write the stub file.

**Graceful stop:** If the user stops during this step, add a partial marker to `architecture/invariants.md` if it exists: `<!-- partial — interrupted during invariant definition — state: [drafted/stub/not started] -->`. Update CLAUDE.md Project Context to reference all files written so far, following the same process as Step 9 but scoped to files written so far. Stop.

### 8h. Identify Fitness Function Candidates

For each subsystem, identify architectural properties that should eventually be tested.

1. Read `../_shared/references/maturity-conventions.md` for the fitness function candidate format.
2. For each subsystem with an `<subsystem>-api.md` file, identify candidate fitness functions — architectural properties that should be tested when the subsystem matures. Consider: boundary enforcement, contract compliance, performance characteristics, data integrity rules.
3. Add candidate entries to the `## Fitness Functions` section of each relevant `<subsystem>-api.md` file using the format from `maturity-conventions.md`:
   ```markdown
   ### <Property description>

   - **Test file:** candidate — not yet written
   - **Verifies:** <what the test would check, in plain language>
   ```
4. Update the maturity table's Fitness Functions column in `_overview.md` to show "candidate" for subsystems that received candidates.
5. Present the candidates to the user using AskUserQuestion. Accept after one round of user feedback — this is a starting point, not a final specification. Apply any corrections.
6. Write the updated files.

**Graceful stop:** If the user stops during this step, add a partial marker to any subsystem API files that have been updated: `<!-- partial — interrupted during fitness function candidate identification — completed: [list of subsystems with candidates] -->`. Update CLAUDE.md Project Context to reference all files written so far, following the same process as Step 9 but scoped to files written so far. Stop.

## Step 9 — CLAUDE.md Update

Use the Read tool to re-load `references/guidance.md` (relative to this skill's directory) to get the current Project Context section format. (Re-reading here rather than relying on Step 1's load ensures the format is in context after a long interactive session.)

Using the Project Context section format from `references/guidance.md` (the HTML comments in the format are instructions, not content to write into CLAUDE.md):

1. Check which optional files actually exist by running: `ls .goodplan/brainstorm/ .goodplan/research/ .goodplan/prototypes/ .goodplan/learnings/ .goodplan/sequencing.md 2>/dev/null`. Also check epic-level files if applicable: `ls $EPIC_DIR/research/ $EPIC_DIR/brainstorm/ 2>/dev/null`. Note: `sequencing.md` is written by later skills -- only reference it if it already exists. The `learnings/` directory is written by the CLI during slice/quest completion -- only reference it if it already exists and contains files. For first epic, add references to the epic architecture directory. For subsequent epics, note that the architecture is a proposal pending approval.

2. For "Also check" entries, only include directories that exist AND contain files (not empty directories).

3. Build the Project Context section content, including only entries for files that exist. For each architecture file written in Step 8, add a reference line under the "Read these before doing any significant work" block with a brief description (e.g., `- .goodplan/architecture/data-model.md -- entities, relationships, storage`). Only include files that actually exist.

4. Use the Read tool to read CLAUDE.md (to avoid overwriting unrelated content).

5. Update CLAUDE.md based on what exists:
   - **No CLAUDE.md**: create it using the Write tool with the Project Context section as the only content.
   - **CLAUDE.md exists but has no `## Project Context` section**: use the Edit tool to append the section at the end. Ensure there is a blank line before the new section header.
   - **CLAUDE.md exists with a `## Project Context` section**: Read CLAUDE.md fully. Extract the exact text from `## Project Context` through (but not including) the next `## ` heading. The old_string MUST include the `## Project Context` heading line itself for unique matching, and must preserve trailing whitespace/newlines exactly as they appear in the file. If no subsequent `## ` heading exists, use the text from `## Project Context` through end of file as old_string. Replace with the new section content using the Edit tool. If the Edit tool fails to match (e.g., due to trailing whitespace differences), fall back: read the full file, construct the replacement, and rewrite the entire CLAUDE.md with the Write tool.

6. After updating, tell the user: "Updated CLAUDE.md so future sessions and sub-agents will automatically load your architecture files."

## Step 9b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 10 — Complete Architecture Phase

### For epic scope

**CRITICAL — Do this BEFORE the Done Summary.** Complete the architecture phase via CLI (no stdin required — content is already on disk):

```bash
stdin: "" | gp submit-architecture --epic <name> --json
```

This transitions the epic from `defining-architecture` to `architecture-defined` and records the activity. The CLI handles all state management. If this step is skipped, the epic will be stuck in `defining-architecture` and downstream skills cannot proceed.

### For non-epic scope

When no active epic exists (project-level architecture), there is no CLI phase transition. The architecture files written to `.goodplan/architecture/` serve as the completion record.

## Step 11 — Done Summary

Display using the Done Summary Template (Variant B — Loose Checklist) from `../_shared/references/output-templates.md`. Include:

- All files written (conventions.md and each architecture file)
- All decisions written during this run (if any) — list each decision file path and title
- CLAUDE.md update confirmation
- Recommend `/create-slices` as the next step

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with the remaining files.
